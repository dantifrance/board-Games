const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1GVwiEQIg2snbVJqzNBBG1VmXhJdWnANgXRDF21ekDvU/export?format=csv&gid=330320146";

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let OWNED=[], ROWS=[];

function parseCSV(text){
 const rows=[]; let row=[],cell='',q=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(c=='"'){if(q&&text[i+1]=='"'){cell+='"';i++}else q=!q}
  else if(c==','&&!q){row.push(cell);cell=''}
  else if((c=='\n'||c=='\r')&&!q){if(c=='\r'&&text[i+1]=='\n')i++;row.push(cell);cell='';if(row.some(x=>x!==''))rows.push(row);row=[]}
  else cell+=c;
 }
 row.push(cell);if(row.some(x=>x!==''))rows.push(row);
 const h=rows.shift()||[];
 return rows.map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]||''])));
}
const split=s=>(s||'').split(';').map(x=>x.trim()).filter(Boolean);

function gameCard(g){
 const img=g.cover||'';
 const type=g.type==='expansion'?' · Espansione':g.type==='standalone'?' · Stand-alone':'';
 const unit=g.name==='Bomb Busters'?'missioni':'partite';
 return `<button class="card game" data-game="${g.name.replaceAll('"','&quot;')}">
   <div class="cover" style="${img?`background-image:url("${img}")`:''}">${img?'':'🎲'}</div>
   <div class="txt"><b>${g.name}</b><div class="muted">${g.plays||0} ${unit}${type}</div></div>
 </button>`;
}

function calc(rows){
 const players={}, counts={};
 rows.forEach(r=>{
   const g=r['Gioco']; if(g) counts[g]=(counts[g]||0)+1;
   split(r['Giocatori']).forEach(n=>{players[n]??={name:n,plays:0,wins:0};players[n].plays++});
   split(r['Vincitore/i']).forEach(n=>{players[n]??={name:n,plays:0,wins:0};players[n].wins++});
 });
 return {players:Object.values(players).sort((a,b)=>b.wins-a.wins||b.plays-a.plays),counts};
}
function render(rows){
 ROWS=rows;
 const {players,counts}=calc(rows);
 const games=OWNED.map(x=>({...x,plays:counts[x.name]||0}));
 const played=[...games].filter(x=>x.plays).sort((a,b)=>b.plays-a.plays);
 $('#total').textContent=`${rows.length} partite`;
 $('#metrics').innerHTML=`<div class="card metric"><span class="muted">Partite</span><b>${rows.length}</b></div>
 <div class="card metric"><span class="muted">Collezione</span><b>${OWNED.filter(x=>x.type!=='expansion').length}</b></div>
 <div class="card metric"><span class="muted">Giochi giocati</span><b>${played.length}</b></div>
 <div class="card metric"><span class="muted">Giocatori</span><b>${players.length}</b></div>`;
 $('#ranking').innerHTML=players.length?players.map((p,i)=>`<div class="row"><b>${i+1}.</b><div class="grow"><b>${p.name}</b><div class="muted">${p.plays} giocate · ${p.wins} vittorie</div></div><span class="badge">${p.plays?(p.wins/p.plays*100).toFixed(0):0}%</span></div>`).join(''):'<div class="muted">Collega Google Sheet per la classifica live.</div>';
 $('#topgames').innerHTML=played.slice(0,4).map(gameCard).join('') || games.slice(0,4).map(gameCard).join('');
 $('#allgames').innerHTML=games.map(gameCard).join('');
 $('#playerlist').innerHTML=players.length?players.map(p=>`<div class="row"><div class="grow"><b>${p.name}</b><div class="muted">${p.plays} giocate</div></div><b>${p.wins} 🏆</b></div>`).join(''):'<div class="muted">In attesa dei dati live.</div>';
 $('#historylist').innerHTML=rows.length?[...rows].reverse().slice(0,60).map(r=>`<div class="row"><div class="grow"><b>${r['Gioco']||''}</b><div class="muted">${r['Data']||''}</div></div><b>${r['Vincitore/i']||''}</b></div>`).join(''):'<div class="muted">In attesa dei dati live.</div>';
}
async function load(){
 OWNED=await fetch('./collection.json?v=3',{cache:'no-store'}).then(r=>r.json());
 let rows=[];
 if(typeof SHEET_CSV_URL==='string'&&SHEET_CSV_URL){
   try{
     const resp=await fetch(SHEET_CSV_URL,{cache:'no-store'});
     if(!resp.ok) throw new Error('HTTP '+resp.status);
     const text=await resp.text();
     rows=parseCSV(text);
     if(!rows.length || !Object.prototype.hasOwnProperty.call(rows[0],'Gioco')) throw new Error('CSV non valido');
     $('#status').textContent='DATI LIVE · build v3.2';
   } catch(e){
     $('#status').textContent='ERRORE GOOGLE SHEET · build v3.2';
   }
 } else $('#status').textContent='CONFIG INTERNA · build v3.2';
 // local fallback only to preserve current play counts until sheet goes live
 if(!rows.length && !(typeof SHEET_CSV_URL==='string'&&SHEET_CSV_URL)){
   const s=await fetch('./data.json?v=31',{cache:'no-store'}).then(r=>r.json());
   (s.games||[]).forEach(g=>{for(let i=0;i<g.plays;i++) rows.push({'Gioco':g.name,'Giocatori':'','Vincitore/i':'','Data':''})});
 }
 render(rows);
}
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.toggle('active',x===b));['home','games','players','history','detail'].forEach(v=>$('#'+v).classList.toggle('hidden',v!==b.dataset.v))});
document.addEventListener('click',e=>{const b=e.target.closest('[data-game]');if(!b)return;const g=OWNED.find(x=>x.name===b.dataset.game);$('#detailbody').innerHTML=`<div class="card"><h2>${b.dataset.game}</h2><p class="muted">${g?.type==='expansion'?'Espansione':'Gioco'} · pagina dettaglio build v3.2</p></div>`;['home','games','players','history'].forEach(v=>$('#'+v).classList.add('hidden'));$('#detail').classList.remove('hidden')});
$('#back').onclick=()=>{$('#detail').classList.add('hidden');$('#games').classList.remove('hidden')};
load();

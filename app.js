
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const coverFiles=["cover-1.jpg", "cover-2.jpg", "cover-3.jpg", "cover-4.jpg", "cover-5.jpg", "cover-6.jpg", "cover-7.jpg", "cover-8.jpg", "cover-9.jpg", "cover-10.jpg", "cover-11.jpg", "cover-12.jpg", "cover-13.jpg", "cover-14.jpg", "cover-15.jpg", "cover-16.jpg", "cover-17.jpg", "cover-18.jpg", "cover-19.jpg", "cover-20.jpg", "cover-21.jpg", "cover-22.jpg", "cover-23.jpg", "cover-24.jpg", "cover-25.jpg", "cover-26.jpg", "cover-27.jpg", "cover-28.jpg", "cover-29.jpg", "cover-30.jpg", "cover-31.jpg", "cover-32.jpg", "cover-33.jpg", "cover-34.jpg", "cover-35.jpg", "cover-36.jpg", "cover-37.jpg", "cover-38.jpg", "cover-39.jpg", "cover-40.jpg", "cover-41.jpg", "cover-42.jpg", "cover-43.jpg", "cover-44.jpg", "cover-45.jpg", "cover-46.jpg", "cover-47.jpg", "cover-48.jpg", "cover-49.jpg", "cover-50.jpg", "cover-51.jpg", "cover-52.jpg", "cover-53.jpg", "cover-54.jpg", "cover-55.jpg", "cover-56.jpg", "cover-57.jpg", "cover-58.jpg", "cover-59.jpg", "cover-60.jpg", "cover-61.jpg", "cover-62.jpg", "cover-63.jpg", "cover-64.jpg", "cover-65.jpg", "cover-66.jpg", "cover-67.jpg", "cover-68.jpg", "cover-69.jpg", "cover-70.jpg", "cover-71.jpg", "cover-72.jpg", "cover-73.jpg", "cover-74.jpg", "cover-75.jpg", "cover-76.jpg", "cover-77.jpg", "cover-78.jpg", "cover-79.jpg", "cover-80.jpg"];
const coverMap={}; // copertine locali estratte dalla vecchia dashboard; assegnazione automatica per indice.

function parseCSV(text){
 const rows=[]; let row=[], cell='', q=false;
 for(let i=0;i<text.length;i++){let c=text[i];
  if(c=='"'){if(q&&text[i+1]=='"'){cell+='"';i++}else q=!q}
  else if(c==','&&!q){row.push(cell);cell=''}
  else if((c=='\n'||c=='\r')&&!q){if(c=='\r'&&text[i+1]=='\n')i++;row.push(cell);cell='';if(row.some(x=>x!==''))rows.push(row);row=[]}
  else cell+=c;
 } row.push(cell); if(row.some(x=>x!==''))rows.push(row);
 const h=rows.shift()||[]; return rows.map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]||''])));
}
function split(s){return (s||'').split(';').map(x=>x.trim()).filter(Boolean)}
function stats(rows){
 const players={}, games={};
 rows.forEach(r=>{
  let g=r['Gioco']; if(!g)return;
  games[g]??={name:g,plays:0,rows:[]}; games[g].plays++; games[g].rows.push(r);
  split(r['Giocatori']).forEach(n=>{players[n]??={name:n,plays:0,wins:0};players[n].plays++});
  split(r['Vincitore/i']).forEach(n=>{players[n]??={name:n,plays:0,wins:0};players[n].wins++});
 });
 return {players:Object.values(players),games:Object.values(games)};
}
async function getCollection(){return fetch('collection.json').then(r=>r.json())}
async function load(){ const owned=await getCollection(); window.OWNED=owned; owned.forEach(x=>{if(x.cover)coverMap[x.name]=x.cover});
 let rows=[], live=false;
 if(typeof SHEET_CSV_URL==='string'&&SHEET_CSV_URL){
  try{const t=await fetch(SHEET_CSV_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.text()});rows=parseCSV(t);live=true}catch(e){}
 }
 if(!rows.length){
  const snap=await fetch('data.json').then(r=>r.json());
  // fallback cards only until Google Sheet is published
  snap.games.forEach((g,i)=>coverMap[g.name]=coverFiles[i]||'');
  snap.games.forEach(g=>{const o=owned.find(x=>x.name===g.name); if(o&&o.cover)coverMap[g.name]=o.cover});
renderSnapshot({...snap,owned}); $('#status').textContent='Modalità locale · collega Google Sheet per dati live'; return;
 }
 renderRows(rows,live);
}
function gameCard(g,i){
 const img=coverMap[g.name]||'';
 const kind=g.type==='expansion'?' · Espansione':g.type==='standalone'?' · Stand-alone':'';
 return `<button class="card game" data-game="${g.name.replaceAll('"','&quot;')}"><div class="cover" style="${img?`background-image:url('${img}')`:''}">${img?'':'🎲'}</div><div class="txt"><b>${g.name}</b><div class="muted">${g.plays} ${g.name==='Bomb Busters'?'missioni':'partite'}${kind}</div></div></button>`;
}
function renderSnapshot(s){
 $('#total').textContent='—'; $('#metrics').innerHTML=`<div class="card metric"><span class="muted">Bomb Busters</span><b>9</b></div><div class="card metric"><span class="muted">Giochi</span><b>${s.games.length}</b></div>`;
 $('#ranking').innerHTML='<div class="muted">Le statistiche giocatori appariranno appena colleghiamo il foglio live.</div>';
 $('#topgames').innerHTML=s.games.slice(0,4).map(gameCard).join('');
 const counts=Object.fromEntries(s.games.map(g=>[g.name,g.plays]));
 const owned=(s.owned||window.OWNED||[]).map(x=>({name:x.name,plays:counts[x.name]||0,type:x.type}));
 $('#allgames').innerHTML=owned.map(gameCard).join('');
 $('#playerlist').innerHTML='<div class="muted">In attesa dei dati live.</div>'; $('#historylist').innerHTML='<div class="muted">In attesa dei dati live.</div>';
}
function renderRows(rows,live){
 const st=stats(rows); st.games.sort((a,b)=>b.plays-a.plays); st.players.sort((a,b)=>b.wins-a.wins||b.plays-a.plays);
 
 $('#status').textContent=live?'Dati live dal registro Google Sheets':'Dati locali';
 $('#total').textContent=`${rows.length} partite`;
 $('#metrics').innerHTML=`<div class="card metric"><span class="muted">Partite</span><b>${rows.length}</b></div><div class="card metric"><span class="muted">Giochi giocati</span><b>${st.games.length}</b></div><div class="card metric"><span class="muted">Giocatori</span><b>${st.players.length}</b></div><div class="card metric"><span class="muted">Bomb Busters</span><b>${st.games.find(g=>g.name==='Bomb Busters')?.plays||0}</b></div>`;
 $('#ranking').innerHTML=st.players.map((p,i)=>`<div class="row"><b>${i+1}.</b><div class="grow"><b>${p.name}</b><div class="muted">${p.plays} giocate · ${p.wins} vittorie</div></div><span class="badge">${p.plays?(p.wins/p.plays*100).toFixed(1):0}%</span></div>`).join('');
 $('#topgames').innerHTML=st.games.slice(0,4).map(gameCard).join('');
 const countMap=Object.fromEntries(st.games.map(g=>[g.name,g.plays]));
 const owned=(window.OWNED||[]).map(x=>({name:x.name,plays:countMap[x.name]||0,type:x.type}));
 $('#allgames').innerHTML=owned.map(gameCard).join('');
 $('#playerlist').innerHTML=st.players.map(p=>`<div class="row"><div class="grow"><b>${p.name}</b><div class="muted">${p.plays} giocate</div></div><b>${p.wins} 🏆</b></div>`).join('');
 $('#historylist').innerHTML=[...rows].reverse().slice(0,50).map(r=>`<div class="row"><div class="grow"><b>${r['Gioco']}</b><div class="muted">${r['Data']} ${r['Espansione / Variante']?`· ${r['Espansione / Variante']}`:''}</div></div><div><b>${r['Vincitore/i']}</b><div class="muted">${r['Punteggi']||r['Tipo vittoria']||''}</div></div></div>`).join('');
}
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.toggle('active',x===b));['home','games','players','history','detail'].forEach(v=>$('#'+v).classList.toggle('hidden',v!==b.dataset.v))});
document.addEventListener('click',e=>{let b=e.target.closest('[data-game]');if(!b)return;$('#detailbody').innerHTML=`<div class="card"><h2>${b.dataset.game}</h2><p class="muted">Pagina gioco pronta per storico, grafici, vincitori e punteggi.</p></div>`;['home','games','players','history'].forEach(v=>$('#'+v).classList.add('hidden'));$('#detail').classList.remove('hidden')});
$('#back').onclick=()=>{$('#detail').classList.add('hidden');$('#games').classList.remove('hidden')};
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js');
load();

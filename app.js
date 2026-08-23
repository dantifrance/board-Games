const SHEET_ID = "1GVwiEQIg2snbVJqzNBBG1VmXhJdWnANgXRDF21ekDvU";
const MATCHES_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=330320146`;
const GAMES_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("Giochi")}`;
const WISHLIST_API_URL = "https://script.google.com/macros/s/AKfycbx79KFdhvU9lgVLxDoK_Nyb1ElxxDhMPI1x1pOnHPN-E9LLL8j2FNbU5IUq2KDOscN0/exec";
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

let games = [];
let matches = [];
let collectionFallback = [];

function parseCsv(text) {
  const table = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(Boolean)) table.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some(Boolean)) table.push(row);
  const headers = table.shift() || [];
  return table.map(values => Object.fromEntries(headers.map((header, i) => [header.trim(), values[i] || ""])));
}

const split = value => (value || "").split(";").map(item => item.trim()).filter(Boolean);
const isYes = value => /^(s[iì]|si|yes|true|1)$/i.test((value || "").trim());
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));

function normalizeGames(rows) {
  const fallbackByName = new Map(collectionFallback.map(game => [game.name, game]));
  const normalized = rows.filter(row => row.Gioco).map(row => {
    const fallback = fallbackByName.get(row.Gioco) || {};
    return {
      name: row.Gioco,
      type: (row.Tipo || fallback.type || "base").toLowerCase(),
      owned: isYes(row.Posseduto),
      owner: row["Proprietario / Origine"] || "",
      wishlist: isYes(row.Wishlist),
      cover: row.Copertina || fallback.cover || ""
    };
  });
  const known = new Set(normalized.map(game => game.name));
  for (const fallback of collectionFallback) {
    if (!known.has(fallback.name)) normalized.push({...fallback, owned: true, owner: "Francesco", wishlist: false});
  }
  return normalized;
}

function gameCard(game) {
  const cover = game.cover || "";
  const unit = game.name === "Bomb Busters" ? "missioni" : "partite";
  const type = game.type === "expansion" ? " · Espansione" : game.type === "standalone" ? " · Stand-alone" : "";
  const ownershipLabel = game.owned ? "In collezione" : (game.owner ? `Di ${game.owner}` : "Non posseduto");
  const ownershipIcon = game.owned ? "🏠" : "👤";
  const heart = game.wishlist ? "♥" : "♡";
  const heartLabel = game.wishlist ? "Rimuovi dalla wishlist" : "Aggiungi alla wishlist";
  return `<article class="card game" data-game="${escapeHtml(game.name)}">
    <button class="game-open" data-open-game="${escapeHtml(game.name)}" aria-label="Apri ${escapeHtml(game.name)}">
      <div class="cover">${cover ? `<img src="${escapeHtml(cover)}" alt="Copertina di ${escapeHtml(game.name)}" loading="lazy" onerror="this.remove();this.parentElement.classList.add('missing');this.parentElement.textContent='🎲'">` : "🎲"}</div>
      <div class="txt"><b>${escapeHtml(game.name)}</b><div class="muted">${game.plays || 0} ${unit}${type}</div></div>
    </button>
    <div class="game-actions"><span class="ownership" title="${escapeHtml(ownershipLabel)}"><span aria-hidden="true">${ownershipIcon}</span> ${escapeHtml(ownershipLabel)}</span>
      ${game.owned ? "" : `<button class="heart ${game.wishlist ? "active" : ""}" data-wishlist="${escapeHtml(game.name)}" aria-pressed="${game.wishlist}" aria-label="${heartLabel}">${heart}</button>`}
    </div>
  </article>`;
}

function render() {
  const people = {}, playCount = {};
  for (const row of matches) {
    const gameName = row.Gioco;
    if (gameName) playCount[gameName] = (playCount[gameName] || 0) + 1;
    for (const name of split(row.Giocatori)) { people[name] ??= {name, plays: 0, wins: 0}; people[name].plays++; }
    for (const name of split(row["Vincitore/i"])) { people[name] ??= {name, plays: 0, wins: 0}; people[name].wins++; }
  }
  const players = Object.values(people).sort((a,b) => b.wins - a.wins || b.plays - a.plays);
  games = games.map(game => ({...game, plays: playCount[game.name] || 0}));
  const played = games.filter(game => game.plays).sort((a,b) => b.plays - a.plays);
  const wishlist = games.filter(game => game.wishlist && !game.owned);
  $("#total").textContent = `${matches.length} partite`;
  $("#metrics").innerHTML = `<div class="card metric"><span class="muted">Partite</span><b>${matches.length}</b></div><div class="card metric"><span class="muted">Collezione</span><b>${games.filter(game => game.owned && game.type !== "expansion").length}</b></div><div class="card metric"><span class="muted">Wishlist</span><b>${wishlist.length}</b></div><div class="card metric"><span class="muted">Giocatori</span><b>${players.length}</b></div>`;
  $("#ranking").innerHTML = players.map((player, i) => `<div class="row"><b>${i+1}.</b><div class="grow"><b>${escapeHtml(player.name)}</b><div class="muted">${player.plays} giocate · ${player.wins} vittorie</div></div><span class="badge">${player.plays ? (player.wins/player.plays*100).toFixed(0) : 0}%</span></div>`).join("");
  $("#topgames").innerHTML = (played.length ? played : games).slice(0,4).map(gameCard).join("");
  $("#allgames").innerHTML = games.map(gameCard).join("");
  $("#wishlistgames").innerHTML = wishlist.length ? wishlist.map(gameCard).join("") : `<div class="card empty">Tocca ♡ su un gioco non posseduto per aggiungerlo qui.</div>`;
  $("#playerlist").innerHTML = players.map(player => `<div class="row"><div class="grow"><b>${escapeHtml(player.name)}</b><div class="muted">${player.plays} giocate</div></div><b>${player.wins} 🏆</b></div>`).join("");
  $("#historylist").innerHTML = [...matches].reverse().slice(0,60).map(row => `<div class="row"><div class="grow"><b>${escapeHtml(row.Gioco || "")}</b><div class="muted">${escapeHtml(row.Data || "")}</div></div><b>${escapeHtml(row["Vincitore/i"] || "")}</b></div>`).join("");
}

async function toggleWishlist(button) {
  const game = games.find(item => item.name === button.dataset.wishlist);
  if (!game || game.owned || button.disabled) return;
  const previous = game.wishlist;
  game.wishlist = !previous;
  render();
  const currentButton = document.querySelector(`[data-wishlist="${CSS.escape(game.name)}"]`);
  if (currentButton) currentButton.disabled = true;
  $("#syncnote").textContent = "Salvataggio wishlist…";
  try {
    await fetch(WISHLIST_API_URL, {
      method: "POST", mode: "no-cors", cache: "no-store",
      headers: {"Content-Type": "text/plain;charset=utf-8"},
      body: JSON.stringify({action: "toggleWishlist", game: game.name, value: game.wishlist})
    });
    $("#syncnote").textContent = "Wishlist sincronizzata ✓";
  } catch (error) {
    game.wishlist = previous;
    render();
    $("#syncnote").textContent = "Salvataggio non riuscito. Riprova.";
  }
}

async function start() {
  try {
    const [fallback, matchResponse, gameResponse] = await Promise.all([
      fetch("./collection.json?v=35", {cache:"no-store"}).then(r => r.ok ? r.json() : []),
      fetch(MATCHES_CSV_URL, {cache:"no-store"}),
      fetch(GAMES_CSV_URL, {cache:"no-store"})
    ]);
    if (!matchResponse.ok || !gameResponse.ok) throw Error("sheet");
    collectionFallback = fallback;
    matches = parseCsv(await matchResponse.text());
    const gameRows = parseCsv(await gameResponse.text());
    if (!matches.length || !("Gioco" in matches[0]) || !gameRows.some(row => row.Gioco)) throw Error("csv");
    games = normalizeGames(gameRows);
    $("#status").textContent = "DATI LIVE · build v3.5";
    render();
  } catch (error) {
    console.error(error);
    $("#status").textContent = "ERRORE DATI · build v3.5";
    $("#total").textContent = "Errore";
  }
}

$$('.tab').forEach(button => button.onclick = () => {
  $$('.tab').forEach(tab => tab.classList.toggle('active', tab === button));
  ['home','games','wishlist','players','history','detail'].forEach(view => $(`#${view}`).classList.toggle('hidden', view !== button.dataset.v));
});
document.addEventListener('click', event => {
  const heart = event.target.closest('[data-wishlist]');
  if (heart) { event.stopPropagation(); toggleWishlist(heart); return; }
  const open = event.target.closest('[data-open-game]');
  if (!open) return;
  const game = games.find(item => item.name === open.dataset.openGame);
  if (!game) return;
  $("#detailbody").innerHTML = `<div class="card"><h2>${escapeHtml(game.name)}</h2><p class="muted">${game.owned ? "🏠 In collezione" : `👤 ${escapeHtml(game.owner || "Non posseduto")}`}${game.wishlist ? " · ♥ Wishlist" : ""}</p></div>`;
  ['home','games','wishlist','players','history'].forEach(view => $(`#${view}`).classList.add('hidden'));
  $('#detail').classList.remove('hidden');
});
$('#back').onclick = () => { $('#detail').classList.add('hidden'); $('#games').classList.remove('hidden'); };
start();

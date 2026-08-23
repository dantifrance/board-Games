const SHEET_ID = "1GVwiEQIg2snbVJqzNBBG1VmXhJdWnANgXRDF21ekDvU";
const MATCHES_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=330320146`;
const GAMES_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent("Giochi")}`;
const WISHLIST_API_URL = "https://script.google.com/macros/s/AKfycbx79KFdhvU9lgVLxDoK_Nyb1ElxxDhMPI1x1pOnHPN-E9LLL8j2FNbU5IUq2KDOscN0/exec";
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

let games = [];
let matches = [];
let collectionFallback = [];
const filters = {mode: "", complexity: "", category: ""};
let returnView = "games";

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
const winnerNames = row => split(row["Vincitore/i"]);
const formatDate = value => value ? new Intl.DateTimeFormat("it-IT", {day:"numeric", month:"short", year:"numeric"}).format(new Date(`${value}T12:00:00`)) : "—";

function showDetail(html, fromView) {
  returnView = fromView || "games";
  ['home','games','wishlist','players','history'].forEach(view => $(`#${view}`).classList.add('hidden'));
  $('#detailbody').innerHTML = html;
  $('#detail').classList.remove('hidden');
  window.scrollTo({top:0, behavior:"smooth"});
}

function bars(items, total, suffix = "") {
  if (!items.length) return `<p class="muted">Non ci sono ancora dati sufficienti.</p>`;
  const max = Math.max(...items.map(item => item.value), 1);
  return `<div class="chart">${items.map(item => `<div class="chartrow"><div class="chartlabel"><span>${escapeHtml(item.label)}</span><b>${item.value}${suffix}</b></div><div class="track"><span style="width:${item.value / max * 100}%"></span></div>${total ? `<small class="muted">${Math.round(item.value / total * 100)}%</small>` : ""}</div>`).join("")}</div>`;
}

function matchRows(rows) {
  return rows.length ? rows.map(row => `<div class="row historyrow"><div class="grow"><b>${escapeHtml(row.Gioco || "")}</b><div class="muted">${formatDate(row.Data)} · ${escapeHtml(row.Giocatori || "")}</div></div><div class="result">${winnerNames(row).length ? `🏆 ${escapeHtml(row["Vincitore/i"])}` : "—"}${row.Punteggi ? `<small>${escapeHtml(row.Punteggi)}</small>` : ""}</div></div>`).join("") : `<p class="muted">Nessuna partita registrata.</p>`;
}

function openGameDetail(game, fromView = "games") {
  const rows = matches.filter(row => row.Gioco === game.name);
  const wins = {};
  rows.forEach(row => winnerNames(row).forEach(name => wins[name] = (wins[name] || 0) + 1));
  const leaders = Object.entries(wins).sort((a,b) => b[1] - a[1]);
  const topWins = leaders[0]?.[1] || 0;
  const leaderText = leaders.filter(([,count]) => count === topWins).map(([name]) => name).join(", ") || "—";
  const last = rows.at(-1);
  const bgg = game.bggId ? `<a class="bgglink" href="https://boardgamegeek.com/boardgame/${game.bggId}" target="_blank" rel="noopener">Apri ${escapeHtml(game.bggTitle)} su BoardGameGeek ↗</a><small class="bggdate">Dati BGG aggiornati il ${formatDate(game.bggUpdated)}</small>` : `<span class="muted">Scheda BGG da verificare</span>`;
  showDetail(`<section class="detailhero card">${game.cover ? `<img src="${escapeHtml(game.cover)}" alt="Copertina di ${escapeHtml(game.name)}">` : ""}<div><p class="eyebrow">${escapeHtml(game.mode)} · ${escapeHtml(game.complexity)}</p><h2>${escapeHtml(game.name)}</h2><p class="muted">${escapeHtml(game.category)} · ${game.owned ? "🏠 In collezione" : "👤 Non posseduto"}</p>${bgg}</div></section><div class="detailmetrics"><div class="card metric"><span class="muted">Partite</span><b>${rows.length}</b></div><div class="card metric"><span class="muted">Leader vittorie</span><b class="metricname">${escapeHtml(leaderText)}</b></div><div class="card metric"><span class="muted">Ultima partita</span><b class="metricname">${formatDate(last?.Data)}</b></div><div class="card metric"><span class="muted">Rank BGG</span><b>${game.bggRank ? `#${game.bggRank}` : game.bggId ? "N/C" : "—"}</b></div></div><section class="section"><h3>Vittorie per giocatore</h3><div class="card">${bars(leaders.map(([label,value]) => ({label,value})), rows.length)}</div></section><section class="section"><h3>Storico di ${escapeHtml(game.name)}</h3><div class="card">${matchRows([...rows].reverse())}</div></section>`, fromView);
}

function openPlayerDetail(name) {
  const rows = matches.filter(row => split(row.Giocatori).includes(name));
  const wonRows = rows.filter(row => winnerNames(row).includes(name));
  const gameCounts = {};
  rows.forEach(row => gameCounts[row.Gioco] = (gameCounts[row.Gioco] || 0) + 1);
  const favoriteGames = Object.entries(gameCounts).sort((a,b) => b[1] - a[1]);
  const last = rows.at(-1);
  showDetail(`<section class="detailhero playerhero card"><div class="avatar">${escapeHtml(name.charAt(0).toUpperCase())}</div><div><p class="eyebrow">Profilo giocatore</p><h2>${escapeHtml(name)}</h2><p class="muted">${favoriteGames.length} giochi diversi</p></div></section><div class="detailmetrics"><div class="card metric"><span class="muted">Partite</span><b>${rows.length}</b></div><div class="card metric"><span class="muted">Vittorie</span><b>${wonRows.length}</b></div><div class="card metric"><span class="muted">Percentuale vittorie</span><b>${rows.length ? Math.round(wonRows.length / rows.length * 100) : 0}%</b></div><div class="card metric"><span class="muted">Ultima partita</span><b class="metricname">${last ? escapeHtml(last.Gioco) : "—"}</b></div></div><section class="section"><h3>Giochi più giocati</h3><div class="card">${bars(favoriteGames.map(([label,value]) => ({label,value})), rows.length, "×")}</div></section><section class="section"><h3>Storico di ${escapeHtml(name)}</h3><div class="card">${matchRows([...rows].reverse())}</div></section>`, "players");
}

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
      cover: row.Copertina || fallback.cover || "",
      mode: row.Modalità || fallback.mode || "Competitivo",
      complexity: row.Complessità || fallback.complexity || "Light",
      category: row.Categoria || fallback.category || "",
      bggTitle: row["Titolo originale BGG"] || fallback.bggTitle || row.Gioco,
      bggId: Number(row["BGG ID"] || fallback.bggId) || null,
      bggRank: Number(row["BGG Overall Rank"] || fallback.bggRank) || null,
      bggWeight: Number(String(row["Peso BGG"] || fallback.bggWeight || "").replace(",", ".")) || null,
      bggUpdated: row["Aggiornamento BGG"] || fallback.bggUpdated || "",
      bggStatus: row["Stato BGG"] || fallback.bggStatus || "Da verificare"
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
  const bggBadge = game.bggId ? `<a class="bgg ${game.bggRank ? "" : "unranked"}" href="https://boardgamegeek.com/boardgame/${game.bggId}" target="_blank" rel="noopener" aria-label="Apri ${escapeHtml(game.bggTitle)} su BoardGameGeek">${game.bggRank ? `BGG #${game.bggRank}` : "BGG N/C"}</a>` : `<span class="bgg pending">BGG da verificare</span>`;
  return `<article class="card game" data-game="${escapeHtml(game.name)}">
    <button class="game-open" data-open-game="${escapeHtml(game.name)}" aria-label="Apri ${escapeHtml(game.name)}">
      <div class="cover">${cover ? `<img src="${escapeHtml(cover)}" alt="Copertina di ${escapeHtml(game.name)}" loading="lazy" onerror="this.remove();this.parentElement.classList.add('missing');this.parentElement.textContent='🎲'">` : "🎲"}</div>
      <div class="txt"><div class="titleline"><b>${escapeHtml(game.name)}</b>${bggBadge}</div><div class="muted">${game.plays || 0} ${unit}${type}</div><div class="tags"><span>${escapeHtml(game.mode)}</span><span>${escapeHtml(game.complexity)}</span><span>${escapeHtml(game.category)}</span></div></div>
    </button>
    <div class="game-actions"><span class="ownership" title="${escapeHtml(ownershipLabel)}"><span aria-hidden="true">${ownershipIcon}</span> ${escapeHtml(ownershipLabel)}</span>
      ${game.owned ? "" : `<button class="heart ${game.wishlist ? "active" : ""}" data-wishlist="${escapeHtml(game.name)}" aria-pressed="${game.wishlist}" aria-label="${heartLabel}">${heart}</button>`}
    </div>
  </article>`;
}

function render() {
  const shownNames = new Set(games.filter(game => (!filters.mode || game.mode === filters.mode) && (!filters.complexity || game.complexity === filters.complexity) && (!filters.category || game.category === filters.category)).map(game => game.name));
  const filtering = Object.values(filters).some(Boolean);
  const shownMatches = filtering ? matches.filter(row => shownNames.has(row.Gioco)) : matches;
  const people = {}, playCount = {};
  for (const row of shownMatches) {
    const gameName = row.Gioco;
    if (gameName) playCount[gameName] = (playCount[gameName] || 0) + 1;
    for (const name of split(row.Giocatori)) { people[name] ??= {name, plays: 0, wins: 0}; people[name].plays++; }
    for (const name of split(row["Vincitore/i"])) { people[name] ??= {name, plays: 0, wins: 0}; people[name].wins++; }
  }
  const players = Object.values(people).sort((a,b) => b.wins - a.wins || b.plays - a.plays);
  games = games.map(game => ({...game, plays: playCount[game.name] || 0}));
  const shownGames = games.filter(game => shownNames.has(game.name));
  const played = shownGames.filter(game => game.plays).sort((a,b) => b.plays - a.plays);
  const wishlist = shownGames.filter(game => game.wishlist && !game.owned);
  $("#total").textContent = `${shownMatches.length} partite`;
  $("#metrics").innerHTML = `<div class="card metric"><span class="muted">Partite</span><b>${shownMatches.length}</b></div><div class="card metric"><span class="muted">Collezione</span><b>${shownGames.filter(game => game.owned && game.type !== "expansion").length}</b></div><div class="card metric"><span class="muted">Wishlist</span><b>${wishlist.length}</b></div><div class="card metric"><span class="muted">Giocatori</span><b>${players.length}</b></div>`;
  $("#ranking").innerHTML = players.map((player, i) => `<button class="row playerlink" data-open-player="${escapeHtml(player.name)}"><b>${i+1}.</b><div class="grow"><b>${escapeHtml(player.name)}</b><div class="muted">${player.plays} giocate · ${player.wins} vittorie</div></div><span class="badge">${player.plays ? (player.wins/player.plays*100).toFixed(0) : 0}%</span><span>›</span></button>`).join("");
  $("#topgames").innerHTML = (played.length ? played : shownGames).slice(0,4).map(gameCard).join("");
  $("#allgames").innerHTML = shownGames.length ? shownGames.map(gameCard).join("") : `<div class="card empty">Nessun gioco corrisponde ai filtri scelti.</div>`;
  $("#wishlistgames").innerHTML = wishlist.length ? wishlist.map(gameCard).join("") : `<div class="card empty">Tocca ♡ su un gioco non posseduto per aggiungerlo qui.</div>`;
  $("#playerlist").innerHTML = players.map(player => `<button class="row playerlink" data-open-player="${escapeHtml(player.name)}"><div class="avatar small">${escapeHtml(player.name.charAt(0).toUpperCase())}</div><div class="grow"><b>${escapeHtml(player.name)}</b><div class="muted">${player.plays} giocate</div></div><b>${player.wins} 🏆</b><span>›</span></button>`).join("");
  $("#historylist").innerHTML = [...shownMatches].reverse().slice(0,60).map(row => `<div class="row"><div class="grow"><b>${escapeHtml(row.Gioco || "")}</b><div class="muted">${escapeHtml(row.Data || "")}</div></div><b>${escapeHtml(row["Vincitore/i"] || "")}</b></div>`).join("");
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
      fetch("./collection.json?v=38", {cache:"no-store"}).then(r => r.ok ? r.json() : []),
      fetch(MATCHES_CSV_URL, {cache:"no-store"}),
      fetch(GAMES_CSV_URL, {cache:"no-store"})
    ]);
    if (!matchResponse.ok || !gameResponse.ok) throw Error("sheet");
    collectionFallback = fallback;
    matches = parseCsv(await matchResponse.text());
    const gameRows = parseCsv(await gameResponse.text());
    if (!matches.length || !("Gioco" in matches[0]) || !gameRows.some(row => row.Gioco)) throw Error("csv");
    games = normalizeGames(gameRows);
    $("#status").textContent = "DATI LIVE · build v3.8";
    render();
  } catch (error) {
    console.error(error);
    $("#status").textContent = "ERRORE DATI · build v3.8";
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
  const player = event.target.closest('[data-open-player]');
  if (player) { openPlayerDetail(player.dataset.openPlayer); return; }
  const open = event.target.closest('[data-open-game]');
  if (!open) return;
  const game = games.find(item => item.name === open.dataset.openGame);
  if (!game) return;
  const visibleView = ['home','games','wishlist','players','history'].find(view => !$(`#${view}`).classList.contains('hidden')) || "games";
  openGameDetail(game, visibleView);
});
$('#back').onclick = () => { $('#detail').classList.add('hidden'); $(`#${returnView}`).classList.remove('hidden'); };
$$('[data-filter]').forEach(select => select.onchange = () => { filters[select.dataset.filter] = select.value; render(); });
$('#clearfilters').onclick = () => { Object.keys(filters).forEach(key => filters[key] = ""); $$('[data-filter]').forEach(select => select.value = ""); render(); };
start();

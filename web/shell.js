(() => {
"use strict";
const $ = (s) => document.querySelector(s);
const api = () => (window.pywebview && window.pywebview.api) || null;
const MODS = ["dzis", "mapa", "kontakty", "sesje", "minutniki", "zarobki", "pojazdy", "crafting", "rp", "ekipa", "ustawienia"];
const frames = Object.fromEntries(MODS.map((m) => [m, $("#f-" + m)]));
let current = "dzis";
let game = { running: false, session: null };

/* ---------- most: moduły (iframe) wołają Pythona przez postMessage ---------- */
window.addEventListener("message", async (e) => {
  const m = e.data;
  if (!m || typeof m !== "object") return;
  if (m.__api) {
    let result = null, error = null;
    try {
      const a = api();
      if (!a || typeof a[m.fn] !== "function") throw new Error("Brak funkcji " + m.fn);
      result = await a[m.fn](...(m.args || []));
    } catch (err) { error = String(err && err.message || err); }
    e.source.postMessage({ __apiRes: m.__api, result, error }, "*");
  }
  if (m.__nav) show(m.__nav, m.payload);
  if (m.__fullscreen) toggleFullscreen();
  if (m.__key) handleKey(m.__key);
  if (m.__look) broadcast({ __look: true });
  if (m.__reloadAll) location.reload();
  if (m.__toMap) frames.mapa.contentWindow?.postMessage({ __payload: m.__toMap }, "*");
  if (m.__toEkipa) frames.ekipa.contentWindow?.postMessage({ __payload: m.__toEkipa }, "*");
  if (m.__toTimers) frames.minutniki.contentWindow?.postMessage({ __payload: { add: m.__toTimers } }, "*");
  if (m.__reload) Object.entries(frames).forEach(([k, f]) => { if (f.src && (m.__reload === true || m.__reload === k)) f.contentWindow.location.reload(); });
});

function broadcast(msg) {
  Object.values(frames).forEach((f) => { try { f.contentWindow && f.contentWindow.postMessage(msg, "*"); } catch {} });
}

/* ---------- zakładki ---------- */
function moveGlider() {
  const on = document.querySelector(".tabs .tab.on[data-mod]");
  $(".tab-glider").style.opacity = on ? 1 : 0;
  if (!on) return;
  const g = $(".tab-glider");
  g.style.height = on.offsetHeight + "px";
  g.style.transform = `translateY(${on.offsetTop}px)`;
}
const NAMES = { dzis: "Dziś", mapa: "Mapa", kontakty: "Kontakty", sesje: "Statystyki gry", minutniki: "Minutniki", zarobki: "Zarobki", pojazdy: "Rynek", crafting: "Crafting", rp: "Postać i RP", ekipa: "Ekipa", ustawienia: "Ustawienia" };
function setCallsign(mod) {
  const pr = store.get("majestic-postacie-v1", null), pn = pr && pr.list.length > 1 && (pr.list.find((x) => x.id === pr.cur) || {}).name;
  $("#cs-code").textContent = pn ? pn.toUpperCase().slice(0, 14) : "MDT-" + String(MODS.indexOf(mod) + 1).padStart(2, "0");
  $("#cs-name").textContent = NAMES[mod] || mod;
}
const tickClock = () => { $("#clock").textContent = new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }); };
tickClock(); setInterval(tickClock, 15000);
function show(mod, payload) {
  if (!frames[mod]) return;
  const f = frames[mod];
  if (!f.src && f.dataset.src) f.src = f.dataset.src + "?embed=1";
  if (mod !== current) {
    frames[current].classList.remove("on");
    f.classList.add("on");
    current = mod;
    document.querySelectorAll(".tab[data-mod]").forEach((t) => t.classList.toggle("on", t.dataset.mod === mod));
    moveGlider();
    setCallsign(mod);
    setTimeout(() => f.contentWindow?.focus(), 60);
  }
  if (payload) setTimeout(() => f.contentWindow?.postMessage({ __payload: payload }, "*"), f.dataset.loaded ? 0 : 900);
}
Object.values(frames).forEach((f) => f.addEventListener("load", () => {
  f.dataset.loaded = "1";
  f.contentWindow.postMessage({ __game: game }, "*");
}));
document.querySelectorAll(".tab[data-mod]").forEach((t) => t.addEventListener("click", () => show(t.dataset.mod)));

function toggleFullscreen() { const a = api(); if (a) a.toggle_fullscreen(); }
$("#fs-btn").addEventListener("click", toggleFullscreen);
$("#w-min").addEventListener("click", () => api()?.win_min());
$("#w-max").addEventListener("click", () => api()?.win_max());
$("#w-close").addEventListener("click", () => api()?.win_close());
$("#topbar").addEventListener("dblclick", (e) => { if (!e.target.closest("button")) api()?.win_max(); });

function handleKey(k) {
  if (k === "F11") toggleFullscreen();
  const n = /^ctrl\+([0-9])$/.exec(k);
  if (n) show(MODS[(+n[1] || 10) - 1]);
  if (k === "ctrl+space") openSearch();
}
document.addEventListener("keydown", (e) => {
  if (e.key === "F11") { e.preventDefault(); handleKey("F11"); }
  if (e.ctrlKey && /^[0-9]$/.test(e.key)) { e.preventDefault(); handleKey("ctrl+" + e.key); }
  if (e.ctrlKey && e.code === "Space") { e.preventDefault(); handleKey("ctrl+space"); }
});

/* ---------- status gry ---------- */
const fmt = (ms) => {
  const m = Math.max(0, Math.floor(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}` : `${m} min`;
};
function renderGame() {
  const el = $("#game");
  el.classList.toggle("on", game.running);
  el.classList.toggle("off", !game.running);
  const s = game.session;
  // kody radiowe jak w dyspozytorni: 10-8 w służbie, 10-7 poza służbą
  el.querySelector(".g-code").textContent = game.running ? "10-8" : "10-7";
  el.querySelector(".g-label").textContent = game.running ? (s?.server || "W grze") : "Poza służbą";
  el.querySelector(".g-time").textContent = game.running && s ? fmt(Date.now() - (s.connected ? s.joined : s.start)) : "";
  el.title = game.running ? `Grasz${s ? " na serwerze " + s.server : ""}` : "Gra nie jest uruchomiona";
}
async function pollGame() {
  const a = api();
  if (a) {
    const was = game;
    try { game = await a.game_status(); } catch {}
    afterGame(was, game);
    broadcast({ __game: game });
  }
  renderGame();
}

/* ---------- po sesji, przerwa, przypomnienia z grafiku ---------- */
const prefs = () => { try { return { breakH: 2, ...JSON.parse(localStorage.getItem("majestic-wyglad-v1")) }; } catch { return { breakH: 2 }; } };
let breakNotified = null;
function afterGame(was, now) {
  const a = api(); if (!a) return;
  const s = now.session;
  // koniec sesji: zapytaj o zarobek, czas wpisze się sam
  if (was.running && !now.running && was.session && was.session.connected) {
    const min = Math.round((Date.now() - was.session.joined) / 60000);
    if (min >= 5) {
      a.notify("Koniec sesji: " + min + " min", "Ile zarobiłeś? Otwórz zakładkę Kasa, czas już jest wpisany.");
      show("zarobki", { sessionMin: min });
      sessionNote(min, was.session.server);
    }
  }
  // przypomnienie o przerwie raz na sesję
  const breakH = +prefs().breakH || 0;
  if (now.running && s && s.connected && breakH && breakNotified !== s.file && Date.now() - s.joined > breakH * 3600000) {
    breakNotified = s.file;
    a.notify("Grasz już " + breakH + " h", "Może krótka przerwa? Rozprostuj nogi i napij się wody.");
  }
}
// przypomnienia o wydarzeniach z zakładki Ekipa (sprawdzane co 30 s)
function checkEvents() {
  const a = api(); if (!a) return;
  let data; try { data = JSON.parse(localStorage.getItem("majestic-ekipa-v1")) || {}; } catch { return; }
  let changed = false;
  for (const ev of data.events || []) {
    const remindAt = ev.at - (ev.remind || 0) * 60000;
    if (!ev.notified && Date.now() >= remindAt && Date.now() < ev.at + 3600000) {
      ev.notified = true; changed = true;
      a.notify(ev.remind ? `Za ${ev.remind} min: ${ev.title}` : `Teraz: ${ev.title}`, new Date(ev.at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) + (ev.note ? " · " + ev.note : ""));
      a.discord_send(`🗓️ **${ev.remind ? `Za ${ev.remind} min` : "Teraz"}:** ${ev.title} (${new Date(ev.at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })})`, "dcEvents");
    }
  }
  if (changed) { localStorage.setItem("majestic-ekipa-v1", JSON.stringify(data)); frames.ekipa.dataset.loaded && frames.ekipa.contentWindow.postMessage({ __payload: { refresh: true } }, "*"); }
}

/* ---------- start ---------- */
async function boot() {
  if (window.chrome && window.chrome.webview) {
    await new Promise((r) => { if (window.pywebview?.api?.game_status) return r(); window.addEventListener("pywebviewready", r, { once: true }); setTimeout(r, 4000); });
  }
  frames.dzis.src = "dzis/index.html?embed=1";
  frames.mapa.src = "mapa/index.html?embed=1";
  frames.minutniki.src = "minutniki/index.html?embed=1";  // od startu: minutniki muszą liczyć w tle
  moveGlider();
  document.fonts?.ready.then(moveGlider);
  pollGame();
  setInterval(pollGame, 15000);
  setInterval(checkEvents, 30000); checkEvents();
  setInterval(renderGame, 30000);
  setTimeout(() => $("#intro").classList.add("out"), 1700);
  setTimeout(watchServer, 5000); setInterval(watchServer, 600000);
}

/* ---------- serwer na żywo: historia graczy + powiadomienia (przerwa, kolejka, newsy) ---------- */
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
let lastSrv = null;
async function watchServer() {
  const a = api(); if (!a) return;
  let live, st;
  try { [live, st] = await Promise.all([a.live(), a.get_settings()]); } catch { return; }
  const id = String(st?.server || "pl1").toLowerCase();
  const s = (live.servers || []).find((x) => x.id === id);
  if (s) {
    const hist = store.get("majestic-gracze-v1", []).filter((h) => h.t > Date.now() - 14 * 86400000);
    hist.push({ t: Date.now(), n: s.players, s: id });
    store.set("majestic-gracze-v1", hist);
    // ranking serwerów: wszystkie serwery co ok. 15 minut, 7 dni wstecz
    const all = store.get("majestic-serwery-hist-v1", []);
    if (!all.length || Date.now() - all[all.length - 1].t > 14 * 60000) {
      all.push({ t: Date.now(), p: Object.fromEntries((live.servers || []).filter((x) => x.status && !x.techWorks).map((x) => [x.id, x.players])) });
      store.set("majestic-serwery-hist-v1", all.filter((h) => h.t > Date.now() - 7 * 86400000));
    }
    if (lastSrv) {
      if (s.techWorks && !lastSrv.techWorks) { a.notify("Przerwa techniczna", `${s.name}: serwer ma przerwę techniczną.`); a.discord_send(`🛠️ **${s.name}**: serwer ma przerwę techniczną.`, "dcServer"); }
      if (!s.techWorks && lastSrv.techWorks) { a.notify("Serwer znowu działa", `${s.name} wrócił po przerwie technicznej.`); a.discord_send(`✅ **${s.name}** znowu działa (${s.players} graczy).`, "dcServer"); }
      if (lastSrv.queuedPlayers > 0 && !s.queuedPlayers) a.notify("Kolejka zniknęła", `${s.name}: możesz wchodzić bez czekania.`);
    }
    lastSrv = s;
  }
  const seen = store.get("majestic-newsy-v1", null), top = (live.news || [])[0];
  if (top && seen !== null && top.id !== seen) a.notify("Nowość na Majestic", top.title);
  if (top) store.set("majestic-newsy-v1", top.id);
}

/* ---------- wyszukiwarka w całej aplikacji (Ctrl+Space) ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");
let results = [], cursor = 0;
function collect() {
  const out = [];
  Object.entries(NAMES).forEach(([m, n]) => out.push({ kind: "Zakładka", text: n, go: () => show(m) }));
  (store.get("majestic-mapa-v1", {}).markers || []).forEach((m) => out.push({ kind: m.builtin ? "Mapa" : "Twój znacznik", text: m.name, sub: m.note || "", go: () => show("mapa", { select: m.id }) }));
  (store.get("majestic-kontakty-v1", {}).contacts || []).forEach((c) => out.push({ kind: "Kontakt", text: c.name, sub: [c.phone, c.faction].filter(Boolean).join(" · "), go: () => show("kontakty", { select: c.id }) }));
  store.get("majestic-notatki-v1", []).forEach((n) => out.push({ kind: "Notatka", text: n.t.split("\n")[0], sub: new Date(n.at).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), go: () => show("dzis") }));
  Object.entries(store.get("majestic-rp-v1", {})).forEach(([tab, list]) => (list || []).forEach((l) => {
    const line = (l.c === "say" ? "" : "/" + l.c + " ") + l.t;
    out.push({ kind: "Tekst RP · " + tab, text: line, sub: "Enter kopiuje do schowka", go: () => { copyText(line.replaceAll("{imię}", "osobie")); } });
  }));
  store.get("majestic-minutniki-v1", []).filter((t) => t.end > Date.now()).forEach((t) => out.push({ kind: "Minutnik", text: t.name, go: () => show("minutniki") }));
  if (wikiSearch) out.push(...wikiSearch);
  return out;
}
/* kalkulator: tylko cyfry, + - * / ( ), przecinek/kropka i k/m (tysiące, miliony) */
function calcExpr(s) {
  if (!/^[\d\s.,+\-*/()kKmM$]+$/.test(s) || !/\d/.test(s) || !/[+\-*/kKmM]/.test(s.replace(/^-/, ""))) return null;
  const e = s.replace(/\$|\s/g, "").replace(/,/g, ".").replace(/(\d+(?:\.\d+)?)[kK]/g, "($1*1e3)").replace(/(\d+(?:\.\d+)?)[mM]/g, "($1*1e6)");
  if (!/^[\d.+\-*/()e]+$/.test(e)) return null;
  try { const v = Function(`"use strict";return (${e})`)(); return Number.isFinite(v) ? v : null; } catch { return null; }
}
function copyText(t) {
  const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); } catch {}
  ta.remove();
}
function renderSearch() {
  const q = norm($("#s-q").value.trim());
  const all = collect();
  results = (q ? all.filter((r) => norm(r.text + " " + (r.sub || "")).includes(q)) : all.filter((r) => r.kind === "Zakładka")).slice(0, 40);
  const calc = calcExpr($("#s-q").value.trim());
  if (calc !== null) { const txt = Math.round(calc * 100) / 100, show = txt.toLocaleString("pl-PL"); results.unshift({ kind: "Wynik", text: "= " + show, sub: "Enter kopiuje do schowka", go: () => copyText(String(txt)) }); }
  cursor = Math.min(cursor, Math.max(0, results.length - 1));
  $("#s-res").innerHTML = results.map((r, i) => `<li role="option" aria-selected="${i === cursor}" class="${i === cursor ? "on" : ""}" data-i="${i}"><span class="s-kind">${esc(r.kind)}</span><b>${esc(r.text)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ""}</li>`).join("")
    || `<li class="s-none">Nic nie znaleziono dla „${esc($("#s-q").value)}”.</li>`;
  $("#s-res .on")?.scrollIntoView({ block: "nearest" });
}
function openSearch() { loadWikiSearch(); $("#search").hidden = false; $("#s-q").value = ""; cursor = 0; renderSearch(); setTimeout(() => $("#s-q").focus(), 10); }
function closeSearch() { $("#search").hidden = true; frames[current]?.contentWindow?.focus(); }
function pick(i) { const r = results[i]; if (!r) return; closeSearch(); r.go(); }
$("#s-q").addEventListener("input", () => { cursor = 0; renderSearch(); });
$("#s-q").addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); cursor = Math.min(results.length - 1, cursor + 1); renderSearch(); }
  if (e.key === "ArrowUp") { e.preventDefault(); cursor = Math.max(0, cursor - 1); renderSearch(); }
  if (e.key === "Enter") { e.preventDefault(); pick(cursor); }
  if (e.key === "Escape") closeSearch();
});
$("#s-res").addEventListener("click", (e) => { const li = e.target.closest("[data-i]"); if (li) pick(+li.dataset.i); });
$("#search").addEventListener("mousedown", (e) => { if (e.target.id === "search") closeSearch(); });

/* ---------- zmiana rozmiaru okna za krawędzie (okno bez ramki Windows) ---------- */
document.querySelectorAll("[data-rz]").forEach((h) => h.addEventListener("pointerdown", async (e) => {
  const a = api(); if (!a) return;
  e.preventDefault(); h.setPointerCapture(e.pointerId);
  const start = await a.win_rect(), sx = e.screenX, sy = e.screenY, dir = h.dataset.rz;
  let next = null, busy = false;
  const move = (ev) => {
    const dx = ev.screenX - sx, dy = ev.screenY - sy;
    let [x, y, w, hgt] = start;
    if (dir.includes("r")) w = start[2] + dx;
    if (dir.includes("b")) hgt = start[3] + dy;
    if (dir.includes("l")) { w = Math.max(1000, start[2] - dx); x = start[0] + start[2] - w; }
    next = [x, y, w, hgt];
    if (busy) return;
    busy = true;
    requestAnimationFrame(async () => { const n = next; try { await a.win_set(...n); } catch {} busy = false; });
  };
  const up = () => { h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", up); setTimeout(moveGlider, 50); };
  h.addEventListener("pointermove", move); h.addEventListener("pointerup", up);
}));

/* ---------- Ctrl+Shift+1..3 z Pythona (działa też w grze) ---------- */
const PRESET_NAMES = ["PayDay", "Grzyby / zbieractwo", "Łowienie ryb", "Skrytka kontrabandy", "Przerwa", "Opłata za dom"];
window.__hotTimer = async (n) => {
  let preset = n;
  try { preset = ((await api().get_settings()).hotPresets || [1, 2, 3])[n - 1] || n; } catch {}
  frames.minutniki.contentWindow?.postMessage({ __payload: { preset } }, "*");
  api()?.notify("Minutnik wystartował", PRESET_NAMES[preset - 1] || "Minutnik");
};
/* automatyczny PayDay: po wejściu na serwer minutnik do najbliższej pełnej godziny, potem co godzinę */
async function autoPayday() {
  const a = api(); if (!a || !game.running || !game.session?.connected) return;
  let st; try { st = await a.get_settings(); } catch { return; }
  if (!st.autoPayday) return;
  const timers = store.get("majestic-minutniki-v1", []);
  if (timers.some((t) => t.name === "PayDay (auto)" && t.end > Date.now())) return;
  const next = new Date(); next.setMinutes(0, 0, 0); next.setHours(next.getHours() + 1);
  frames.minutniki.contentWindow?.postMessage({ __payload: { addTimer: { name: "PayDay (auto)", end: next.getTime(), dur: 3600000, rep: true } } }, "*");
}
setInterval(autoPayday, 60000);

/* ---------- raport tygodnia (niedziela wieczór) i cele tygodniowe ---------- */
const weekStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() - ((d.getDay() + 6) % 7) * 86400000; };
async function weekStats() {
  const ws = weekStart(), a = api();
  let sec = 0;
  try { sec = ((await a.sessions()).sessions || []).filter((x) => x.connected && x.joined >= ws).reduce((t, x) => t + x.played, 0); } catch {}
  const log = store.get("majestic-zarobki-v1", []).filter((l) => l.at >= ws);
  const net = log.reduce((t, l) => t + l.amt, 0), jobs = {};
  log.filter((l) => l.kind !== "exp" && l.min).forEach((l) => { const j = (jobs[l.job] ||= { amt: 0, min: 0 }); j.amt += l.amt; j.min += l.min; });
  const best = Object.entries(jobs).map(([n, j]) => [n, j.amt / (j.min / 60)]).sort((x, y) => y[1] - x[1])[0];
  return { ws, hours: sec / 3600, net, best };
}
const usd = (n) => "$" + Math.round(n).toLocaleString("pl-PL");
async function weeklyChecks() {
  const a = api(); if (!a) return;
  const st = await weekStats(), now = new Date();
  if (now.getDay() === 0 && now.getHours() >= 18 && store.get("majestic-raport-v1", 0) !== st.ws) {
    store.set("majestic-raport-v1", st.ws);
    a.notify("Podsumowanie tygodnia", `Grałeś ${st.hours.toFixed(1).replace(".", ",")} h, na czysto ${usd(st.net)}.${st.best ? ` Najlepsza praca: ${st.best[0]} (${usd(st.best[1])}/h).` : ""}`);
    a.discord_send(`📋 **Podsumowanie tygodnia**\n⏱️ Czas gry: **${st.hours.toFixed(1).replace(".", ",")} h**\n💰 Na czysto: **${usd(st.net)}**${st.best ? `\n🏆 Najlepsza praca: ${st.best[0]} (${usd(st.best[1])}/h)` : ""}`, "dcReport");
  }
  const goals = { hours: 10, money: 500000, ...store.get("majestic-cele-v1", {}) };
  const done = store.get("majestic-cele-zrobione-v1", {});
  if (done.ws !== st.ws) { done.ws = st.ws; done.hours = done.money = false; }
  if (goals.hours && !done.hours && st.hours >= goals.hours) { done.hours = true; a.notify("Cel osiągnięty!", `Masz już ${goals.hours} h gry w tym tygodniu.`); }
  if (goals.money && !done.money && st.net >= goals.money) { done.money = true; a.notify("Cel osiągnięty!", `Zarobiłeś w tym tygodniu ${usd(st.net)} na czysto.`); }
  store.set("majestic-cele-zrobione-v1", done);
}
async function checkUpdate() {
  const a = api(); if (!a) return;
  try {
    const r = await a.check_update();
    if (r && r.newer && store.get("majestic-wersja-v1", "") !== r.latest) { store.set("majestic-wersja-v1", r.latest); a.notify("Nowa wersja Majestic Companion", `Dostępna wersja ${r.latest}. Zainstalujesz ją jednym kliknięciem w Ustawieniach → Sprawdź aktualizacje.`); }
  } catch {}
}
async function dailyJobs() {
  const a = api(); if (!a) return;
  const today = new Date().toDateString();
  if (store.get("majestic-kopia-dzien-v1", "") !== today) {
    const d = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("majestic-")) d[k] = localStorage.getItem(k); }
    try { const r = await a.auto_backup(JSON.stringify({ app: "majestic-companion", version: 1, data: d })); if (r.ok) store.set("majestic-kopia-dzien-v1", today); } catch {}
  }
  if (store.get("majestic-zmiany-dzien-v1", "") !== today) {
    store.set("majestic-zmiany-dzien-v1", today);
    try { const r = await a.changelog_sync(); if (r.ok && r.new.length) a.notify("Nowa łatka Majestic", r.new[0] + " · szczegóły w Statystykach"); } catch {}
  }
}
/* notatka po sesji: trafia do dziennika postaci */
function sessionNote(min, server) {
  const o = document.createElement("div");
  o.style.cssText = "position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.5);display:grid;place-items:center";
  o.innerHTML = `<form role="dialog" aria-modal="true" aria-label="Notatka po sesji" style="width:min(460px,92vw);background:var(--panel-solid,#0b1428);color:var(--text,#eee);border:1px solid var(--line-2);border-radius:8px;padding:20px"><h2 style="margin:0 0 4px;font-family:Bahnschrift,Segoe UI">Co się działo?</h2><p style="margin:0 0 12px;color:var(--text-3)">Sesja ${min} min${server ? " · " + server : ""}. Wpis trafi do dziennika postaci.</p><textarea name="t" rows="4" maxlength="2000" style="width:100%;box-sizing:border-box" aria-label="Notatka z sesji"></textarea><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn ghost small" type="button" data-x>Pomiń</button><button class="btn primary small">Zapisz</button></div></form>`;
  const close = () => o.remove();
  o.querySelector("[data-x]").onclick = close;
  o.querySelector("form").onsubmit = (e) => {
    e.preventDefault(); const t = e.target.t.value.trim(); close(); if (!t) return;
    const list = store.get("majestic-dziennik-v1", []);
    list.push({ id: Date.now().toString(36), day: new Date().toISOString().slice(0, 10), t: `[Sesja ${min} min${server ? ", " + server : ""}] ${t}`, at: Date.now() });
    store.set("majestic-dziennik-v1", list); frames.rp?.contentWindow?.location.reload();
  };
  document.body.appendChild(o); o.querySelector("textarea").focus();
}
/* licznik zbierania: Ctrl+Shift+Z start/stop, Ctrl+Shift+X +1, sterowany też z widżetu */
const CKEY = "majestic-zbieranie-v1";
window.__collect = (cmd, arg) => {
  const c = { job: "Zbieractwo", price: 0, count: 0, on: false, start: 0, ...store.get(CKEY, {}) }, a = api();
  if (cmd === "set") Object.assign(c, arg || {});
  if (cmd === "add") c.count = Math.max(0, c.count + (+arg || 1));
  if (cmd === "toggle") cmd = c.on ? "stop" : "start";
  if (cmd === "start") { Object.assign(c, { on: true, start: Date.now(), count: 0 }); a?.notify("Licznik zbierania", `Start: ${c.job}. Ctrl+Shift+X dodaje sztukę.`); }
  if (cmd === "stop" && c.on) {
    const min = Math.max(1, Math.round((Date.now() - c.start) / 60000)), amt = Math.round(c.count * c.price);
    c.on = false;
    if (c.count) { const g = store.get("majestic-zbieranie-cel-v1", { goal: 0, days: {} }), dk = new Date().toISOString().slice(0, 10); g.days[dk] = (g.days[dk] || 0) + c.count; store.set("majestic-zbieranie-cel-v1", g); }
    if (c.count) {
      const log = store.get("majestic-zarobki-v1", []);
      log.push({ id: Date.now().toString(36), job: c.job, amt, min, at: Date.now(), qty: c.count, price: c.price });
      store.set("majestic-zarobki-v1", log); frames.zarobki?.contentWindow?.location.reload();
    }
    a?.notify("Koniec zbierania", c.count ? `${c.job}: ${c.count} szt. w ${min} min${amt ? " = $" + amt.toLocaleString("pl-PL") : ""}. Zapisane w Zarobkach.` : "Nic nie zebrano, nic nie zapisuję.");
  }
  store.set(CKEY, c);
  return c;
};
/* majątek: przypomnienie o opłatach, które mijają dziś albo już minęły */
function billCheck() {
  const a = api(); if (!a) return;
  const today = new Date().toDateString(); if (store.get("majestic-oplaty-dzien-v1", "") === today) return;
  store.set("majestic-oplaty-dzien-v1", today);
  const due = store.get("majestic-majatek-v1", []).filter((x) => x.every && x.paid + x.every * 86400000 < Date.now() + 86400000);
  if (due.length) a.notify("Opłaty do zrobienia", due.map((x) => x.name).join(", ") + " · szczegóły w Zarobkach");
}
setTimeout(billCheck, 60000); setInterval(billCheck, 3600000);
/* asystent głosowy: krótkie komunikaty czytane przez syntezator Windows */
window.__speak = (t) => {
  if (!prefs().voice || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(String(t)); u.lang = "pl-PL"; u.rate = 1.05;
  const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith("pl")); if (v) u.voice = v;
  speechSynthesis.speak(u);
};
/* Ctrl+Shift+S: zrzut trafia do galerii w Postać i RP */
window.__shot = (name) => {
  const g = store.get("majestic-galeria-v1", []);
  g.push({ name, at: Date.now(), cap: "", tags: [] }); store.set("majestic-galeria-v1", g);
  frames.rp?.contentWindow?.postMessage({ __payload: { gallery: true } }, "*");
  api()?.notify("Zrzut zapisany", "Dodaj opis w Postać i RP → Galeria");
};
const TOUR = [
  ["Witaj w Majestic Companion", "Krótki przegląd w 5 krokach. Możesz go pominąć i włączyć ponownie w Ustawieniach."],
  ["Zakładki po lewej", "Ctrl+1…0 przełącza zakładki. Dziś pokazuje zarobek, minutniki, kalendarz i zadania."],
  ["Szukaj wszędzie", "Ctrl+Spacja otwiera wyszukiwarkę: zakładki, pojazdy, nieruchomości, przepisy."],
  ["W grze", "Ctrl+Shift+N to szybka notatka, Ctrl+Shift+1…3 minutniki, F10 nakładka z PayDay."],
  ["Zrzut i głos", "Ctrl+Shift+S robi zrzut ekranu do galerii. W Ustawieniach włączysz głos, który czyta ważne powiadomienia."],
  ["Licznik zbierania", "Ctrl+Shift+Z start/stop, Ctrl+Shift+X +1 sztuka. Po zatrzymaniu zarobek zapisze się sam. Widżet pokazuje wszystko nad grą."],
  ["Ekipa", "Wpisz ten sam kod co znajomi w zakładce Mapa → Ekipa: wspólne znaczniki, czat i ranking tygodnia."],
];
function showTour() {
  let i = 0; const o = document.createElement("div");
  o.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:grid;place-items:center";
  const draw = () => { o.innerHTML = `<div role="dialog" aria-modal="true" style="width:min(420px,90vw);background:var(--panel-solid,#0b1428);color:var(--text,#eee);border:1px solid var(--line-2);border-radius:8px;padding:22px"><small style="color:var(--text-3)">${i + 1} / ${TOUR.length}</small><h2 style="margin:6px 0 8px;font-family:Bahnschrift,Segoe UI">${TOUR[i][0]}</h2><p style="margin:0 0 18px;color:var(--text-2);line-height:1.5">${TOUR[i][1]}</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost small" data-t="x" type="button">Pomiń</button><button class="btn primary small" data-t="n" type="button">${i < TOUR.length - 1 ? "Dalej" : "Zaczynamy"}</button></div></div>`; o.querySelector("[data-t=n]").focus(); };
  o.addEventListener("click", (e) => { const t = e.target.dataset.t; if (t === "x" || (t === "n" && ++i >= TOUR.length)) { o.remove(); store.set("majestic-samouczek-v1", true); } else if (t === "n") draw(); });
  o.addEventListener("keydown", (e) => { if (e.key === "Escape") { o.remove(); store.set("majestic-samouczek-v1", true); } });
  document.body.appendChild(o); draw();
}
window.addEventListener("message", (e) => { if (e.data && e.data.__tour) showTour(); if (e.data && e.data.__wizard) showWizard(); if (e.data && e.data.__layout) applyLayout(); });
/* okno dialogowe w stylu aplikacji */
function dialog(html, onClick) {
  const o = document.createElement("div"); o.className = "mjd"; o.innerHTML = `<div role="dialog" aria-modal="true">${html}</div>`;
  const close = () => o.remove();
  o.addEventListener("click", (e) => onClick(e, close, o));
  o.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.body.appendChild(o); o.querySelector("input,select,button")?.focus();
  return o;
}
/* kreator pierwszego uruchomienia: serwer, nick, frakcja, praca → ustawienia, karta postaci, motyw */
const FACTIONS = [["", "Cywil / brak", ""], ["lspd", "LSPD / LSCSD", "lspd"], ["ems", "EMS", "ems"], ["gov", "Rząd / FIB / SANG", "mdt"], ["ballas", "Ballas", "ballas"], ["vagos", "Vagos", "vagos"], ["families", "Families", "families"], ["bloods", "Bloods", "bloods"], ["news", "Weazel News", "weazel"]];
async function showWizard() {
  const a = api(); let st = {}; try { st = (await a?.get_settings()) || {}; } catch {}
  const pc = store.get("majestic-postac-v1", {});
  dialog(`<h2>Ustawmy aplikację pod Ciebie</h2><p style="margin:0 0 14px;color:var(--text-3)">30 sekund. Wszystko zmienisz później w Ustawieniach.</p>
    <label>Serwer (np. PL1, PL2, DE1)<input name="srv" value="${esc(st.server || "PL1")}" maxlength="12"></label>
    <label>Imię i nazwisko postaci<input name="name" value="${esc(pc.name || "")}" maxlength="50" placeholder="np. John Doe"></label>
    <label>Frakcja<select name="fr">${FACTIONS.map(([v, n]) => `<option value="${v}">${n}</option>`).join("")}</select></label>
    <label>Główna praca<input name="job" value="${esc(pc.job || "")}" maxlength="40" placeholder="np. Rybak, Mechanik, Zbieractwo"></label>
    <div class="row"><button class="btn ghost small" data-w="x" type="button">Pomiń</button><button class="btn primary small" data-w="ok" type="button">Gotowe</button></div>`,
  async (e, close, o) => {
    const t = e.target.dataset.w; if (!t) return;
    if (t === "ok") {
      const v = (n) => o.querySelector(`[name=${n}]`).value.trim(), fr = FACTIONS.find((f) => f[0] === v("fr")) || FACTIONS[0];
      try { if (v("srv")) await a?.set_settings({ server: v("srv").toUpperCase() }); } catch {}
      store.set("majestic-postac-v1", { ...pc, name: v("name") || pc.name, faction: fr[0] ? fr[1] : pc.faction, job: v("job") || pc.job });
      if (fr[2]) store.set("majestic-wyglad-v1", { ...store.get("majestic-wyglad-v1", {}), theme: fr[2] });
      if (v("job")) { const c = store.get("majestic-zbieranie-v1", {}); if (!c.on) store.set("majestic-zbieranie-v1", { ...c, job: v("job") }); }
    }
    store.set("majestic-kreator-v1", true); close();
    if (t === "ok") location.reload(); else if (!store.get("majestic-samouczek-v1", false)) showTour();
  });
}
if (!store.get("majestic-kreator-v1", false) && !store.get("majestic-samouczek-v1", false)) setTimeout(showWizard, 1500);
else if (!store.get("majestic-samouczek-v1", false)) setTimeout(showTour, 1500);
/* „Co nowego” po aktualizacji */
const CHANGES = {
  "2.10.0": ["Własne skróty Ctrl+Shift+litera (Ustawienia → Skróty w grze)", "Planer sesji krok po kroku (Minutniki), widoczny też w widżecie", "Wyszukiwarka szuka pojazdów, nieruchomości i przepisów z wiki", "Warstwy tras i stref na mapie, każdą można ukryć", "Historia cen pojazdów: strzałka ▲▼ przy cenie", "Ekipa: porównanie $/h i najlepszej pracy, ranking na Discorda, kod ekipy jako QR", "Historia postaci do PDF (karta, dziennik, galeria)", "Motyw według pory dnia"],
  "2.9.0": ["Kreator pierwszego uruchomienia (serwer, postać, frakcja, praca)", "Zgłoś błąd jednym kliknięciem (Ustawienia)", "Ukrywanie i kolejność zakładek", "Szybkie akcje na górnym pasku", "Kalkulator w wyszukiwarce: wpisz np. 1.2m-450k", "Notatki z kategoriami i przypinaniem", "Przypomnienia cykliczne (co tydzień, co X dni)", "Tryb kompaktowy okna", "Dzienny cel zbierania z serią dni w widżecie"],
};
setTimeout(async () => {  // po starcie: API pywebview pojawia się dopiero po chwili
  const a = api(); let v = ""; try { v = await a?.app_version(); } catch {} if (!v) return;
  const seen = store.get("majestic-wersja-v1", ""); store.set("majestic-wersja-v1", v);
  if (!seen || seen === v || !CHANGES[v]) return;
  dialog(`<h2>Co nowego w ${esc(v)}</h2><ul>${CHANGES[v].map((c) => `<li>${esc(c)}</li>`).join("")}</ul><div class="row"><button class="btn primary small" data-ok type="button">Super</button></div>`, (e, close) => { if (e.target.closest("[data-ok]")) close(); });
}, 4000);
/* zakładki: kolejność i ukrywanie z Ustawień */
function applyLayout() {
  const L = store.get("majestic-zakladki-v1", { order: [], hidden: [] }), box = $("#rail .tabs"), glider = box.querySelector(".tab-glider");
  [...L.order, ...MODS].filter((m, i, a) => a.indexOf(m) === i).forEach((m) => { const b = box.querySelector(`[data-mod="${m}"]`); if (b) box.insertBefore(b, glider); });
  box.querySelectorAll(".tab[data-mod]").forEach((b) => (b.hidden = L.hidden.includes(b.dataset.mod) && b.dataset.mod !== current));
  document.documentElement.classList.toggle("compact", !!store.get("majestic-wyglad-v1", {}).compact);
  renderQa();
}
/* szybkie akcje na górnym pasku */
const QA = {
  collect: ["Zbieranie", () => window.__collect("toggle"), () => store.get("majestic-zbieranie-v1", {}).on],
  payday: ["PayDay", () => window.__hotTimer(1)],
  note: ["Notatka", () => api()?.toggle_note()],
  shot: ["Zrzut", () => api()?.quick_shot()],
  widget: ["Widżet", () => api()?.open_widget()],
  search: ["Szukaj", () => openSearch()],
};
function renderQa() {
  const on = store.get("majestic-akcje-v1", ["collect", "note", "widget"]);
  $("#qa").innerHTML = on.filter((k) => QA[k]).map((k) => `<button type="button" data-qa="${k}" class="${QA[k][2] && QA[k][2]() ? "on" : ""}">${QA[k][0]}</button>`).join("");
}
$("#qa").addEventListener("click", (e) => { const b = e.target.closest("[data-qa]"); if (b) { QA[b.dataset.qa][1](); setTimeout(renderQa, 300); } });
setInterval(renderQa, 5000);
applyLayout();
/* planer sesji: kroki po kolei, każdy z własnym czasem */
const PLKEY = "majestic-plan-v1";
window.__plan = (cmd) => {
  const p = store.get(PLKEY, { steps: [], run: null });
  if (cmd === "start" && p.steps.length) { p.run = { i: 0, end: Date.now() + p.steps[0].min * 60000 }; api()?.notify("Plan sesji: start", `Teraz: ${p.steps[0].name} (${p.steps[0].min} min)`); }
  if (cmd === "next" && p.run) p.run.end = Date.now();
  if (cmd === "stop") p.run = null;
  store.set(PLKEY, p); planTick(); return p;
};
function planTick() {
  const p = store.get(PLKEY, { steps: [], run: null }); if (!p.run || Date.now() < p.run.end) return;
  p.run.i++;
  if (p.run.i >= p.steps.length) { p.run = null; api()?.notify("Plan sesji zakończony", "Wszystkie kroki zrobione."); }
  else { const s = p.steps[p.run.i]; p.run.end = Date.now() + s.min * 60000; api()?.notify("Plan sesji: następny krok", `Teraz: ${s.name} (${s.min} min)`); }
  store.set(PLKEY, p); frames.minutniki?.contentWindow?.postMessage({ __payload: { plan: true } }, "*");
}
setInterval(planTick, 5000);
/* dane z wiki w wyszukiwarce: pojazdy, nieruchomości, przepisy (wczytane raz, przy pierwszym szukaniu) */
let wikiSearch = null;
async function loadWikiSearch() {
  if (wikiSearch) return; wikiSearch = []; const a = api(); if (!a) return;
  try { ((await a.vehicles())?.items || []).forEach((v) => wikiSearch.push({ kind: "Pojazd", text: v[1], sub: v[8] ? "$" + v[8].toLocaleString("pl-PL") : "", go: () => show("pojazdy") })); } catch {}
  try { ((await a.crafting())?.recipes || []).forEach((r) => wikiSearch.push({ kind: "Przepis", text: r.n, sub: r.ing.map((x) => x[0]).join(", ").slice(0, 80), go: () => show("crafting") })); } catch {}
  try { const r = await a.wiki_list("realties"); ((r && r.items) || r || []).forEach((x) => Array.isArray(x.mapPosition) && wikiSearch.push({ kind: "Nieruchomość", text: (x.type === "house" ? "Dom " : x.type === "apartment" ? "Mieszkanie " : "Lokal ") + x.serial, sub: x.price ? "$" + x.price.toLocaleString("pl-PL") + (x.garageSlots ? " · garaż " + x.garageSlots : "") : "", go: () => show("mapa", { goto: x.mapPosition, label: (x.type === "house" ? "Dom " : "Lokal ") + x.serial }) })); } catch {}
  if (!$("#search").hidden) renderSearch();
}
/* przypomnienia cykliczne: co tydzień o godzinie albo co X dni; sprawdzane co minutę */
function nextDue(r, from) {
  const [h, m] = (r.time || "20:00").split(":").map(Number), d = new Date(from); d.setSeconds(0, 0); d.setHours(h, m);
  if (r.kind === "week") { while (d.getDay() !== +r.dow || d.getTime() <= from) d.setDate(d.getDate() + 1); return d.getTime(); }
  const step = Math.max(1, +r.every || 1) * 86400000; let t = (r.last || r.created || from); return t + step;
}
function cyclicCheck() {
  const list = store.get("majestic-cykliczne-v1", []); let changed = false; const now = Date.now();
  list.forEach((r) => { if (!r.due) { r.due = nextDue(r, now); changed = true; } if (r.due <= now) { api()?.notify("Przypomnienie: " + r.name, r.kind === "week" ? "Co tydzień" : `Co ${r.every} dni`); r.last = now; r.due = nextDue(r, now + 60000); changed = true; } });
  if (changed) store.set("majestic-cykliczne-v1", list);
}
setTimeout(cyclicCheck, 20000); setInterval(cyclicCheck, 60000);
setTimeout(() => { weeklyChecks(); checkUpdate(); }, 12000);
setTimeout(dailyJobs, 90000); setInterval(dailyJobs, 3600000);
setInterval(weeklyChecks, 1800000);
boot();
})();

(() => {
"use strict";
const $ = (s) => document.querySelector(s);
const api = () => (window.pywebview && window.pywebview.api) || null;
const MODS = ["dzis", "mapa", "kontakty", "sesje", "minutniki", "zarobki", "rp", "ekipa", "ustawienia"];
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
const NAMES = { dzis: "Dziś", mapa: "Mapa", kontakty: "Kontakty", sesje: "Statystyki gry", minutniki: "Minutniki", zarobki: "Zarobki", rp: "Teksty RP", ekipa: "Ekipa", ustawienia: "Ustawienia" };
function setCallsign(mod) {
  $("#cs-code").textContent = "MDT-" + String(MODS.indexOf(mod) + 1).padStart(2, "0");
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
  const n = /^ctrl\+([1-9])$/.exec(k);
  if (n) show(MODS[+n[1] - 1]);
  if (k === "ctrl+space") openSearch();
}
document.addEventListener("keydown", (e) => {
  if (e.key === "F11") { e.preventDefault(); handleKey("F11"); }
  if (e.ctrlKey && /^[1-9]$/.test(e.key)) { e.preventDefault(); handleKey("ctrl+" + e.key); }
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
    if (lastSrv) {
      if (s.techWorks && !lastSrv.techWorks) a.notify("Przerwa techniczna", `${s.name}: serwer ma przerwę techniczną.`);
      if (!s.techWorks && lastSrv.techWorks) a.notify("Serwer znowu działa", `${s.name} wrócił po przerwie technicznej.`);
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
  return out;
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
  cursor = Math.min(cursor, Math.max(0, results.length - 1));
  $("#s-res").innerHTML = results.map((r, i) => `<li role="option" aria-selected="${i === cursor}" class="${i === cursor ? "on" : ""}" data-i="${i}"><span class="s-kind">${esc(r.kind)}</span><b>${esc(r.text)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ""}</li>`).join("")
    || `<li class="s-none">Nic nie znaleziono dla „${esc($("#s-q").value)}”.</li>`;
  $("#s-res .on")?.scrollIntoView({ block: "nearest" });
}
function openSearch() { $("#search").hidden = false; $("#s-q").value = ""; cursor = 0; renderSearch(); setTimeout(() => $("#s-q").focus(), 10); }
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
    if (r && r.newer && store.get("majestic-wersja-v1", "") !== r.latest) { store.set("majestic-wersja-v1", r.latest); a.notify("Nowa wersja Majestic Companion", `Dostępna wersja ${r.latest}. Pobierzesz ją w Ustawieniach → Sprawdź aktualizacje.`); }
  } catch {}
}
setTimeout(() => { weeklyChecks(); checkUpdate(); }, 12000);
setInterval(weeklyChecks, 1800000);
boot();
})();

(() => {
"use strict";

/* ---------- ikony ---------- */
const ICONS = {
  cross: '<path d="M12 5v14M5 12h14"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 13h18"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  bank: '<path d="M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 21h18"/>',
  bag: '<path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
  shirt: '<path d="M8 3l-5 4 3 4 2-1v11h8V10l2 1 3-4-5-4c0 2-1.5 3-4 3S8 5 8 3z"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 8L20 19M8.5 16L20 5"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10M14 8l4 3v7a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
  plane: '<path d="M10 14l-7-3 1.5-1.5L11 11l5-6a2 2 0 0 1 3 3l-6 5 1.5 6.5L13 21l-3-7z"/>',
  star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4l-5.5 2.9 1-6.2L3 9.7l6.2-.9z"/>',
  pin: '<path d="M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  home: '<path d="M3 11l9-7 9 7M5 9.5V20h14V9.5"/>',
  car: '<path d="M5 16l1.5-6h11L19 16M3 16h18v4H3zM7 20v1M17 20v1"/><circle cx="7.5" cy="18" r=".5"/>',
  skull: '<path d="M12 3a8 8 0 0 0-5 14v3h10v-3a8 8 0 0 0-5-14z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/>',
  money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
  flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15zM5 19l7-7"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  me: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/>',
  hammer: '<path d="M14 6l4 4M12 4l6 6-2 2-6-6zM11 9l-8 8 2 2 8-8"/>',
};
const ico = (n) => `<svg viewBox="0 0 24 24">${ICONS[n] || ICONS.pin}</svg>`;
const CUSTOM_ICONS = ["pin", "home", "car", "money", "skull", "flag", "star", "briefcase"];
const SWATCHES = ["#ffffff", "#f5b544", "#ff5a6a", "#ff7ac6", "#b07cff", "#4d8dff", "#2fd4d4", "#3ddc97", "#a4e05a"];

/* ---------- układ współrzędnych GTA V ---------- */
const CRS = L.extend({}, L.CRS.Simple, {
  projection: L.Projection.LonLat,
  scale: (z) => Math.pow(2, z),
  zoom: (s) => Math.log(s) / Math.LN2,
  distance: (a, b) => Math.hypot(b.lng - a.lng, b.lat - a.lat),
  transformation: new L.Transformation(0.02072, 117.3, -0.0205, 172.8),
  infinite: true,
});
const toLL = (x, y) => L.latLng(y, x);
// flyTo dzieli przez rozmiar mapy — gdy okno jest zminimalizowane, przeskakujemy bez animacji
function fly(latlng, zoom, opts) {
  const s = map.getSize();
  if (!s.x || !s.y || document.hidden) return map.setView(latlng, zoom, { animate: false });
  try { map.flyTo(latlng, zoom, opts); } catch { map.setView(latlng, zoom); }
}

/* ---------- stan ---------- */
const STORE_KEY = "majestic-mapa-v1";
const cats = window.CATEGORIES;
const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
let state = null;
const leafletById = new Map();
let selectedId = null;

const uid = () => "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (s) => document.querySelector(s);

function builtinMarkers() {
  return window.DEFAULT_MARKERS.map(([cat, name, x, y, note], i) => ({ id: "d" + i, cat, name, x, y, note: note || "", builtin: true }));
}

function defaultState() {
  return {
    style: "satellite",
    hiddenCats: [],
    markersVersion: window.MARKERS_VERSION,
    markers: builtinMarkers(),
  };
}

// zapis przez localStorage okna (WebView2 trzyma go na dysku w %APPDATA%\MajesticMapa)
const api = () => null;

async function loadState() {
  let raw = null;
  try {
    if (api()) raw = await api().load();
    else raw = localStorage.getItem(STORE_KEY);
  } catch (e) { console.warn(e); }
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.markers)) {
        if (s.markersVersion !== window.MARKERS_VERSION) {
          // nowa wersja wbudowanych znaczników: podmień je, zachowaj własne
          const own = s.markers.filter((m) => !m.builtin).map((m) => (catById[m.cat] ? m : { ...m, cat: "moje" }));
          s.markers = [...builtinMarkers(), ...own];
          s.markersVersion = window.MARKERS_VERSION;
          s.hiddenCats = (s.hiddenCats || []).filter((c) => catById[c]);
        }
        return Object.assign(defaultState(), s);
      }
    } catch (e) { console.warn("Uszkodzony zapis", e); }
  }
  return defaultState();
}

let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const data = JSON.stringify(state);
    try {
      if (api()) await api().save(data);
      else localStorage.setItem(STORE_KEY, data);
    } catch (e) { toast("Nie udało się zapisać zmian"); console.error(e); }
  }, 250);
}

/* ---------- mapa ---------- */
const map = L.map("map", {
  crs: CRS,
  center: [600, 100],
  zoom: 1,
  minZoom: 1,
  maxZoom: 7,
  zoomControl: false,
  attributionControl: false,
  zoomSnap: 0.25,
  zoomDelta: 0.5,
  wheelPxPerZoomLevel: 90,
  maxBounds: [[-5600, -5900], [8600, 6900]],
  maxBoundsViscosity: 0.8,
  preferCanvas: false,
});
L.control.zoom({ position: "bottomright", zoomInTitle: "Przybliż", zoomOutTitle: "Oddal" }).addTo(map);

let tiles = null;
function setStyle(style, animate = true) {
  state.style = style;
  const next = L.tileLayer(`tiles/${style}/{z}/{x}/{y}.webp`, {
    minZoom: 0, maxZoom: 7, maxNativeZoom: 5, noWrap: true, tileSize: 256,
    bounds: [[-4058, -5661], [8429, 6694]], keepBuffer: 4,
  });
  next.addTo(map);
  const old = tiles;
  tiles = next;
  if (old) {
    const pane = old.getContainer();
    if (pane && animate) {
      pane.style.transition = "opacity .5s cubic-bezier(.16,1,.3,1)";
      next.once("load", () => { pane.style.opacity = "0"; setTimeout(() => map.removeLayer(old), 520); });
      setTimeout(() => map.hasLayer(old) && map.removeLayer(old), 2500);
    } else map.removeLayer(old);
  }
  $("#map").className = $("#map").className.replace(/\bstyle-\w+/g, "") + " style-" + style;
  document.querySelectorAll("#styles button").forEach((b) => b.classList.toggle("on", b.dataset.style === style));
  moveGlider();
}
function moveGlider() {
  const on = $("#styles button.on");
  const g = $(".seg-glider");
  if (!on) return;
  g.style.width = on.offsetWidth + "px";
  g.style.transform = `translateX(${on.offsetLeft}px)`;
}

/* ---------- znaczniki ---------- */
const markerColor = (m) => m.color || catById[m.cat]?.color || "#fff";
const markerIcon = (m) => m.icon || catById[m.cat]?.icon || "pin";

function makeIcon(m, delay = 0, extra = "") {
  return L.divIcon({
    className: "",
    iconSize: [34, 42],
    iconAnchor: [17, 38],
    tooltipAnchor: [0, -36],
    html: `<div class="mk ${m.builtin ? "" : "custom"} ${m.id === selectedId ? "sel" : ""} ${extra}" style="--c:${markerColor(m)}">
      <div class="mk-in" style="--d:${delay}ms"><i class="mk-shadow"></i><div class="mk-pin"></div><div class="mk-ico">${ico(markerIcon(m))}</div></div></div>`,
  });
}

function addLeaflet(m, delay = 0) {
  const lm = L.marker(toLL(m.x, m.y), { icon: makeIcon(m, delay), riseOnHover: true, keyboard: true, title: m.name });
  lm.bindTooltip(esc(m.name), { direction: "top", className: "mk-tip", offset: [0, 0] });
  lm.on("click", () => select(m.id, false));
  lm.on("dragend", () => {
    const p = lm.getLatLng();
    m.x = Math.round(p.lng); m.y = Math.round(p.lat);
    save();
    if (selectedId === m.id) renderCard(m);
    toast("Przeniesiono: " + m.name);
  });
  leafletById.set(m.id, lm);
  if (!state.hiddenCats.includes(m.cat)) lm.addTo(map);
  return lm;
}

function refreshIcon(m) {
  const lm = leafletById.get(m.id);
  if (!lm) return;
  lm.setIcon(makeIcon(m, 0, "static"));
  lm.setTooltipContent(esc(m.name));
  lm.options.title = m.name;
  // brak animacji zrzutu przy odświeżeniu
  const el = lm.getElement()?.querySelector(".mk-in");
  if (el) el.style.animation = "none";
}

function removeLeaflet(id, animate = true) {
  const lm = leafletById.get(id);
  if (!lm) return;
  leafletById.delete(id);
  const el = lm.getElement()?.querySelector(".mk");
  if (animate && el && map.hasLayer(lm)) {
    el.classList.add("out");
    setTimeout(() => map.removeLayer(lm), 360);
  } else map.removeLayer(lm);
}

function dropAll() {
  // znaczniki spadają falą od środka ekranu
  const c = map.getCenter();
  const list = state.markers.map((m) => ({ m, d: Math.hypot(m.x - c.lng, m.y - c.lat) })).sort((a, b) => a.d - b.d);
  list.forEach(({ m }, i) => addLeaflet(m, 120 + Math.min(i * 9, 1400)));
}

function setCatVisible(catId, visible) {
  state.hiddenCats = state.hiddenCats.filter((c) => c !== catId);
  if (!visible) state.hiddenCats.push(catId);
  let i = 0;
  for (const m of state.markers) {
    if (m.cat !== catId) continue;
    const lm = leafletById.get(m.id);
    if (!lm) continue;
    if (visible && !map.hasLayer(lm)) {
      lm.setIcon(makeIcon(m, Math.min(i++ * 15, 500)));
      lm.addTo(map);
    } else if (!visible && map.hasLayer(lm)) {
      const el = lm.getElement()?.querySelector(".mk");
      if (el) { el.classList.add("out"); setTimeout(() => map.removeLayer(lm), 360); } else map.removeLayer(lm);
      if (selectedId === m.id) closeCard();
    }
  }
  save();
  renderCats();
}

/* ---------- panel kategorii ---------- */
const openCats = new Set();

function renderCats() {
  const ul = $("#cats");
  const counts = {};
  state.markers.forEach((m) => (counts[m.cat] = (counts[m.cat] || 0) + 1));
  const firstRender = !ul.children.length;
  ul.innerHTML = cats.map((c, i) => {
    const on = !state.hiddenCats.includes(c.id);
    const items = state.markers.filter((m) => m.cat === c.id).sort((a, b) => a.name.localeCompare(b.name, "pl"));
    return `<li class="cat ${on ? "on" : ""} ${openCats.has(c.id) ? "open" : ""}" data-cat="${c.id}" style="--c:${c.color};--i:${i};${firstRender ? "" : "animation:none"}">
      <div class="cat-row">
        <button class="cat-open" data-act="open" aria-expanded="${openCats.has(c.id)}" title="Pokaż listę">
          <span class="cat-dot">${ico(c.icon)}</span>
          <span class="cat-name">${esc(c.name)}</span>
          <span class="cat-count">${counts[c.id] || 0}</span>
          <svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
        </button>
        <button class="switch" data-act="toggle" role="switch" aria-checked="${on}" title="${on ? "Ukryj" : "Pokaż"} na mapie"></button>
      </div>
      <div class="cat-items"><ul>${items.length ? items.map((m) => placeRow(m)).join("") : `<li class="empty">${c.custom ? "Kliknij prawym na mapie, aby dodać swój pierwszy znacznik." : "Brak znaczników."}</li>`}</ul></div>
    </li>`;
  }).join("");
  const favs = state.markers.filter((m) => m.fav);
  $("#favs-wrap").hidden = !favs.length;
  $("#favs").innerHTML = favs.map((m, i) => placeRow(m, i)).join("");
  const hiddenAll = state.hiddenCats.length === cats.length;
  $("#toggle-all").textContent = hiddenAll ? "Pokaż wszystkie" : "Ukryj wszystkie";
  $("#stat").textContent = `${state.markers.length} znaczników · ${state.markers.filter((m) => !m.builtin).length} Twoich`;
}

function placeRow(m, i = 0) {
  return `<li><button class="place" data-id="${m.id}" style="--c:${markerColor(m)};--i:${i}"><i></i><span>${esc(m.name)}</span>${m.builtin ? "" : "<small>Twój</small>"}</button></li>`;
}

$("#cats").addEventListener("click", (e) => {
  const place = e.target.closest(".place");
  if (place) return select(place.dataset.id, true);
  const li = e.target.closest(".cat");
  if (!li) return;
  const id = li.dataset.cat;
  if (e.target.closest("[data-act=toggle]")) return setCatVisible(id, state.hiddenCats.includes(id));
  if (e.target.closest(".cat-row")) {
    openCats.has(id) ? openCats.delete(id) : openCats.add(id);
    li.classList.toggle("open");
  }
});

$("#favs").addEventListener("click", (e) => { const p = e.target.closest(".place"); if (p) select(p.dataset.id, true); });
$("#toggle-all").addEventListener("click", () => {
  const show = state.hiddenCats.length === cats.length;
  cats.forEach((c) => setCatVisible(c.id, show));
});

/* ---------- wyszukiwarka ---------- */
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");
$("#q").addEventListener("input", (e) => {
  const q = norm(e.target.value.trim());
  $("#results").hidden = !q;
  $("#cats-wrap").hidden = !!q;
  if (!q) return;
  if (q.startsWith("mjm:")) { $("#result-list").innerHTML = `<li class="empty">Naciśnij Enter, żeby dodać znacznik z kodu.</li>`; return; }
  const hits = state.markers.filter((m) => norm(m.name + " " + (m.note || "") + " " + (catById[m.cat]?.name || "")).includes(q)).slice(0, 60);
  // adresy z warstw wiki: domy, biznesy, bankomaty, strefy (np. „Dom #1556”, „Bankomat #90”)
  const addr = [];
  for (const [slug, items] of Object.entries(wikiData?.layers || {})) {
    if (slug === "captures" || addr.length >= 30) continue;
    for (const it of items) { if (it.t === "p" && it.n && norm(it.n).replace(/#/g, "").includes(q.replace(/#/g, ""))) { addr.push([slug, it]); if (addr.length >= 30) break; } }
  }
  const addrHtml = addr.map(([slug, it]) => `<li><button class="place addr" data-goto="${it.c[0]},${it.c[1]}" data-label="${esc(plName(it.n))}" style="--c:${WIKI[slug]?.color || "#94a3b8"}"><i></i><span>${esc(plName(it.n))}</span><small>${esc(WIKI[slug]?.name || "")}</small></button></li>`).join("");
  $("#result-list").innerHTML = hits.length || addr.length ? hits.map((m, i) => placeRow(m, i)).join("") + addrHtml : `<li class="empty">Nic nie znaleziono dla „${esc(e.target.value)}”.</li>`;
});
$("#q").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.value.trim().startsWith("MJM:")) { importCode(e.target.value.trim()); e.target.value = ""; e.target.dispatchEvent(new Event("input")); return; }
  if (e.key === "Enter") { const first = $("#result-list .place"); if (first) first.dataset.goto ? goAddr(first) : select(first.dataset.id, true); }
  if (e.key === "Escape") { e.target.value = ""; e.target.dispatchEvent(new Event("input")); e.target.blur(); }
});
function goAddr(b) {
  const [x, y] = b.dataset.goto.split(",").map(Number), ll = toLL(x, y);
  fly(ll, 4.5);
  L.popup({ className: "cd-pop" }).setLatLng(ll).setContent(`<b>${esc(b.dataset.label)}</b>`).openOn(map);
}
$("#result-list").addEventListener("click", (e) => { const p = e.target.closest(".place"); if (!p) return; p.dataset.goto ? goAddr(p) : select(p.dataset.id, true); });

/* ---------- wybór i karta ---------- */
function select(id, flyTo) {
  const m = state.markers.find((x) => x.id === id);
  if (!m) return;
  if (state.hiddenCats.includes(m.cat)) setCatVisible(m.cat, true);
  const prev = selectedId;
  selectedId = id;
  if (prev && prev !== id) { const pm = state.markers.find((x) => x.id === prev); if (pm) refreshIcon(pm); }
  refreshIcon(m);
  if (flyTo) fly(toLL(m.x, m.y), Math.max(map.getZoom(), 4.5), { duration: 1.1, easeLinearity: 0.15 });
  renderCard(m);
}

function showCard(html) {
  const card = $("#card");
  card.classList.remove("leaving");
  card.hidden = false;
  card.style.animation = "none"; void card.offsetWidth; card.style.animation = "";
  $("#card-body").innerHTML = html;
}

function closeCard() {
  const card = $("#card");
  if (card.hidden) return;
  stopMove();
  card.classList.add("leaving");
  setTimeout(() => { card.hidden = true; card.classList.remove("leaving"); }, 300);
  const prev = selectedId;
  selectedId = null;
  const pm = state.markers.find((x) => x.id === prev);
  if (pm) refreshIcon(pm);
  removeGhost();
}
$("#card").addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeCard(); });

function renderCard(m) {
  const c = catById[m.cat];
  showCard(`<div class="card-hero" style="--c:${markerColor(m)}">
      <span class="card-badge">${ico(markerIcon(m))}${esc(c?.name || "Znacznik")}</span>
      <button class="fav-btn ${m.fav ? "on" : ""}" id="fav" title="Ulubione">${ico("star")}</button>
      <h3 class="card-title">${esc(m.name)}</h3>
      <div class="card-coords"><span>X <b>${m.x}</b></span><span>Y <b>${m.y}</b></span><button class="copy-btn" id="copy">Kopiuj</button><button class="copy-btn" id="share" title="Kod do wysłania znajomym">Kod</button></div>
      ${contactsHtml(m)}
    </div>
    <div class="card-sec voice-sec" data-vid="${m.id}">${m.voice ? `<audio controls preload="none" src="${voiceBase + esc(m.voice)}" style="width:100%;height:34px"></audio>` : ""}<button class="copy-btn" type="button" data-rec="${m.id}">${m.voice ? "Nagraj ponownie" : "Nagraj notatkę głosową"}</button></div>
    <div class="card-sec"><p class="card-note ${m.note ? "" : "muted"}">${m.note ? esc(m.note) : m.builtin ? "Punkt z oficjalnej mapy Majestic Wiki." : "Brak notatki."}</p></div>
    ${journalHtml(m)}
    <div class="card-sec shots-sec">
      <div class="shots-head"><span>Zrzuty ekranu</span><small>${(m.shots || []).length || ""}</small></div>
      <div class="shots" id="shots">${shotsHtml(m)}</div>
    </div>
    <div class="card-actions">
      <button class="btn ghost" id="edit">Edytuj</button>
      <button class="btn ghost" id="move">Przesuń</button>
      <button class="btn danger wide" id="del">${m.builtin ? "Usuń z mapy" : "Usuń znacznik"}</button>
    </div>`);
  $("#copy").onclick = () => copy(`${m.x}, ${m.y}`);
  $("#fav").onclick = () => { m.fav = !m.fav; save(); renderCats(); $("#fav").classList.toggle("on", m.fav); toast(m.fav ? "Dodano do ulubionych" : "Usunięto z ulubionych"); };
  $("#share").onclick = () => copy(shareCode(m), "Skopiowano kod znacznika. Kolega wkleja go w wyszukiwarkę (Ctrl+K)");
  document.querySelectorAll(".linked [data-contact]").forEach((b) => (b.onclick = () => Host.nav("kontakty", { select: b.dataset.contact })));
  $("#edit").onclick = () => renderForm(m);
  $("#move").onclick = (e) => toggleMove(m, e.currentTarget);
  $("#del").onclick = (e) => confirmDelete(m, e.currentTarget);
  bindShots(m);
  bindJournal(m);
}

/* ---------- zrzuty ekranu przy znacznikach ---------- */
let shotsBase = "";
const shotUrl = (n) => shotsBase + n;
const pendingShots = [];
const X_ICON = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

function shotsHtml(m) {
  const list = m.shots || [];
  return list.map((n, i) => `<button class="shot" data-i="${i}" style="--i:${i}" title="Powiększ"><img src="${shotUrl(n)}" alt="" loading="lazy"></button>`).join("") +
    (Host.available ? `<div class="shot-add">
      <button data-add="paste" title="Wklej ze schowka (Ctrl+V)">${ico("camera")}<span>Wklej</span></button>
      <button data-add="game" title="Wybierz z ostatnich zrzutów z gry (G)">Z gry</button>
      <button data-add="file" title="Wybierz plik z dysku">Z pliku</button>
    </div>` : `<p class="card-note muted">Zrzuty działają w aplikacji Majestic Companion.</p>`);
}
function refreshShots(m) {
  const box = $("#shots"); if (!box) return;
  box.innerHTML = shotsHtml(m);
  const head = document.querySelector(".shots-head small"); if (head) head.textContent = (m.shots || []).length || "";
  bindShots(m);
}
function addShots(m, names) {
  names = (names || []).filter(Boolean);
  if (!names.length) return;
  (m.shots ||= []).push(...names);
  save(); refreshShots(m);
  toast(names.length > 1 ? `Dodano zrzuty: ${names.length}` : "Dodano zrzut ekranu");
}
function bindShots(m) {
  const box = $("#shots"); if (!box) return;
  box.onclick = async (e) => {
    const sh = e.target.closest(".shot");
    if (sh) return openLightbox(m, +sh.dataset.i);
    const a = e.target.closest("[data-add]"); if (!a) return;
    try {
      if (a.dataset.add === "paste") addShots(m, [await pasteImage()]);
      if (a.dataset.add === "file") addShots(m, await Host.call("pick_image"));
      if (a.dataset.add === "game") openInbox(m);
    } catch (err) { toast("Nie udało się dodać zrzutu"); console.error(err); }
  };
}
const readFile = (f) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
async function pasteImage(clipboardData) {
  const item = clipboardData && [...clipboardData.items].find((i) => i.type.startsWith("image/"));
  if (item) return Host.call("import_image_data", await readFile(item.getAsFile()));
  const name = await Host.call("paste_clipboard_image");
  if (!name) toast("W schowku nie ma obrazka. Zrób zrzut (np. Win+Shift+S) i spróbuj jeszcze raz");
  return name;
}
document.addEventListener("paste", async (e) => {
  if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName) || !Host.available) return;
  const m = selectedId && state.markers.find((x) => x.id === selectedId);
  if (!m || $("#card").hidden || $("#mform")) return;
  e.preventDefault();
  addShots(m, [await pasteImage(e.clipboardData)]);
});
// przeciągnij obrazek z pulpitu na kartę znacznika
$("#card").addEventListener("dragover", (e) => { if ($("#shots")) { e.preventDefault(); $("#card").classList.add("drop"); } });
$("#card").addEventListener("dragleave", () => $("#card").classList.remove("drop"));
$("#card").addEventListener("drop", async (e) => {
  $("#card").classList.remove("drop");
  const m = selectedId && state.markers.find((x) => x.id === selectedId);
  if (!m || !Host.available) return;
  e.preventDefault();
  const names = [];
  for (const f of [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"))) {
    names.push(await Host.call("import_image_data", await readFile(f)).catch(() => null));
  }
  addShots(m, names);
});

/* podgląd zrzutu na pełnym ekranie */
let lb = null;
function openLightbox(m, i) {
  lb = { m, i };
  const el = document.createElement("div");
  el.id = "lightbox";
  el.innerHTML = `<img alt=""><div class="lb-bar"><span class="lb-count"></span>
    <button data-lb="prev" title="Poprzedni (←)"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
    <button data-lb="next" title="Następny (→)"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>
    <button data-lb="del" class="lb-del" title="Usuń zrzut">Usuń</button>
    <button data-lb="close" title="Zamknij (Esc)">${X_ICON}</button></div>`;
  document.body.appendChild(el);
  el.onclick = (e) => {
    const b = e.target.closest("[data-lb]");
    if (!b) { if (e.target === el) closeLightbox(); return; }
    ({ prev: () => stepLb(-1), next: () => stepLb(1), close: closeLightbox, del: delShot })[b.dataset.lb]();
  };
  drawLb();
}
function drawLb() {
  const el = $("#lightbox"); if (!el || !lb) return;
  const list = lb.m.shots || [];
  if (!list.length) return closeLightbox();
  lb.i = (lb.i + list.length) % list.length;
  const img = el.querySelector("img");
  img.classList.remove("in"); void img.offsetWidth;
  img.src = shotUrl(list[lb.i]); img.classList.add("in");
  el.querySelector(".lb-count").textContent = `${lb.i + 1} / ${list.length} · ${lb.m.name}`;
}
function stepLb(d) { if (lb) { lb.i += d; drawLb(); } }
function closeLightbox() {
  const el = $("#lightbox"); if (!el) return;
  el.classList.add("out"); setTimeout(() => el.remove(), 300); lb = null;
}
function delShot() {
  const b = $("#lightbox [data-lb=del]");
  if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Na pewno?"; return; }
  const [name] = lb.m.shots.splice(lb.i, 1);
  Host.call("delete_image", name).catch(() => {});
  save(); refreshShots(lb.m); toast("Usunięto zrzut");
  b.textContent = "Usuń"; delete b.dataset.armed;
  drawLb();
}

/* ostatnie zrzuty z gry (NVIDIA, Xbox Game Bar, Medal, Wycinanie) */
let inboxTarget = null;
async function openInbox(target) {
  if (!Host.available) return toast("Zrzuty z gry działają w aplikacji Majestic Companion");
  inboxTarget = target || null;
  const list = await Host.call("recent_screenshots", 0, 30).catch(() => []);
  $("#inbox")?.remove();
  const el = document.createElement("aside");
  el.id = "inbox";
  el.innerHTML = `<div class="ib-head"><div><h3>Zrzuty z gry</h3><p>${inboxTarget ? "Kliknij zrzut, żeby dodać go do: " + esc(inboxTarget.name) : "Kliknij zrzut, a potem miejsce na mapie"}</p></div>
    <button class="icon-btn" data-ib="close" title="Zamknij (Esc)">${X_ICON}</button></div>
    <div class="ib-grid">${list.length ? list.map((x, i) => `<button class="ib-shot" data-path="${esc(x.path)}" style="--i:${i}"><img src="${x.url}" loading="lazy" alt=""><span>${new Date(x.time).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></button>`).join("")
      : `<p class="ib-empty">Brak zrzutów z ostatnich 3 dni w folderach NVIDIA, Xbox Game Bar, Medal i Wycinanie. Zrób zrzut w grze albo wklej obrazek przez Ctrl+V na karcie znacznika.</p>`}</div>`;
  document.body.appendChild(el);
  el.onclick = async (e) => {
    if (e.target.closest("[data-ib=close]")) return closeInbox();
    const b = e.target.closest(".ib-shot"); if (!b) return;
    b.classList.add("busy");
    const name = await Host.call("import_image_file", b.dataset.path).catch(() => null);
    if (!name) { toast("Nie udało się wczytać zrzutu"); b.classList.remove("busy"); return; }
    closeInbox();
    if (inboxTarget) addShots(inboxTarget, [name]);
    else { pendingShots.push(name); startPlacing(); toast("Kliknij na mapie, gdzie zrobiłeś ten zrzut"); }
  };
}
function closeInbox() { const el = $("#inbox"); if (el) { el.classList.add("out"); setTimeout(() => el.remove(), 300); } }

/* ---------- tu jestem + najbliższe miejsca ---------- */
let meMarker = null, placingMe = false;
function setMe(latlng) {
  state.me = { x: Math.round(latlng.lng), y: Math.round(latlng.lat), at: Date.now() };
  save();
  drawMe(true);
  renderMeCard();
}
function drawMe(animate) {
  if (!state.me) return;
  const ll = toLL(state.me.x, state.me.y);
  const icon = L.divIcon({ className: "", iconSize: [48, 48], iconAnchor: [24, 24], html: `<div class="me ${animate ? "drop" : ""}"><i></i><i></i><b>TY</b></div>` });
  if (meMarker) meMarker.setLatLng(ll).setIcon(icon);
  else meMarker = L.marker(ll, { icon, zIndexOffset: 2000, keyboard: false }).addTo(map).on("click", renderMeCard);
}
function nearest(n) {
  const me = state.me; if (!me) return [];
  return state.markers.filter((m) => !state.hiddenCats.includes(m.cat))
    .map((m) => ({ m, d: Math.hypot(m.x - me.x, m.y - me.y) })).sort((a, b) => a.d - b.d).slice(0, n);
}
const fmtDist = (d) => d >= 1000 ? (d / 1000).toFixed(1).replace(".", ",") + " km" : Math.round(d) + " m";
function renderMeCard() {
  if (!state.me) return;
  const prev = selectedId; selectedId = null;
  const pm = prev && state.markers.find((x) => x.id === prev); if (pm) refreshIcon(pm);
  showCard(`<div class="card-hero" style="--c:#f5b544">
      <span class="card-badge">${ico("me")}Twoja pozycja</span>
      <h3 class="card-title">Tu jestem</h3>
      <div class="card-coords"><span>X <b>${state.me.x}</b></span><span>Y <b>${state.me.y}</b></span></div>
    </div>
    <div class="card-sec"><div class="shots-head"><span>Najbliżej Ciebie</span></div>
      <ul class="near place-list">${nearest(8).map(({ m, d }, i) => `<li><button class="place" data-id="${m.id}" style="--c:${markerColor(m)};--i:${i}"><i></i><span>${esc(m.name)}</span><small>${fmtDist(d)}</small></button></li>`).join("")}</ul></div>
    <div class="card-actions"><button class="btn ghost" id="me-move">Zmień pozycję</button><button class="btn ghost" id="me-del">Ukryj</button></div>`);
  document.querySelector(".near").onclick = (e) => { const p = e.target.closest(".place"); if (p) select(p.dataset.id, true); };
  $("#me-move").onclick = startMe;
  $("#me-del").onclick = () => { state.me = null; save(); if (meMarker) { map.removeLayer(meMarker); meMarker = null; } closeCard(); };
}
function startMe() {
  stopPlacing();
  closeCard();
  placingMe = true;
  $("#placing-hint .ph-text").textContent = "Kliknij na mapie, gdzie teraz jesteś w grze";
  $("#placing-hint").hidden = false;
  map.getContainer().classList.add("placing");
}
function stopMe() {
  placingMe = false;
  $("#placing-hint .ph-text").textContent = "Kliknij na mapie, gdzie postawić znacznik";
}


let moving = null;
function toggleMove(m, btn) {
  if (moving) return stopMove();
  const lm = leafletById.get(m.id);
  if (!lm) return;
  moving = lm;
  lm.dragging.enable();
  btn.textContent = "Gotowe";
  btn.classList.replace("ghost", "primary");
  toast("Przeciągnij znacznik w nowe miejsce");
}
function stopMove() {
  if (!moving) return;
  moving.dragging.disable();
  moving = null;
  const b = $("#move");
  if (b) { b.textContent = "Przesuń"; b.classList.replace("primary", "ghost"); }
}

function confirmDelete(m, btn) {
  if (btn.dataset.armed) {
    state.markers = state.markers.filter((x) => x.id !== m.id);
    removeLeaflet(m.id);
    selectedId = null;
    closeCard();
    renderCats();
    save();
    toast("Usunięto: " + m.name);
    return;
  }
  btn.dataset.armed = "1";
  btn.textContent = "Na pewno? Kliknij ponownie";
  setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = m.builtin ? "Usuń z mapy" : "Usuń znacznik"; } }, 3000);
}

/* ---------- dodawanie / edycja ---------- */
let placing = false;
let ghost = null;

function startPlacing() {
  placing = true;
  closeCard();
  $("#placing-hint").hidden = false;
  map.getContainer().classList.add("placing");
}
function stopPlacing() {
  placing = false;
  if (placingMe) stopMe();
  $("#placing-hint").hidden = true;
  map.getContainer().classList.remove("placing");
}
function removeGhost() { if (ghost) { map.removeLayer(ghost); ghost = null; } }

function newAt(latlng) {
  stopPlacing();
  const m = { id: null, cat: "moje", name: "", x: Math.round(latlng.lng), y: Math.round(latlng.lat), note: "", icon: "pin", color: "#ffffff" };
  removeGhost();
  ghost = L.marker(latlng, { icon: makeIcon(m), interactive: false }).addTo(map);
  renderForm(m);
}

function renderForm(m) {
  stopMove();
  const isNew = !m.id;
  const d = { ...m, icon: markerIcon(m), color: markerColor(m) };
  showCard(`<form class="form" id="mform" autocomplete="off">
      <h3>${isNew ? "Nowy znacznik" : "Edytuj znacznik"}</h3>
      <label class="field"><span>Nazwa</span><input name="name" maxlength="60" placeholder="np. Kryjówka, dom kumpla…" value="${esc(d.name)}"></label>
      <div class="field"><span>Kategoria</span><div class="chips" id="fcats">${cats.map((c) => `<button type="button" class="chip ${c.id === d.cat ? "on" : ""}" data-cat="${c.id}" style="--c:${c.color}">${ico(c.icon)}${esc(c.name)}</button>`).join("")}</div></div>
      <div class="field"><span>Ikona</span><div class="chips" id="ficons">${CUSTOM_ICONS.map((n) => `<button type="button" class="chip ${n === d.icon ? "on" : ""}" data-icon="${n}" style="--c:${d.color}" title="${n}">${ico(n)}</button>`).join("")}</div></div>
      <div class="field"><span>Kolor</span><div class="swatches" id="fsw">${SWATCHES.map((s) => `<button type="button" class="sw ${s === d.color ? "on" : ""}" data-c="${s}" style="--c:${s}" aria-label="Kolor ${s}"></button>`).join("")}</div></div>
      <label class="field"><span>Notatka</span><textarea name="note" maxlength="600" placeholder="Kody, godziny, z kim się spotkać…">${esc(d.note)}</textarea></label>
      <div class="card-coords" style="margin:0"><span>X <b>${d.x}</b></span><span>Y <b>${d.y}</b></span></div>
      <div class="form-actions">
        <button type="button" class="btn ghost" id="fcancel">Anuluj</button>
        <button type="submit" class="btn primary">${isNew ? "Postaw znacznik" : "Zapisz zmiany"}</button>
      </div>
    </form>`);
  const form = $("#mform");
  const preview = () => { if (ghost) ghost.setIcon(makeIcon({ ...d, builtin: false }, 0, "static")); };
  form.querySelector("#fcats").onclick = (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    d.cat = b.dataset.cat;
    if (catById[d.cat] && !catById[d.cat].custom) { d.color = catById[d.cat].color; d.icon = catById[d.cat].icon; syncPickers(); }
    form.querySelectorAll("#fcats .chip").forEach((x) => x.classList.toggle("on", x === b));
    preview();
  };
  form.querySelector("#ficons").onclick = (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    d.icon = b.dataset.icon; syncPickers(); preview();
  };
  form.querySelector("#fsw").onclick = (e) => {
    const b = e.target.closest(".sw"); if (!b) return;
    d.color = b.dataset.c; syncPickers(); preview();
  };
  function syncPickers() {
    form.querySelectorAll("#ficons .chip").forEach((x) => { x.classList.toggle("on", x.dataset.icon === d.icon); x.style.setProperty("--c", d.color); });
    form.querySelectorAll("#fsw .sw").forEach((x) => x.classList.toggle("on", x.dataset.c === d.color));
  }
  form.querySelector("#fcancel").onclick = () => { if (isNew) closeCard(); else renderCard(m); };
  form.onsubmit = (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    if (!name) {
      const f = form.name.closest(".field");
      f.classList.remove("err"); void f.offsetWidth; f.classList.add("err");
      form.name.focus();
      return;
    }
    const cat = catById[d.cat];
    const useCatLook = cat && !cat.custom && d.color === cat.color && d.icon === cat.icon;
    const data = { name, note: form.note.value.trim(), cat: d.cat, color: useCatLook ? undefined : d.color, icon: useCatLook ? undefined : d.icon };
    if (isNew) {
      const nm = { id: uid(), x: d.x, y: d.y, builtin: false, ...data, shots: pendingShots.splice(0) };
      state.markers.push(nm);
      removeGhost();
      addLeaflet(nm, 0);
      if (state.hiddenCats.includes(nm.cat)) setCatVisible(nm.cat, true);
      openCats.add(nm.cat);
      select(nm.id, false);
      toast("Dodano: " + name);
    } else {
      const catChanged = m.cat !== data.cat;
      Object.assign(m, data);
      if (catChanged) { removeLeaflet(m.id, false); addLeaflet(m, 0); }
      refreshIcon(m);
      renderCard(m);
      toast("Zapisano zmiany");
    }
    renderCats();
    save();
  };
  setTimeout(() => form.name.focus(), 80);
}

map.on("contextmenu", (e) => { if (drawing) return finishDraw(); newAt(e.latlng); });
map.on("click", (e) => {
  if (drawing) return;
  if (placingMe) { stopMe(); $("#placing-hint").hidden = true; map.getContainer().classList.remove("placing"); return setMe(e.latlng); }
  if (placing) newAt(e.latlng);
});
$("#add-btn").addEventListener("click", () => (placing ? stopPlacing() : startPlacing()));

/* ---------- HUD ---------- */
map.on("mousemove", (e) => {
  $("#cx").textContent = Math.round(e.latlng.lng);
  $("#cy").textContent = Math.round(e.latlng.lat);
});

/* ---------- eksport / import ---------- */
$("#export-btn").addEventListener("click", async () => {
  const data = JSON.stringify({ app: "majestic-mapa", version: 1, markers: state.markers.filter((m) => !m.builtin) }, null, 2);
  if (api()) {
    const path = await api().export_file(data);
    if (path) toast("Zapisano plik: " + path.split(/[\\/]/).pop());
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  a.download = "majestic-znaczniki.json";
  a.click();
  toast("Wyeksportowano Twoje znaczniki");
});
$("#import-btn").addEventListener("click", async () => {
  if (api()) { const txt = await api().import_file(); if (txt) importText(txt); return; }
  $("#import-file").click();
});
$("#import-file").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (f) importText(await f.text());
  e.target.value = "";
});
function importText(txt) {
  let list;
  try { list = JSON.parse(txt).markers; } catch { list = null; }
  if (!Array.isArray(list)) return toast("To nie jest plik ze znacznikami Majestic Mapa");
  let added = 0;
  for (const raw of list) {
    if (typeof raw?.x !== "number" || typeof raw?.y !== "number" || !raw.name) continue;
    if (state.markers.some((m) => m.name === raw.name && Math.abs(m.x - raw.x) < 2 && Math.abs(m.y - raw.y) < 2)) continue;
    const m = { id: uid(), cat: catById[raw.cat] ? raw.cat : "moje", name: String(raw.name).slice(0, 60), x: Math.round(raw.x), y: Math.round(raw.y), note: String(raw.note || "").slice(0, 600), color: raw.color, icon: raw.icon, builtin: false };
    state.markers.push(m);
    addLeaflet(m, added * 40);
    added++;
  }
  renderCats();
  save();
  toast(added ? `Zaimportowano ${added} znaczników` : "Wszystkie znaczniki z pliku już są na mapie");
}

/* ---------- drobiazgi ---------- */
function toast(text) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = `<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>${esc(text)}`;
  $("#toasts").appendChild(t);
  while ($("#toasts").children.length > 3) $("#toasts").firstChild.remove();
  setTimeout(() => { t.classList.add("bye"); setTimeout(() => t.remove(), 360); }, 2600);
}
async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); }
  catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
  toast(msg || "Skopiowano współrzędne " + text);
}

function setCollapsed(v) {
  document.body.classList.toggle("collapsed", v);
  setTimeout(moveGlider, 0);
}
$("#collapse").addEventListener("click", () => setCollapsed(true));
$("#expand").addEventListener("click", () => setCollapsed(false));
$("#styles").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-style]");
  if (b && b.dataset.style !== state.style) { setStyle(b.dataset.style); save(); }
});
window.addEventListener("resize", moveGlider);
document.fonts?.ready.then(moveGlider);

document.addEventListener("keydown", (e) => {
  const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCollapsed(false); $("#q").focus(); $("#q").select(); return; }
  if (e.key === "Escape") {
    if ($("#lightbox")) return closeLightbox();
    if ($("#inbox")) return closeInbox();
    if (placing) { pendingShots.splice(0); return stopPlacing(); }
    if (!$("#card").hidden) return closeCard();
  }
  if (typing) return;
  if (e.key === "Tab") { e.preventDefault(); setCollapsed(!document.body.classList.contains("collapsed")); }
  if ($("#lightbox") && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return stepLb(e.key === "ArrowLeft" ? -1 : 1);
  if (e.key.toLowerCase() === "n") startPlacing();
  if (e.key.toLowerCase() === "h") startMe();
  if (e.key.toLowerCase() === "r") startDraw("route");
  if (e.key.toLowerCase() === "z") startDraw("zone");
  if (e.key.toLowerCase() === "g" && Host.available) openInbox(null);
  if (e.key === "1") setStyle("satellite"), save();
  if (e.key === "2") setStyle("atlas"), save();
  if (e.key === "3") setStyle("road"), save();
});

/* ---------- start ---------- */
async function boot() {
  state = await loadState();
  setStyle(state.style, false);
  renderCats();
  loadWiki();
  renderDrawings();
  $(".intro-bar i").style.transform = "scaleX(1)";
  const go = () => {
    document.documentElement.style.setProperty("--in-delay", ".25s");
    $("#intro").classList.add("out");
    fly([-200, 0], 3, { duration: 2.2, easeLinearity: 0.12 });
    setTimeout(dropAll, 500);
  };
  if (Host.available) {
    Host.call("shots_base").then((b) => { shotsBase = b; }).catch(() => {});
    watchGameShots();
  }
  drawMe(false);
  const minIntro = new Promise((r) => setTimeout(r, Host.embedded ? 300 : 1600));
  const loaded = new Promise((r) => { tiles.once("load", r); setTimeout(r, 4000); });
  Promise.all([minIntro, loaded]).then(go);
}
// gdy grasz, co 20 s sprawdzamy, czy pojawił się nowy zrzut z gry
function watchGameShots() {
  let since = Date.now(), playing = false;
  Host.onGame((g) => { playing = g.running; });
  setInterval(async () => {
    if (!playing) return;
    const list = await Host.call("recent_screenshots", since, 5).catch(() => []);
    if (!list.length) return;
    since = Math.max(...list.map((x) => x.time));
    toast(`Nowy zrzut z gry (${list.length}). Naciśnij G, żeby dodać go do mapy`);
  }, 20000);
}
/* ---------- kody udostępniania ---------- */
function shareCode(m) {
  const d = { n: m.name, x: m.x, y: m.y, c: m.cat, t: m.note || undefined, i: m.icon, k: m.color };
  return "MJM:" + btoa(unescape(encodeURIComponent(JSON.stringify(d))));
}
function importCode(code) {
  let d;
  try { d = JSON.parse(decodeURIComponent(escape(atob(code.slice(4))))); } catch { return toast("Ten kod jest uszkodzony"); }
  if (typeof d.x !== "number" || typeof d.y !== "number" || !d.n) return toast("Ten kod jest uszkodzony");
  const m = { id: uid(), cat: catById[d.c] ? d.c : "moje", name: String(d.n).slice(0, 60), x: Math.round(d.x), y: Math.round(d.y),
    note: String(d.t || "").slice(0, 600), icon: d.i, color: d.k, builtin: false };
  state.markers.push(m);
  addLeaflet(m, 0);
  renderCats(); save();
  select(m.id, true);
  toast("Dodano znacznik z kodu: " + m.name);
}

/* ---------- kontakty przypięte do znacznika ---------- */
function contactsHtml(m) {
  let list = [];
  try { list = (JSON.parse(localStorage.getItem("majestic-kontakty-v1")) || {}).contacts || []; } catch {}
  const here = list.filter((c) => c.markerId === m.id);
  if (!here.length) return "";
  return `<div class="linked">${here.map((c) => `<button data-contact="${c.id}" title="Otwórz kontakt">${ico("me")}${esc(c.name)}</button>`).join("")}</div>`;
}
Host.onPayload((p) => {
  if (typeof p.search === "string") { setCollapsed(false); $("#q").value = p.search; $("#q").dispatchEvent(new Event("input")); $("#q").focus(); return; }
  if (Array.isArray(p.crewVault)) { if (crew) crewSend({ op: "vault", list: p.crewVault.slice(-300), by: crewNick() }); return; }
  if (p.crewShop) { if (crew) crewSend({ op: "shop", shop: p.crewShop, by: crewNick() }); return; }
  if (Array.isArray(p.goto)) { const ll = toLL(p.goto[0], p.goto[1]); fly(ll, 4); L.popup({ className: "cd-pop" }).setLatLng(ll).setContent(`<b>${esc(p.label || "Miejsce")}</b>`).openOn(map); return; }
  if (p.crewStore) { if (crew) crewSend({ op: "store", items: p.crewStore, events: p.crewSched || undefined, by: crewNick() }); return; }
  if (p.crewTimer) { if (!crew) return toast("Najpierw połącz się z mapą ekipy (Mapa → Mapa ekipy na żywo)"); crewSend({ op: "timer", name: String(p.crewTimer.name).slice(0, 40), min: Math.min(1440, +p.crewTimer.min || 0), by: crewNick() }); return; }
  if (p.select) { const m = state && state.markers.find((x) => x.id === p.select); if (m) select(m.id, true); else toast("Tego znacznika już nie ma na mapie"); }
});

/* ---------- warstwy z Majestic Wiki ---------- */
const WIKI = {
  captures: { name: "Terytoria gangów", color: "#ff5a6a" },
  treasure: { name: "Strefy skarbów", color: "#f5b544" },
  stash: { name: "Skrytki kontrabandy", color: "#b07cff" },
  gatherer: { name: "Zbieractwo", color: "#3ddc97" },
  mushroomer: { name: "Grzybiarz", color: "#c9a27a" },
  animal: { name: "Zwierzęta (polowanie)", color: "#a4e05a" },
  airdrop: { name: "Zrzuty zaopatrzenia", color: "#7fd1ff" },
  "game-zones": { name: "Strefy gry", color: "#2fd4d4" },
  "dmv-cameras": { name: "Fotoradary", color: "#ff8a3d" },
  atm: { name: "Bankomaty", color: "#22c55e" },
  biz: { name: "Biznesy do kupienia", color: "#eab308" },
  realty: { name: "Nieruchomości", color: "#60a5fa" },
};
const wikiGroups = {};
let wikiData = null;
const wikiRenderer = L.canvas({ padding: 0.3 });

// wiki podaje część nazw tylko po rosyjsku
const RU_PL = [[/Зона камер DMV/, "Fotoradar DMV"], [/Зона кладов/, "Strefa skarbów"], [/Игровая зона/, "Strefa gry"], [/^Аirdrop/, "Airdrop"], [/Регион сбора/, "Region zbieractwa"]];
const plName = (n) => RU_PL.reduce((t, [re, pl]) => t.replace(re, pl), n);
function buildWikiLayer(slug, items) {
  const cfg = WIKI[slug], g = L.layerGroup();
  const cf = slug === "captures" ? state.capFilter || "" : "";
  for (const it of items) {
    if (cf && it.t === "cell" && (cf === "free" ? it.o : String(it.o) !== cf)) continue;
    if (slug === "gatherer" && state.gathFilter && it.n !== state.gathFilter) continue;
    const label = it.n ? esc(plName(it.n)) : cfg.name;
    if (it.t === "cell") {
      const [x, y, h] = it.c;
      // wybrana „moja rodzina”: swoje pola zielone, cudze czerwone, wolne szare
      const fam = state.myFam ? (String(it.o) === String(state.myFam) ? "#22c55e" : it.o ? "#ef4444" : "#94a3b8") : null;
      const col = fam || it.oc || "#ffffff";
      L.rectangle([[y - h, x - h], [y + h, x + h]], { renderer: wikiRenderer, color: col, weight: 0.6, opacity: it.o ? 0.5 : 0.15,
        fillColor: col, fillOpacity: it.o ? 0.28 : 0.03 })
        .bindTooltip(`${it.n ? label + " · " : ""}${it.o ? "Rodzina #" + it.o : "Wolne pole"}${state.terrNotes?.[x + "," + y] ? " · notatka: " + esc(state.terrNotes[x + "," + y].t.slice(0, 60)) : ""}`, { className: "mk-tip", sticky: true })
        .on("click", (e) => terrPopup(x + "," + y, `${it.n ? label + " · " : ""}${it.o ? "Rodzina #" + it.o : "Wolne pole"}`, e.latlng)).addTo(g);
    } else if (it.t === "g") {
      L.polygon(it.c.map(([x, y]) => [y, x]), { renderer: wikiRenderer, color: (slug === "gatherer" && GATH_COL[it.n]) || it.col || cfg.color, weight: 1.5, fillOpacity: 0.18 })
        .bindTooltip(label, { className: "mk-tip", sticky: true })
        .on("click", (e) => { if (slug === "gatherer" && GATH_COL[it.n]) cooldownPopup(it, e.latlng); }).addTo(g);
    } else if (it.t === "p" && slug !== "captures") {
      L.circleMarker([it.c[1], it.c[0]], { renderer: wikiRenderer, radius: 6, color: "#0d0f14", weight: 2, fillColor: cfg.color, fillOpacity: 1 })
        .bindTooltip(label, { className: "mk-tip", direction: "top" }).addTo(g);
    }
  }
  return g;
}
function renderWikiPanel() {
  const on = state.wikiOn || [];
  const layers = wikiData ? wikiData.layers : {};
  $("#wiki-layers").innerHTML = Object.entries(WIKI).map(([slug, cfg], i) => {
    const n = (layers[slug] || []).filter((it) => slug !== "captures" || it.t === "cell").length;
    const isOn = on.includes(slug);
    return `<li class="cat ${isOn ? "on" : ""} ${n ? "" : "disabled"}" data-wiki="${slug}" style="--c:${cfg.color};--i:${i}">
      <div class="cat-row"><span class="cat-open"><span class="cat-dot">${ico(slug === "dmv-cameras" ? "camera" : "flag")}</span>
      <span class="cat-name">${cfg.name}</span><span class="cat-count">${n || "–"}</span></span>
      <button class="switch" role="switch" aria-checked="${isOn}" ${n ? "" : "disabled"} title="${n ? "Pokaż lub ukryj" : "Najpierw kliknij Aktualizuj"}"></button></div></li>`;
  }).join("") + capFilterHtml() + (typeof myFamHtml === "function" ? myFamHtml() : "") + (typeof terrChangesHtml === "function" ? terrChangesHtml() : "") + gathFilterHtml();
  $("#wiki-meta").textContent = !Host.available ? "Warstwy z wiki działają w aplikacji Majestic Companion."
    : wikiData ? `Serwer ${wikiData.server} · pobrano ${new Date(wikiData.at).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
    : "Kliknij Aktualizuj, żeby pobrać warstwy (ok. 30 s, potrzebny internet).";
}
function setWikiVisible(slug, show) {
  state.wikiOn = (state.wikiOn || []).filter((s) => s !== slug);
  if (show) state.wikiOn.push(slug);
  if (show && !wikiGroups[slug] && wikiData?.layers[slug]) wikiGroups[slug] = buildWikiLayer(slug, wikiData.layers[slug]);
  const g = wikiGroups[slug];
  if (g) show ? g.addTo(map) : map.removeLayer(g);
  save(); renderWikiPanel();
}
$("#wiki-layers").addEventListener("change", (e) => {
  if (e.target.id === "gath-filter") {
    state.gathFilter = e.target.value;
    if (wikiGroups.gatherer) { map.removeLayer(wikiGroups.gatherer); delete wikiGroups.gatherer; }
    return setWikiVisible("gatherer", true);
  }
  if (e.target.id !== "cap-filter") return;
  state.capFilter = e.target.value;
  if (wikiGroups.captures) { map.removeLayer(wikiGroups.captures); delete wikiGroups.captures; }
  setWikiVisible("captures", true);
});
$("#wiki-layers").addEventListener("click", (e) => {
  if (e.target.closest(".cap-filter")) return;
  const li = e.target.closest("[data-wiki]");
  if (!li || li.classList.contains("disabled")) return;
  setWikiVisible(li.dataset.wiki, !(state.wikiOn || []).includes(li.dataset.wiki));
});
async function loadWiki() {
  if (!Host.available) return renderWikiPanel();
  try { const raw = await Host.call("wiki_layers"); wikiData = raw ? JSON.parse(raw) : null; } catch { wikiData = null; }
  // bankomaty, biznesy i nieruchomości z list wiki (mają pozycję na mapie)
  try {
    const [biz, re] = await Promise.all([Host.call("wiki_list", "businesses"), Host.call("wiki_list", "realties")]);
    const $$ = (n) => "$" + Math.round(n).toLocaleString("pl-PL");
    const pt = (x, n) => (Array.isArray(x.mapPosition) ? { t: "p", c: x.mapPosition, n } : null);
    const RT = { house: "Dom", apartment: "Mieszkanie", office: "Biuro", warehouse: "Magazyn" };
    wikiData ||= { layers: {} };
    wikiData.layers.atm = (biz?.items || []).filter((b) => b.type === "atm").map((b) => pt(b, `${b.name}${b.buyPrice ? " · " + $$(b.buyPrice) : ""}`)).filter(Boolean);
    wikiData.layers.biz = (biz?.items || []).filter((b) => b.type !== "atm").map((b) => pt(b, `${b.name || b.slug}${b.buyPrice ? " · " + $$(b.buyPrice) : ""}`)).filter(Boolean);
    wikiData.layers.realty = (re?.items || []).map((r) => pt(r, `${RT[r.type] || r.type} #${r.serial}${r.price ? " · " + $$(r.price) : ""}${r.garageSlots ? " · garaż " + r.garageSlots : ""}`)).filter(Boolean);
  } catch {}
  Object.keys(wikiGroups).forEach((k) => { map.removeLayer(wikiGroups[k]); delete wikiGroups[k]; });
  renderWikiPanel();
  (state.wikiOn || []).forEach((s) => setWikiVisible(s, true));
}
$("#wiki-sync").addEventListener("click", async (e) => {
  if (!Host.available) return toast("Aktualizacja z wiki działa w aplikacji Majestic Companion");
  const b = e.currentTarget;
  if (b.disabled) return;
  b.disabled = true; b.textContent = "Pobieram…";
  toast("Pobieram warstwy z Majestic Wiki. To potrwa ok. 30 sekund");
  try {
    const st = await Host.call("get_settings");
    const r = await Host.call("wiki_sync", st.server || "PL1");
    if (r.ok) toast(`Pobrano warstwy: ${Object.keys(r.counts).length}${r.errors.length ? " (bez " + r.errors.length + ")" : ""}`);
    else toast("Nie udało się pobrać warstw. Sprawdź internet i spróbuj ponownie");
    await loadWiki();
  } catch { toast("Nie udało się pobrać warstw z wiki"); }
  b.disabled = false; b.textContent = "Aktualizuj";
});

/* ---------- trasy i strefy rysowane na mapie ---------- */
const drawGroup = L.layerGroup().addTo(map);
let drawing = null;   // { kind: "route" | "zone", pts: [[lat,lng]], preview }
const DRAW_COLORS = ["#f5b544", "#ff5a6a", "#4d8dff", "#3ddc97", "#b07cff", "#2fd4d4"];
/* czas i koszt paliwa trasy z ustawień (km/h, l/100 km, $/l); trasa w grze jest dłuższa niż prosta, stąd ×1,3 */
const FUEL_DEF = { kmh: 90, l100: 12, price: 4 };
function tripInfo(m) { const f = { ...FUEL_DEF, ...(state?.fuel || {}) }, km = (m * 1.3) / 1000; return `~${Math.max(1, Math.round((km / f.kmh) * 60))} min, ~$${Math.round((km * f.l100 / 100) * f.price)}`; }
const dist = (pts) => pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
const area = (pts) => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[1] * q[0] - q[1] * p[0]; }, 0) / 2);

function drawShape(d, group = drawGroup) {
  const ll = d.pts;
  const layer = d.kind === "route"
    ? L.polyline(ll, { color: d.color, weight: 4, dashArray: "10 8", className: "route-line" })
    : L.polygon(ll, { color: d.color, weight: 2, fillOpacity: 0.2, className: "zone-shape" });
  const info = d.kind === "route" ? fmtDist(dist(ll)) : Math.round(area(ll) / 1000) / 1000 + " km²";
  if (d.name) layer.bindTooltip(`${esc(d.name)} · ${info}`, { className: "mk-tip", sticky: true });
  return layer.addTo(group);
}
function renderDrawings() {
  if (!document.getElementById("fuel-form")) {
    const f = document.createElement("form"); f.id = "fuel-form"; f.autocomplete = "off"; f.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;font-size:12px;align-items:center";
    const v = { ...FUEL_DEF, ...(state.fuel || {}) };
    f.innerHTML = `<small style="width:100%;color:var(--text-3)">Czas i paliwo tras:</small><label>km/h <input name="kmh" type="number" min="10" max="300" value="${v.kmh}" style="width:58px"></label><label>l/100 <input name="l100" type="number" min="1" max="60" value="${v.l100}" style="width:52px"></label><label>$/l <input name="price" type="number" min="0" max="100" step="0.1" value="${v.price}" style="width:56px"></label>`;
    f.addEventListener("change", () => { state.fuel = { kmh: +f.kmh.value || FUEL_DEF.kmh, l100: +f.l100.value || FUEL_DEF.l100, price: +f.price.value || 0 }; save(); renderDrawings(); });
    $("#draw-list").after(f);
  }  drawGroup.clearLayers();
  const hid = state.hiddenGrp || [];
  (state.drawings || []).filter((d) => !hid.includes(d.grp || "")).forEach((d) => drawShape(d));
  const list = (state.drawings || []).filter((d) => !state.showGrp || (d.grp || "") === state.showGrp);
  renderGroups();
  $("#draw-list").innerHTML = list.length ? list.map((d, i) => `<li><button class="place" data-draw="${d.id}" style="--c:${d.color};--i:${i}"><i></i>

      <span>${esc(d.name)}</span><small>${d.kind === "route" ? fmtDist(dist(d.pts)) + " · " + tripInfo(dist(d.pts)) : "strefa"}</small></button>
      ${d.kind === "route" && d.pts.length > 2 ? `<button class="draw-del" data-opt-draw="${d.id}" title="Ustaw punkty w najkrótszej kolejności (od pierwszego)"><svg viewBox="0 0 24 24"><path d="M4 17l5-5 4 4 7-7M14 9h6v6"/></svg></button>` : ""}
      <button class="draw-del" data-del-draw="${d.id}" title="Usuń"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></li>`).join("")
    : `<li class="empty">Narysuj trasę (R) albo strefę (Z).</li>`;
}
function startDraw(kind) {
  stopPlacing(); closeCard(); cancelDraw();
  drawing = { kind, pts: [], color: DRAW_COLORS[(state.drawings || []).length % DRAW_COLORS.length], preview: L.layerGroup().addTo(map) };
  $("#placing-hint .ph-text").textContent = kind === "route"
    ? "Klikaj kolejne punkty trasy. Enter kończy, Backspace cofa"
    : "Klikaj rogi strefy. Enter kończy, Backspace cofa";
  $("#placing-hint").hidden = false;
  map.getContainer().classList.add("placing");
  map.doubleClickZoom.disable();
}
function redrawPreview() {
  if (!drawing) return;
  drawing.preview.clearLayers();
  if (drawing.pts.length) drawShape({ ...drawing, name: "" }, drawing.preview);
  drawing.pts.forEach((p) => L.circleMarker(p, { radius: 5, color: "#0d0f14", weight: 2, fillColor: drawing.color, fillOpacity: 1 }).addTo(drawing.preview));
  const n = drawing.pts.length;
  if (n > 1) $("#placing-hint .ph-text").textContent = drawing.kind === "route" ? `Trasa: ${fmtDist(dist(drawing.pts))} · Enter kończy` : `${n} rogi · Enter kończy`;
}
function cancelDraw() {
  if (!drawing) return;
  map.removeLayer(drawing.preview);
  drawing = null;
  map.doubleClickZoom.enable();
  $("#placing-hint").hidden = true;
  $("#placing-hint .ph-text").textContent = "Kliknij na mapie, gdzie postawić znacznik";
  map.getContainer().classList.remove("placing");
}
function finishDraw() {
  const d = drawing;
  if (!d) return;
  const min = d.kind === "route" ? 2 : 3;
  if (d.pts.length < min) return toast(d.kind === "route" ? "Trasa potrzebuje co najmniej 2 punktów" : "Strefa potrzebuje co najmniej 3 rogów");
  const n = (state.drawings || []).filter((x) => x.kind === d.kind).length + 1;
  const item = { id: uid(), kind: d.kind, pts: d.pts.map(([a, b]) => [Math.round(a), Math.round(b)]), color: d.color, name: (d.kind === "route" ? "Trasa " : "Strefa ") + n, grp: state.curGrp || "" };
  (state.drawings ||= []).push(item);
  cancelDraw(); save(); renderDrawings();
  toast(d.kind === "route" ? `Zapisano trasę: ${fmtDist(dist(item.pts))}` : "Zapisano strefę");
}
map.on("click", (e) => { if (drawing) { drawing.pts.push([e.latlng.lat, e.latlng.lng]); redrawPreview(); } });
$("#draw-route").addEventListener("click", () => startDraw("route"));
$("#draw-zone").addEventListener("click", () => startDraw("zone"));
$("#draw-list").addEventListener("click", (e) => {
  const del = e.target.closest("[data-del-draw]");
  if (del) { state.drawings = state.drawings.filter((d) => d.id !== del.dataset.delDraw); save(); renderDrawings(); return toast("Usunięto"); }
  const b = e.target.closest("[data-draw]");
  const d = b && state.drawings.find((x) => x.id === b.dataset.draw);
  if (d) map.flyToBounds(L.latLngBounds(d.pts), { padding: [80, 80], duration: 1 });
});
document.addEventListener("keydown", (e) => {
  if (!drawing || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
  if (e.key === "Enter") { e.preventDefault(); finishDraw(); }
  if (e.key === "Backspace") { e.preventDefault(); drawing.pts.pop(); redrawPreview(); }
  if (e.key === "Escape") { e.stopImmediatePropagation(); cancelDraw(); }
}, true);

/* ---------- dziennik przy znaczniku ---------- */
function journalHtml(m) {
  const list = (m.log || []).slice().reverse();
  return `<div class="card-sec"><div class="shots-head"><span>Dziennik</span><small>${list.length || ""}</small></div>
    <form class="jr-add" id="jr-form"><input id="jr-in" maxlength="160" placeholder="np. skrytka pusta, ktoś tu stał…"><button class="copy-btn">Dodaj</button></form>
    <ul class="jr">${list.slice(0, 8).map((l) => `<li><time>${new Date(l.at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</time><span>${esc(l.t)}</span></li>`).join("")}</ul></div>`;
}
function bindJournal(m) {
  const f = $("#jr-form"); if (!f) return;
  f.onsubmit = (e) => {
    e.preventDefault();
    const t = $("#jr-in").value.trim(); if (!t) return;
    (m.log ||= []).push({ at: Date.now(), t });
    save(); renderCard(m);
    setTimeout(() => $("#jr-in")?.focus(), 30);
  };
}

/* ---------- filtr terytoriów ---------- */
/* zbieractwo: kraby (owoce morza), wodorosty, jagody, zioła — osobne kolory i filtr */
const GATH_COL = { "Wodorosty": "#3ddc97", "Owoce morza": "#ff8a3d", "Jagody": "#b07cff", "Zioła": "#c6e04a" };
function gathFilterHtml() {
  const items = wikiData?.layers?.gatherer || [];
  if (!items.length || !(state.wikiOn || []).includes("gatherer")) return "";
  const kinds = {};
  items.forEach((it) => { if (GATH_COL[it.n]) kinds[it.n] = (kinds[it.n] || 0) + 1; });
  const f = state.gathFilter || "";
  return `<li class="cap-filter"><select id="gath-filter" aria-label="Filtr zbieractwa">
    <option value="">Wszystko do zbierania</option>
    ${Object.entries(kinds).map(([n, c]) => `<option value="${n}" ${f === n ? "selected" : ""}>${n === "Owoce morza" ? "Owoce morza (kraby)" : n === "Wodorosty" ? "Wodorosty (glony)" : n} · ${c}</option>`).join("")}
  </select><button class="gath-route" type="button" data-gath-route>Wyznacz trasę przez te strefy</button></li>`;
}
function capFilterHtml() {
  const cells = (wikiData?.layers?.captures || []).filter((c) => c.t === "cell");
  if (!cells.length || !(state.wikiOn || []).includes("captures")) return "";
  const fams = {};
  cells.forEach((c) => { if (c.o) (fams[c.o] ||= { n: 0, col: c.oc }).n++; });
  const f = state.capFilter || "";
  return `<li class="cap-filter"><select id="cap-filter" aria-label="Filtr terytoriów">
    <option value="">Wszystkie terytoria</option><option value="free" ${f === "free" ? "selected" : ""}>Tylko wolne pola</option>
    ${Object.entries(fams).sort((a, b) => b[1].n - a[1].n).map(([id, v]) => `<option value="${id}" ${f === id ? "selected" : ""}>Rodzina #${id} · ${v.n} pól</option>`).join("")}
  </select></li>`;
}

/* ---------- grupowanie znaczników przy oddaleniu ---------- */
const clusterLayer = L.layerGroup().addTo(map);
let clustering = false, clusterTimer = 0;
function recluster() {
  clustering = true;
  clusterLayer.clearLayers();
  document.querySelectorAll(".leaflet-marker-icon.in-cluster").forEach((el) => el.classList.remove("in-cluster"));
  if (map.getZoom() < 4) {
    const cells = new Map(), size = 72;
    for (const lm of leafletById.values()) {
      if (!map.hasLayer(lm)) continue;
      const p = map.latLngToLayerPoint(lm.getLatLng()), k = Math.floor(p.x / size) + ":" + Math.floor(p.y / size);
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push(lm);
    }
    for (const list of cells.values()) {
      if (list.length < 2) continue;
      list.forEach((lm) => lm.getElement()?.classList.add("in-cluster"));
      const lat = list.reduce((a, m) => a + m.getLatLng().lat, 0) / list.length, lng = list.reduce((a, m) => a + m.getLatLng().lng, 0) / list.length;
      const sz = list.length > 30 ? 46 : list.length > 10 ? 40 : 34;
      L.marker([lat, lng], { keyboard: false, icon: L.divIcon({ className: "", iconSize: [sz, sz], html: `<div class="clu" style="--s:${sz}px"><b>${list.length}</b></div>` }) })
        .bindTooltip(`${list.length} miejsc · kliknij, żeby przybliżyć`, { className: "mk-tip", direction: "top" })
        .on("click", () => map.flyTo([lat, lng], Math.min(map.getZoom() + 1.5, 5), { duration: 0.6 }))
        .addTo(clusterLayer);
    }
  }
  clustering = false;
}
const scheduleCluster = () => { clearTimeout(clusterTimer); clusterTimer = setTimeout(recluster, 80); };
map.on("zoomend moveend", scheduleCluster);
map.on("layeradd layerremove", (e) => { if (!clustering && e.layer instanceof L.Marker && !clusterLayer.hasLayer(e.layer)) scheduleCluster(); });
scheduleCluster();

/* ---------- trasa zbierania przez strefy wybranego typu ---------- */
function gatherRoute() {
  const f = state.gathFilter || "";
  const items = (wikiData?.layers?.gatherer || []).filter((it) => GATH_COL[it.n] && (!f || it.n === f));
  // środek strefy w układzie mapy [lat=y, lng=x]
  let left = items.map((it) => it.t === "g"
    ? [it.c.reduce((a, p) => a + p[1], 0) / it.c.length, it.c.reduce((a, p) => a + p[0], 0) / it.c.length]
    : [it.c[1], it.c[0]]);
  if (left.length < 2) return toast("Za mało stref, żeby wyznaczyć trasę");
  const label = f === "Owoce morza" ? "kraby" : f === "Wodorosty" ? "glony" : (f || "zbieractwo").toLowerCase();
  routeThrough(left, "Zbieranie: " + label, GATH_COL[f] || "#22c55e", "stref");
}
function routeThrough(left, name, color, what) {
  // najbliższy sąsiad od strefy najbardziej na zachód: prosto i wystarczająco dobrze dla kilkunastu punktów
  left.sort((a, b) => a[1] - b[1]);
  const pts = [left.shift()];
  while (left.length) {
    const last = pts[pts.length - 1];
    let bi = 0, bd = Infinity;
    left.forEach((p, i) => { const d = Math.hypot(p[0] - last[0], p[1] - last[1]); if (d < bd) { bd = d; bi = i; } });
    pts.push(left.splice(bi, 1)[0]);
  }
  const item = { id: uid(), kind: "route", pts: pts.map(([a, b]) => [Math.round(a), Math.round(b)]), color, name, grp: state.curGrp || "" };
  (state.drawings ||= []).push(item);
  save(); renderDrawings();
  map.flyToBounds(L.latLngBounds(item.pts), { padding: [80, 80], duration: 1 });
  toast(`Trasa przez ${pts.length} ${what}: ${fmtDist(dist(item.pts))}. Zapisana w „Trasy i strefy”`);
}
$("#fav-route").addEventListener("click", () => {
  const favs = state.markers.filter((m) => m.fav);
  if (favs.length < 2) return toast("Dodaj do ulubionych co najmniej 2 miejsca");
  routeThrough(favs.map((m) => [m.y, m.x]), "Objazd ulubionych", "#f59e0b", "miejsc");
});
$("#wiki-layers").addEventListener("click", (e) => { if (e.target.closest("[data-gath-route]")) gatherRoute(); });

/* ---------- przypomnienie o odnowieniu strefy zbierania ---------- */
function rebuildCaptures() { if (wikiGroups.captures) { const on = map.hasLayer(wikiGroups.captures); map.removeLayer(wikiGroups.captures); delete wikiGroups.captures; if (on) setWikiVisible("captures", true); } }
/* notatki do terytoriów: kto trzymał, kiedy wojna; termin wojny ustawia minutnik */
function terrPopup(key, title, ll) {
  const n = (state.terrNotes ||= {})[key] || { t: "", war: "" };
  L.popup({ className: "cd-pop", offset: [0, -4] }).setLatLng(ll).setContent(
    `<b>${title}</b><textarea id="tn-t" rows="3" maxlength="300" placeholder="Kto trzymał, co się działo…" aria-label="Notatka do terytorium" style="width:100%;margin:6px 0">${esc(n.t)}</textarea>
     <label style="display:grid;gap:3px;font-size:12px">Wojna o to pole <input type="datetime-local" id="tn-war" value="${esc(n.war)}"></label>
     <div class="cd-btns" style="margin-top:6px"><button data-tn="${esc(key)}">Zapisz</button>${n.t || n.war ? `<button data-tn-del="${esc(key)}">Usuń</button>` : ""}</div>`).openOn(map);
}
map.getContainer().addEventListener("click", (e) => {
  const s = e.target.closest("[data-tn]"), d = e.target.closest("[data-tn-del]");
  if (d) { delete state.terrNotes[d.dataset.tnDel]; save(); map.closePopup(); rebuildCaptures(); return toast("Usunięto notatkę"); }
  if (!s) return;
  const t = document.getElementById("tn-t").value.trim(), war = document.getElementById("tn-war").value;
  state.terrNotes[s.dataset.tn] = { t, war }; save(); map.closePopup();
  const min = war ? Math.round((new Date(war).getTime() - Date.now()) / 60000) - 15 : 0;
  if (min > 0) window.parent.postMessage({ __toTimers: { name: "Wojna o terytorium za 15 min", min } }, "*");
  rebuildCaptures();
  toast(min > 0 ? "Zapisano. Przypomnę 15 minut przed wojną" : "Zapisano notatkę");
});
function cooldownPopup(it, ll) {
  const name = plName(it.n);
  L.popup({ className: "cd-pop", offset: [0, -4] }).setLatLng(ll).setContent(
    `<b>${esc(name)}</b><p>Wyzbierane? Przypomnę, kiedy strefa się odnowi.</p>
     <div class="cd-btns">${[15, 30, 60, 120].map((m) => `<button data-cd="${m}" data-cd-name="${esc(name)}">${m >= 60 ? m / 60 + " h" : m + " min"}</button>`).join("")}</div>`).openOn(map);
}
map.getContainer().addEventListener("click", (e) => {
  const b = e.target.closest("[data-cd]"); if (!b) return;
  const min = +b.dataset.cd, name = b.dataset.cdName + " · odnowienie";
  let timers = [];
  try { timers = JSON.parse(localStorage.getItem("majestic-minutniki-v1")) || []; } catch {}
  timers.push({ id: uid(), name, dur: min * 60000, end: Date.now() + min * 60000, rep: false, c: "#22c55e" });
  try { localStorage.setItem("majestic-minutniki-v1", JSON.stringify(timers)); } catch {}
  window.parent.postMessage({ __reload: "minutniki" }, "*");  // zakładka Minutniki wczyta nowy minutnik
  map.closePopup();
  toast(`Przypomnę za ${min >= 60 ? min / 60 + " h" : min + " min"}: ${b.dataset.cdName}`);
});

/* ---------- zdjęcie mapy do schowka ---------- */
const PhotoCtl = L.Control.extend({
  options: { position: "bottomright" },
  onAdd() {
    const b = L.DomUtil.create("button", "photo-ctl");
    b.type = "button"; b.title = "Zdjęcie mapy: zapis i kopia do schowka (wklej na Discordzie)"; b.setAttribute("aria-label", "Zdjęcie mapy");
    b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
    L.DomEvent.disableClickPropagation(b);
    b.onclick = async () => {
      if (!Host.available) return toast("Zdjęcie mapy działa w aplikacji");
      try {
        const r = await Host.call("capture_map");
        toast(r.copied ? "Zdjęcie skopiowane. Wklej na Discordzie (Ctrl+V)" : "Zapisano zdjęcie w Obrazy/Majestic");
      } catch { toast("Nie udało się zrobić zdjęcia"); }
    };
    return b;
  },
});
new PhotoCtl().addTo(map);

/* ---------- najkrótsza kolejność punktów trasy (kurier) ---------- */
$("#draw-list").addEventListener("click", (e) => {
  const b = e.target.closest("[data-opt-draw]"); if (!b) return;
  e.stopPropagation();
  const d = state.drawings.find((x) => x.id === b.dataset.optDraw); if (!d) return;
  const before = dist(d.pts), left = d.pts.slice(1), out = [d.pts[0]];
  while (left.length) {
    const l = out[out.length - 1];
    let bi = 0, bd = Infinity;
    left.forEach((p, i) => { const dd = Math.hypot(p[0] - l[0], p[1] - l[1]); if (dd < bd) { bd = dd; bi = i; } });
    out.push(left.splice(bi, 1)[0]);
  }
  if (dist(out) >= before) return toast("Ta trasa już ma najkrótszą kolejność");
  d.pts = out; save(); renderDrawings();
  toast(`Krótsza trasa: ${fmtDist(dist(out))} zamiast ${fmtDist(before)}`);
}, true);

/* ---------- pasek ulubionych na mapie ---------- */
function renderFavbar() {
  const favs = (state?.markers || []).filter((m) => m.fav).slice(0, 10);
  const bar = $("#favbar");
  bar.hidden = !favs.length;
  bar.innerHTML = favs.map((m) => `<button data-fav="${m.id}" style="--c:${markerColor(m)}" title="${esc(m.name)}"><i></i>${esc(m.name)}</button>`).join("");
}
$("#favbar").addEventListener("click", (e) => { const b = e.target.closest("[data-fav]"); if (b) select(b.dataset.fav, true); });
const _renderCats = renderCats;
renderCats = function () { _renderCats.apply(this, arguments); renderFavbar(); };
renderFavbar();

/* ---------- zmiany terytoriów od ostatniej aktualizacji wiki ---------- */
let terrHist = [];
async function loadTerrHist() { if (Host.available) { try { terrHist = await Host.call("wiki_history") || []; } catch {} if (state) renderWikiPanel(); } }
function terrChangesHtml() {
  if (!(state.wikiOn || []).includes("captures")) return "";
  const last = terrHist[terrHist.length - 1];
  if (!last) return `<li class="terr-ch"><small>Zmiany terytoriów pojawią się po następnym „Aktualizuj”.</small></li>`;
  const ch = Object.entries(last.diff || {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 6);
  const when = new Date(last.at).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return `<li class="terr-ch"><b>Zmiany terytoriów</b><small>od poprzedniej aktualizacji · ${when}</small>
    ${ch.length ? `<ul>${ch.map(([f, n]) => `<li><span>Rodzina #${esc(f)}</span><em class="${n > 0 ? "up" : "down"}">${n > 0 ? "+" : ""}${n} pól</em></li>`).join("")}</ul>` : `<small>Bez zmian.</small>`}</li>`;
}
loadTerrHist();

/* ---------- wspólna mapa ekipy na żywo (ntfy.sh, szyfrowane kodem ekipy) ---------- */
// Serwer ntfy.sh trzyma wiadomości ok. 12 h, więc nowa osoba prosi resztę o pełną listę ("hello").
const CREW_KEY = "majestic-ekipa-mapa-v1";
const crewId = Math.random().toString(36).slice(2, 10);
let crew = null;           // { topic, key, es, sent: Map(id -> json) }
const SYNC_FIELDS = ["id", "cat", "name", "x", "y", "note", "color", "icon"];
const crewView = (m) => Object.fromEntries(SYNC_FIELDS.filter((k) => m[k] !== undefined).map((k) => [k, m[k]]));
const b64 = { enc: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))), dec: (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) };

async function crewKeys(code) {
  const raw = new TextEncoder().encode("majestic-crew:" + code.trim().toLowerCase());
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", raw));
  const topic = "mjc" + [...hash.slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const key = await crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", new Uint8Array([...raw, 1])), "AES-GCM", false, ["encrypt", "decrypt"]);
  return { topic, key };
}
async function crewSend(obj) {
  if (!crew) return;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, crew.key, new TextEncoder().encode(JSON.stringify({ ...obj, from: crewId })));
  try { await fetch("https://ntfy.sh/" + crew.topic, { method: "POST", body: b64.enc(iv) + "." + b64.enc(data) }); } catch {}
}
async function crewOpen(msg) {
  const [iv, data] = String(msg).split(".");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64.dec(iv) }, crew.key, b64.dec(data));
  return JSON.parse(new TextDecoder().decode(plain));
}
function crewApply(ev) {
  if (!ev || ev.from === crewId) return;
  if (ev.op === "hello") { crewPing(); const t = U.load(CREW_KEY, {}).team; if (t) crewSend({ op: "team", team: t }); return crewSnapshot(); }
  if (ev.op === "ping") { crewSeen[String(ev.by || "?").slice(0, 24)] = { t: Date.now(), on: !!ev.on, srv: String(ev.srv || "").slice(0, 20), h: +ev.h || 0, net: +ev.net || 0, rate: +ev.rate || 0, best: String(ev.best || "").slice(0, 24) }; return renderCrewPeople(); }
  if (ev.op === "team" && ev.team) { const t = { name: String(ev.team.name || "").slice(0, 32), tag: String(ev.team.tag || "").slice(0, 5), color: /^#[0-9a-f]{6}$/i.test(ev.team.color) ? ev.team.color : "#2563eb" }; U.save(CREW_KEY, { ...U.load(CREW_KEY, {}), team: t }); return renderCrewTeam(); }
  // skarbiec i lista zakupów ekipy: zapis prosto do pamięci, zakładki odświeżają się same
  if (ev.op === "vault" && Array.isArray(ev.list) && U.load("majestic-magazyn-sync-v1", false)) {
    U.save("majestic-skarbiec-v1", ev.list.filter((x) => x && typeof x.note === "string" && Number.isFinite(+x.amt)).slice(-300).map((x) => ({ id: String(x.id).slice(0, 20), who: String(x.who || "").slice(0, 24), amt: Math.round(+x.amt), note: x.note.slice(0, 80), at: +x.at || Date.now() })));
    window.parent.postMessage({ __toEkipa: { vault: true, by: ev.by } }, "*"); return;
  }
  if (ev.op === "shop" && ev.shop && Array.isArray(ev.shop.items) && U.load("majestic-magazyn-sync-v1", false)) {
    U.save("majestic-zakupy-v1", { items: ev.shop.items.slice(0, 50), done: (ev.shop.done || []).slice(0, 200), who: ev.shop.who || {} });
    window.parent.postMessage({ __reload: "crafting" }, "*"); return toast(`${ev.by || "Ekipa"} zmienił listę zakupów`);
  }
  if (ev.op === "chat" && typeof ev.t === "string") { crewChat.push({ by: String(ev.by || "?").slice(0, 24), t: ev.t.slice(0, 300), at: Date.now() }); crewChat = crewChat.slice(-40); renderCrewChat(); Host.call("push", "Ekipa: " + String(ev.by || "?").slice(0, 24), ev.t.slice(0, 300)).catch(() => {}); return toast(`${ev.by || "Ekipa"}: ${ev.t.slice(0, 60)}`); }
  if (ev.op === "pin" && Number.isFinite(ev.x) && Number.isFinite(ev.y)) return showCrewPin(ev);
  if (ev.op === "store" && Array.isArray(ev.items)) { window.parent.postMessage({ __toEkipa: { store: ev.items.slice(0, 200), sched: Array.isArray(ev.events) ? ev.events.slice(0, 100) : undefined, by: ev.by } }, "*"); return; }
  if (ev.op === "timer" && ev.min > 0) { window.parent.postMessage({ __toTimers: { name: ev.name, min: ev.min, by: ev.by } }, "*"); return toast(`${ev.by || "Ekipa"} ustawił minutnik: ${ev.name}`); }
  const list = ev.op === "put" ? [ev.m] : ev.op === "snap" ? ev.ms || [] : [];
  let changed = false;
  for (const raw of list) {
    if (!raw || typeof raw.id !== "string" || typeof raw.name !== "string" || !Number.isFinite(raw.x) || !Number.isFinite(raw.y)) continue;
    const m = { ...crewView(raw), name: raw.name.slice(0, 60), crew: ev.by || "ekipa" };
    const cur = state.markers.find((x) => x.id === m.id);
    if (cur && cur.builtin) continue;
    if (cur) { if (JSON.stringify(crewView(cur)) === JSON.stringify(crewView(m))) continue; Object.assign(cur, m); refreshIcon(cur); leafletById.get(cur.id)?.setLatLng(toLL(cur.x, cur.y)); }
    else { state.markers.push(m); addLeaflet(m); }
    crew.sent.set(m.id, JSON.stringify(crewView(m)));
    changed = true;
  }
  if (ev.op === "del" && typeof ev.id === "string") {
    const cur = state.markers.find((x) => x.id === ev.id && !x.builtin);
    if (cur) { state.markers = state.markers.filter((x) => x !== cur); removeLeaflet(cur.id); crew.sent.delete(cur.id); if (selectedId === cur.id) closeCard(); changed = true; }
  }
  if (changed) { renderCats(); saveLocalOnly(); if (ev.op === "put") toast(`${ev.by || "Ekipa"}: ${ev.m.name}`); }
}
function crewSnapshot() {
  const own = state.markers.filter((m) => !m.builtin).map(crewView);
  for (let i = 0; i < own.length; i += 12) crewSend({ op: "snap", ms: own.slice(i, i + 12), by: crewNick() });  // limit 4 KB na wiadomość
}
const crewNick = () => (U.load(CREW_KEY, {}).nick || "").slice(0, 24) || "ktoś z ekipy";
function crewDiff() {
  if (!crew) return;
  const now = new Map(state.markers.filter((m) => !m.builtin).map((m) => [m.id, JSON.stringify(crewView(m))]));
  for (const [id, json] of now) if (crew.sent.get(id) !== json) { crew.sent.set(id, json); crewSend({ op: "put", m: JSON.parse(json), by: crewNick() }); }
  for (const id of [...crew.sent.keys()]) if (!now.has(id)) { crew.sent.delete(id); crewSend({ op: "del", id, by: crewNick() }); }
}
let saveLocalOnly = save;  // zapis bez ponownego wysyłania zmian, które właśnie przyszły od ekipy
const _crewSave = save;
save = function () { _crewSave(); clearTimeout(save._crewT); save._crewT = setTimeout(crewDiff, 400); };
saveLocalOnly = _crewSave;

async function crewConnect(code, nick) {
  crewDisconnect(true);
  if (!crypto.subtle) return toast("Szyfrowanie niedostępne w tej wersji Windows");
  const { topic, key } = await crewKeys(code);
  crew = { topic, key, sent: new Map((state?.markers || []).filter((m) => !m.builtin).map((m) => [m.id, JSON.stringify(crewView(m))])) };
  U.save(CREW_KEY, { ...U.load(CREW_KEY, {}), code, nick });
  crew.es = new EventSource(`https://ntfy.sh/${topic}/sse?since=12h`);
  crew.es.onmessage = async (e) => { try { const d = JSON.parse(e.data); if (d.event === "message") crewApply(await crewOpen(d.message)); } catch {} };
  crew.es.onopen = () => { renderCrew("on"); renderCrewPeople(); renderCrewChat(); crewPing(); };
  crew.es.onerror = () => renderCrew("err");
  crewSend({ op: "hello", by: nick });
  crewSnapshot();
  renderCrew("wait");
}
function crewDisconnect(silent) {
  if (crew?.es) crew.es.close();
  crew = null;
  if (!silent) { U.save(CREW_KEY, { nick: U.load(CREW_KEY, {}).nick }); renderCrew("off"); }
}
/* obecność: co minutę każdy wysyła swój status gry (10-8 w grze / 10-7 poza) */
const crewSeen = {};
let crewGame = { running: false };
Host.onGame((g) => { const was = crewGame.running; crewGame = g; if (crew && was !== g.running) crewPing(); });
/* własne warstwy tras i stref: nowe rysunki trafiają do wybranej warstwy, każdą można ukryć */
function renderGroups() {
  let bar = document.getElementById("grp-bar");
  if (!bar) { bar = document.createElement("div"); bar.id = "grp-bar"; bar.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:0 0 8px;font-size:12px"; $("#draw-list").before(bar);
    bar.addEventListener("click", (e) => { const t = e.target.closest("[data-grp-eye]"), s = e.target.closest("[data-grp-sel]"), n = e.target.closest("[data-grp-new]");
      if (t) { const g = t.dataset.grpEye, h = state.hiddenGrp || []; state.hiddenGrp = h.includes(g) ? h.filter((x) => x !== g) : [...h, g]; }
      if (s) { state.curGrp = s.dataset.grpSel; state.showGrp = state.showGrp === s.dataset.grpSel ? "" : s.dataset.grpSel; }
      if (n) { const f = bar.querySelector("#grp-name"); if (!f.value.trim()) return f.focus(); state.curGrp = state.showGrp = f.value.trim().slice(0, 24); toast(`Nowe trasy i strefy trafią do warstwy „${state.curGrp}”`); }
      if (t || s || n) { save(); renderDrawings(); } }); }
  const groups = [...new Set(["", ...(state.drawings || []).map((d) => d.grp || ""), state.curGrp || ""])];
  bar.innerHTML = `<small style="width:100%;color:var(--text-3)">Warstwy (klik: pokaż listę i rysuj do niej, oko: ukryj na mapie)</small>` + groups.map((g) => `<span class="chip ${state.showGrp === g && g ? "on" : ""}" style="display:inline-flex;gap:4px;padding:3px 8px"><button type="button" data-grp-sel="${esc(g)}" style="all:unset;cursor:pointer">${g ? esc(g) : "Ogólne"}${(state.curGrp || "") === g ? " ✎" : ""}</button><button type="button" data-grp-eye="${esc(g)}" title="${(state.hiddenGrp || []).includes(g) ? "Pokaż na mapie" : "Ukryj na mapie"}" aria-label="Widoczność warstwy ${g ? esc(g) : "Ogólne"}" style="all:unset;cursor:pointer;opacity:${(state.hiddenGrp || []).includes(g) ? .4 : 1}">👁</button></span>`).join("") + `<input id="grp-name" maxlength="24" placeholder="Nowa warstwa" aria-label="Nazwa nowej warstwy" style="width:110px;padding:3px 6px"><button class="copy-btn" type="button" data-grp-new>+</button>`;
}
const weekStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() - ((d.getDay() + 6) % 7) * 86400000; };
let crewHours = 0;
async function crewWeek() { try { const ws = weekStart(); crewHours = (await Host.call("sessions")).sessions.filter((s) => s.connected && s.joined >= ws).reduce((a, s) => a + s.played, 0) / 3600; } catch {} }
function myWeek() {
  let log = []; try { log = (JSON.parse(localStorage.getItem("majestic-zarobki-v1")) || []).filter((l) => l.at >= weekStart() && l.kind !== "exp"); } catch {}
  const min = log.reduce((a, l) => a + (l.min || 0), 0), by = {}; log.forEach((l) => (by[l.job] = (by[l.job] || 0) + l.amt));
  return { rate: min ? Math.round(log.reduce((a, l) => a + l.amt, 0) / (min / 60)) : 0, best: (Object.entries(by).sort((a, b) => b[1] - a[1])[0] || [""])[0].slice(0, 24) };
}
function crewPing() {
  if (!crew) return;
  let net = 0; try { const ws = weekStart(); net = (JSON.parse(localStorage.getItem("majestic-zarobki-v1")) || []).filter((l) => l.at >= ws).reduce((a, l) => a + l.amt, 0); } catch {}
  const me = myWeek();
  crewSend({ op: "ping", by: crewNick(), on: !!crewGame.running, srv: crewGame.session?.server || "", h: Math.round(crewHours * 10) / 10, net, rate: me.rate, best: me.best });
}
crewWeek(); setInterval(crewWeek, 600000);
setInterval(crewPing, 60000);
function renderCrewPeople() {
  const el = document.getElementById("crew-people"); if (!el) return;
  const now = Date.now(), list = Object.entries(crewSeen).filter(([, v]) => now - v.t < 180000).sort((a, b) => b[1].on - a[1].on);
  try { localStorage.setItem("majestic-ekipa-online-v1", JSON.stringify({ n: list.filter(([, v]) => v.on).length, all: list.length, t: now })); } catch {}
  el.innerHTML = list.length ? list.map(([n, v]) => `<li class="${v.on ? "on" : ""}"><i></i><span>${esc(n)}</span><small>${v.on ? "10-8 · " + esc(v.srv || "w grze") : "10-7 · poza grą"}</small></li>`).join("") : `<li class="none">Nikt inny nie jest teraz połączony.</li>`;
  const rk = document.getElementById("crew-rank"); if (!rk) return;
  const me = crewNick(); let myNet = 0; try { const ws = weekStart(); myNet = (JSON.parse(localStorage.getItem("majestic-zarobki-v1")) || []).filter((l) => l.at >= ws).reduce((a, l) => a + l.amt, 0); } catch {}
  const all = [[me + " (ty)", { h: Math.round(crewHours * 10) / 10, net: myNet, ...myWeek() }], ...Object.entries(crewSeen).filter(([n]) => n !== me)].sort((a, b) => b[1].net - a[1].net);
  rk.innerHTML = all.map(([n, v], i) => `<li title="${v.best ? "Najlepsza praca: " + esc(v.best) : ""}"><b>${i + 1}.</b> <span>${esc(n)}</span><small>${v.h || 0} h · $${Math.round(v.net || 0).toLocaleString("pl-PL")}${v.rate ? " · $" + v.rate.toLocaleString("pl-PL") + "/h" : ""}${v.best ? " · " + esc(v.best) : ""}</small></li>`).join("");
  window.__crewRank = all;
}
setInterval(renderCrewPeople, 30000);
/* czat ekipy i pinezka „tu jestem” (widoczna 10 minut) */
let crewChat = [];
const crewPins = L.layerGroup().addTo(map);
function renderCrewChat() {
  const el = document.getElementById("crew-chat"); if (!el) return;
  el.innerHTML = crewChat.map((m) => `<li><b>${esc(m.by)}</b> <span>${esc(m.t)}</span></li>`).join("") || `<li class="none">Brak wiadomości. Napisz coś do ekipy.</li>`;
  el.scrollTop = el.scrollHeight;
}
function renderCrewTeam() {
  const el = document.getElementById("crew-team"); if (!el) return;
  const t = U.load(CREW_KEY, {}).team || { name: "", tag: "", color: "#2563eb" };
  el.innerHTML = `${t.name ? `<p style="margin:8px 0 4px;font:700 15px Bahnschrift,sans-serif;color:${t.color}">${t.tag ? "[" + esc(t.tag) + "] " : ""}${esc(t.name)}</p>` : ""}
    <details><summary class="link">Profil ekipy</summary><form id="team-form" class="crew-say" autocomplete="off" style="flex-wrap:wrap">
    <input name="name" maxlength="32" placeholder="Nazwa ekipy" aria-label="Nazwa ekipy" value="${esc(t.name)}"><input name="tag" maxlength="5" placeholder="Skrót" aria-label="Skrót ekipy" value="${esc(t.tag)}" style="max-width:70px">
    <input name="color" type="color" aria-label="Kolor ekipy" value="${t.color}" style="max-width:44px;padding:0"><button class="copy-btn">Zapisz u wszystkich</button></form></details>`;
  el.querySelector("#team-form").onsubmit = (e) => {
    e.preventDefault(); const f = e.target, team = { name: f.name.value.trim(), tag: f.tag.value.trim(), color: f.color.value };
    U.save(CREW_KEY, { ...U.load(CREW_KEY, {}), team }); crewSend({ op: "team", team }); renderCrewTeam(); toast("Profil ekipy wysłany");
  };
}
function showCrewPin(ev) {
  const ll = toLL(ev.x, ev.y), by = String(ev.by || "Ekipa").slice(0, 24);
  const m = L.marker(ll, { icon: L.divIcon({ className: "", iconSize: [26, 26], html: `<div class="crew-pin"><i></i></div>` }), keyboard: false })
    .bindTooltip(`${esc(by)} jest tutaj`, { permanent: true, direction: "top", className: "mk-tip", offset: [0, -12] }).addTo(crewPins);
  setTimeout(() => crewPins.removeLayer(m), 10 * 60000);
  toast(`${by} pokazuje, gdzie jest`);
}
function renderCrew(st) {
  const s = U.load(CREW_KEY, {});
  $("#crew-box").innerHTML = crew
    ? `<p class="crew-st ${st}"><i></i>${st === "on" ? "Połączono z mapą ekipy" : st === "err" ? "Brak połączenia, ponawiam…" : "Łączenie…"}</p>
       <small>Twoje znaczniki widzi każdy z tym samym kodem. Szyfrowane kodem ekipy.</small>
       <div id="crew-team"></div>
       <ul class="crew-people" id="crew-people"></ul><h3 style="margin:10px 0 4px;font-size:12px;opacity:.75">Ranking tygodnia (godziny · na czysto)</h3><ul class="crew-people" id="crew-rank"></ul>
       <button class="link" id="crew-rank-dc" type="button">Ranking tygodnia na Discorda</button>
       <button class="link" id="crew-qr" type="button">Pokaż kod ekipy jako QR</button>
       <button class="link" id="crew-pin-btn" type="button">Pokaż ekipie, gdzie jestem (10 min)</button>
       <ul class="crew-chat" id="crew-chat" aria-live="polite"></ul>
       <form id="crew-say" class="crew-say" autocomplete="off"><input name="t" maxlength="300" placeholder="Wiadomość do ekipy…" aria-label="Wiadomość do ekipy"><button class="copy-btn">Wyślij</button></form>
       <button class="link" id="crew-off">Rozłącz</button>`
    : `<form id="crew-form" class="crew-form" autocomplete="off">
         <input name="code" type="password" placeholder="Wspólny kod ekipy (min. 8 znaków)" aria-label="Kod ekipy" value="">
         <input name="nick" placeholder="Twój nick w ekipie" aria-label="Nick" maxlength="24" value="${esc(s.nick || "")}">
         <button class="copy-btn">Połącz</button></form>
       <small>Wszyscy wpisują ten sam kod. Znaczniki dodane przez jedną osobę od razu pojawią się u reszty.</small>`;
  renderCrewTeam();
}
$("#crew-box").addEventListener("submit", (e) => {
  e.preventDefault();
  if (e.target.id === "crew-say") {
    const t = e.target.t.value.trim(); if (!t || !crew) return;
    crewSend({ op: "chat", t, by: crewNick() });
    crewChat.push({ by: "Ty", t, at: Date.now() }); crewChat = crewChat.slice(-40); renderCrewChat();
    e.target.t.value = ""; return;
  }
  const code = e.target.code.value.trim(), nick = e.target.nick.value.trim();
  if (code.length < 8) return toast("Kod ekipy musi mieć co najmniej 8 znaków");
  crewConnect(code, nick);
});
$("#crew-box").addEventListener("click", (e) => {
  if (e.target.id === "crew-off") crewDisconnect();
  if (e.target.id === "crew-pin-btn") {
    if (!state.me) return toast("Najpierw zaznacz, gdzie jesteś: przycisk „Tu jestem” albo klawisz H");
    crewSend({ op: "pin", x: state.me.x, y: state.me.y, by: crewNick() });
    toast("Ekipa widzi teraz Twoją pozycję przez 10 minut");
  }
});
{ const s = U.load(CREW_KEY, {}); renderCrew("off"); if (s.code) { const go = () => (state ? crewConnect(s.code, s.nick || "") : setTimeout(go, 300)); go(); } }

/* ---------- mapa cieplna: gdzie najczęściej masz własne znaczniki, zrzuty i wpisy w dzienniku ---------- */
const heatLayer = L.layerGroup();
function buildHeat() {
  heatLayer.clearLayers();
  for (const m of state.markers || []) {
    if (m.builtin) continue;
    const w = 1 + (m.shots?.length || 0) + (m.log?.length || 0);  // waga: aktywność przy miejscu
    L.circle(toLL(m.x, m.y), { renderer: wikiRenderer, radius: 220 + w * 90, stroke: false, fillColor: "#ef4444", fillOpacity: Math.min(0.45, 0.1 + w * 0.05), interactive: false }).addTo(heatLayer);
  }
}
/* ---------- pomiar odległości (M): dwa kliknięcia ---------- */
let measure = null;
const measureLayer = L.layerGroup().addTo(map);
function startMeasure() {
  if (drawing) return;
  measure = { pts: [] };
  measureLayer.clearLayers();
  $("#placing-hint .ph-text").textContent = "Kliknij punkt startu, potem cel. Esc anuluje";
  $("#placing-hint").hidden = false;
  map.getContainer().classList.add("placing");
}
function endMeasure() {
  measure = null;
  $("#placing-hint").hidden = true;
  $("#placing-hint .ph-text").textContent = "Kliknij na mapie, gdzie postawić znacznik";
  map.getContainer().classList.remove("placing");
}
map.on("click", (e) => {
  if (!measure) return;
  measure.pts.push([e.latlng.lat, e.latlng.lng]);
  L.circleMarker(e.latlng, { radius: 5, color: "#0d0f14", weight: 2, fillColor: "#f59e0b", fillOpacity: 1 }).addTo(measureLayer);
  if (measure.pts.length < 2) return;
  const d = dist(measure.pts), mins = Math.max(1, Math.round((d / 1000) / 110 * 60 * 1.35));  // ~110 km/h, zakręty i ruch +35%
  L.polyline(measure.pts, { color: "#f59e0b", weight: 3, dashArray: "6 6" }).addTo(measureLayer)
    .bindTooltip(`${fmtDist(d)} · autem ok. ${mins} min`, { permanent: true, className: "mk-tip", direction: "center" }).openTooltip();
  endMeasure();
});
document.addEventListener("keydown", (e) => {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
  if (e.key.toLowerCase() === "m" && !e.ctrlKey) startMeasure();
  if (e.key === "Escape" && measure) { endMeasure(); measureLayer.clearLayers(); }
});
/* przyciski nad mapą: pomiar i mapa cieplna */
const ToolsCtl = L.Control.extend({
  options: { position: "bottomright" },
  onAdd() {
    const wrap = L.DomUtil.create("div", "tools-ctl");
    wrap.innerHTML = `<button type="button" id="measure-btn" title="Zmierz odległość (M)" aria-label="Zmierz odległość"><svg viewBox="0 0 24 24"><path d="M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2"/></svg></button>
      <button type="button" id="heat-btn" title="Mapa cieplna Twoich miejsc" aria-label="Mapa cieplna" aria-pressed="false"><svg viewBox="0 0 24 24"><path d="M12 3c3 4 6 6.5 6 10.5A6 6 0 0 1 6 13.5c0-2 1-3.5 2.5-5 .5 2 1.5 3 3 3.5-.5-3 0-6 .5-9z"/></svg></button>`;
    L.DomEvent.disableClickPropagation(wrap);
    return wrap;
  },
});
new ToolsCtl().addTo(map);
$("#measure-btn").onclick = startMeasure;
$("#heat-btn").onclick = (e) => {
  const on = !map.hasLayer(heatLayer);
  if (on) { buildHeat(); heatLayer.addTo(map); if (!heatLayer.getLayers().length) toast("Dodaj własne znaczniki, żeby zobaczyć mapę cieplną"); }
  else map.removeLayer(heatLayer);
  e.currentTarget.setAttribute("aria-pressed", on);
};

/* ---------- moja rodzina na mapie terytoriów ---------- */
function myFamHtml() {
  const cells = (wikiData?.layers?.captures || []).filter((c) => c.t === "cell" && c.o);
  if (!cells.length || !(state.wikiOn || []).includes("captures")) return "";
  const fams = [...new Set(cells.map((c) => String(c.o)))].sort((a, b) => a - b);
  return `<li class="cap-filter"><select id="my-fam" aria-label="Moja rodzina"><option value="">Moja rodzina: nie wybrano</option>
    ${fams.map((f) => `<option value="${f}" ${String(state.myFam || "") === f ? "selected" : ""}>Moja rodzina: #${f}</option>`).join("")}</select></li>`;
}
$("#wiki-layers").addEventListener("change", (e) => {
  if (e.target.id !== "my-fam") return;
  state.myFam = e.target.value; save();
  if (wikiGroups.captures) { map.removeLayer(wikiGroups.captures); delete wikiGroups.captures; }
  setWikiVisible("captures", true);
  toast(state.myFam ? `Twoje pola na zielono, cudze na czerwono` : "Wyłączono podświetlanie rodziny");
});

$("#me-btn").addEventListener("click", startMe);
$("#shots-btn").addEventListener("click", () => openInbox(null));
boot();
})();

/* ranking na Discorda i kod QR (delegacja: panel ekipy rysuje się na nowo) */
document.addEventListener("click", async (e) => {
  if (e.target.closest("#crew-rank-dc")) {
    const all = window.__crewRank || []; if (!all.length) return toast("Ranking jeszcze pusty");
    const t = "**Ranking ekipy: ten tydzień**\n" + all.map(([n, v], i) => `${i + 1}. ${n}: ${v.h || 0} h, $${Math.round(v.net || 0).toLocaleString("pl-PL")}${v.rate ? ", $" + v.rate.toLocaleString("pl-PL") + "/h" : ""}${v.best ? " (" + v.best + ")" : ""}`).join("\n");
    const ok = await Host.call("discord_send", t, "dcReport").catch(() => false);
    try { await navigator.clipboard.writeText(t); } catch {}
    toast(ok ? "Wysłano ranking na Discorda (i skopiowano)" : "Skopiowano ranking. Ustaw webhook w Ustawieniach, żeby wysyłać od razu.");
  }
  if (e.target.closest("#crew-qr")) {
    const code = U.load(CREW_KEY, {}).code; if (!code) return toast("Najpierw połącz się z ekipą");
    const src = await Host.call("qr", code);
    L.popup({ className: "cd-pop", maxWidth: 320 }).setLatLng(map.getCenter()).setContent(`<b>Kod ekipy</b><p>Zeskanuj telefonem. Nie pokazuj go na streamie: kto ma kod, widzi Wasze znaczniki.</p><img src="${src}" alt="Kod QR z kodem ekipy" style="width:240px;height:240px;display:block;margin:6px auto;image-rendering:pixelated">`).openOn(map);
  }
});

/* notatki głosowe przy znacznikach: do 20 s z mikrofonu, plik w folderze danych */
let voiceBase = "", rec = null;
Host.call("voice_base").then((b) => (voiceBase = b)).catch(() => {});
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-rec]"); if (!b) return;
  if (rec) { rec.stop(); return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { return toast("Brak dostępu do mikrofonu. Zezwól aplikacji na mikrofon w Ustawieniach Windows → Prywatność."); }
  const chunks = [], id = b.dataset.rec; rec = new MediaRecorder(stream);
  rec.ondataavailable = (ev) => chunks.push(ev.data);
  rec.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop()); rec = null;
    const blob = new Blob(chunks, { type: "audio/webm" }), url = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    const name = await Host.call("save_voice", id, url).catch(() => null);
    const m = state.markers.find((x) => x.id === id);
    if (name && m) { m.voice = name; save(); renderCard(m); toast("Zapisano notatkę głosową"); } else toast("Nie udało się zapisać nagrania");
  };
  rec.start(); b.textContent = "● Nagrywam… kliknij, żeby zakończyć"; b.style.color = "#ef4444";
  setTimeout(() => rec && rec.state === "recording" && rec.stop(), 20000);
});

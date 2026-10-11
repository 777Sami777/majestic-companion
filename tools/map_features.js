  $("#del").onclick = (e) => confirmDelete(m, e.currentTarget);
  bindShots(m);
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

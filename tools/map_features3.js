/* ---------- trasy i strefy rysowane na mapie ---------- */
const drawGroup = L.layerGroup().addTo(map);
let drawing = null;   // { kind: "route" | "zone", pts: [[lat,lng]], preview }
const DRAW_COLORS = ["#f5b544", "#ff5a6a", "#4d8dff", "#3ddc97", "#b07cff", "#2fd4d4"];
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
  drawGroup.clearLayers();
  (state.drawings || []).forEach((d) => drawShape(d));
  const list = state.drawings || [];
  $("#draw-list").innerHTML = list.length ? list.map((d, i) => `<li><button class="place" data-draw="${d.id}" style="--c:${d.color};--i:${i}"><i></i>
      <span>${esc(d.name)}</span><small>${d.kind === "route" ? fmtDist(dist(d.pts)) : "strefa"}</small></button>
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
  const item = { id: uid(), kind: d.kind, pts: d.pts.map(([a, b]) => [Math.round(a), Math.round(b)]), color: d.color, name: (d.kind === "route" ? "Trasa " : "Strefa ") + n };
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

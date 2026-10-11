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

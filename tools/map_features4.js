/* ---------- grupowanie znaczników przy oddaleniu ---------- */
const clusterLayer = L.layerGroup().addTo(map);
let clustering = false, clusterTimer = 0;
function recluster() {
  clustering = true;
  clusterLayer.clearLayers();
  document.querySelectorAll(".leaflet-marker-icon.in-cluster").forEach((el) => el.classList.remove("in-cluster"));
  if (map.getZoom() < 2.5) {
    const cells = new Map(), size = 58;
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
        .on("click", () => map.flyTo([lat, lng], Math.min(map.getZoom() + 1.5, 4), { duration: 0.6 }))
        .addTo(clusterLayer);
    }
  }
  clustering = false;
}
const scheduleCluster = () => { clearTimeout(clusterTimer); clusterTimer = setTimeout(recluster, 80); };
map.on("zoomend moveend", scheduleCluster);
map.on("layeradd layerremove", (e) => { if (!clustering && e.layer instanceof L.Marker && !clusterLayer.hasLayer(e.layer)) scheduleCluster(); });

/* ---------- trasa zbierania przez strefy wybranego typu ---------- */
function gatherRoute() {
  const f = state.gathFilter || "";
  const items = (wikiData?.layers?.gatherer || []).filter((it) => GATH_COL[it.n] && (!f || it.n === f));
  // środek strefy w układzie mapy [lat=y, lng=x]
  let left = items.map((it) => it.t === "g"
    ? [it.c.reduce((a, p) => a + p[1], 0) / it.c.length, it.c.reduce((a, p) => a + p[0], 0) / it.c.length]
    : [it.c[1], it.c[0]]);
  if (left.length < 2) return toast("Za mało stref, żeby wyznaczyć trasę");
  // najbliższy sąsiad od strefy najbardziej na zachód: prosto i wystarczająco dobrze dla kilkunastu punktów
  left.sort((a, b) => a[1] - b[1]);
  const pts = [left.shift()];
  while (left.length) {
    const last = pts[pts.length - 1];
    let bi = 0, bd = Infinity;
    left.forEach((p, i) => { const d = Math.hypot(p[0] - last[0], p[1] - last[1]); if (d < bd) { bd = d; bi = i; } });
    pts.push(left.splice(bi, 1)[0]);
  }
  const label = f === "Owoce morza" ? "kraby" : f === "Wodorosty" ? "glony" : (f || "zbieractwo").toLowerCase();
  const item = { id: uid(), kind: "route", pts: pts.map(([a, b]) => [Math.round(a), Math.round(b)]), color: GATH_COL[f] || "#22c55e", name: "Zbieranie: " + label };
  (state.drawings ||= []).push(item);
  save(); renderDrawings();
  map.flyToBounds(L.latLngBounds(item.pts), { padding: [80, 80], duration: 1 });
  toast(`Trasa przez ${pts.length} stref: ${fmtDist(dist(item.pts))}. Zapisana w „Trasy i strefy”`);
}
$("#wiki-layers").addEventListener("click", (e) => { if (e.target.closest("[data-gath-route]")) gatherRoute(); });

/* ---------- przypomnienie o odnowieniu strefy zbierania ---------- */
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

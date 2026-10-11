// Uruchamiane w ukrytym oknie na stronie mapy Majestic Wiki. Wynik trafia do window.__mjx.
(async () => {
  const SERVER = "__SERVER__";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function findMap() {
    const vp = document.querySelector(".ol-viewport");
    if (!vp) return null;
    let map = null; const seen = new Set();
    const scan = (o, d) => {
      if (!o || typeof o !== "object" || seen.has(o) || d > 6 || map) return;
      seen.add(o);
      try { if (typeof o.getLayers === "function" && typeof o.getView === "function") { map = o; return; } } catch {}
      for (const k of Object.keys(o)) { if (k === "return" || k === "_owner") continue; try { scan(o[k], d + 1); } catch {} }
    };
    let el = vp;
    while (el && !map) {
      for (const k of Object.keys(el)) {
        if (!k.startsWith("__react")) continue;
        let f = el[k];
        for (let n = 0; n < 40 && f && !map; n++) {
          scan(f.memoizedProps, 0);
          let s = f.memoizedState;
          for (let m = 0; m < 20 && s && !map; m++) { scan(s.memoizedState, 0); s = s.next; }
          f = f.return;
        }
      }
      el = el.parentElement;
    }
    return map;
  }
  const features = (map) => map.getLayers().getArray().flatMap((l) => {
    const src = l.getSource && l.getSource();
    return src && src.getFeatures ? src.getFeatures() : [];
  });
  try {
    let map = null, fs = [], last = -1;
    for (let i = 0; i < 40; i++) {           // do 20 s na wczytanie mapy i warstw
      map = map || findMap();
      if (map) { fs = features(map); if (fs.length && fs.length === last) break; last = fs.length; }
      await wait(500);
    }
    if (!map) { window.__mjx = { error: "Nie znaleziono mapy na stronie" }; return; }
    const r = (v) => Math.round(v);
    const servers = {};
    const items = fs.map((f) => {
      const d = f.get("data") || {}, g = f.getGeometry(), t = g.getType(), md = d.metadata || {};
      const it = { n: d.name || "", i: (d.icon || "").replace(/^.*\/|\.png.*$/g, "") };
      if (t === "Point") { const c = g.getCoordinates(); it.t = "p"; it.c = [r(c[0]), r(c[1])]; }
      else if (t === "Polygon") {
        const ring = g.getCoordinates()[0], step = Math.max(1, Math.ceil(ring.length / 48));
        it.t = "g"; it.c = ring.filter((_, k) => k % step === 0).map((c) => [r(c[0]), r(c[1])]);
      } else return null;
      if (md.kind === "captureCell") {
        const e = g.getExtent();
        it.t = "cell"; it.c = [r((e[0] + e[2]) / 2), r((e[1] + e[3]) / 2), r((e[2] - e[0]) / 2)];
        (md.owners || []).forEach((x) => { servers[x.serverId] = x.serverName; });
        const o = (md.owners || []).find((x) => x.serverId === SERVER);
        if (o && o.familyId) { it.o = o.familyId; it.oc = o.familyMainColor || "#888"; }
        if (it.n === "Zwykły kwadrat") it.n = "";
      }
      if (d.style && d.style.fillColor) it.col = d.style.fillColor;
      return it;
    }).filter(Boolean);
    window.__mjx = { title: document.title, items, servers };
  } catch (e) { window.__mjx = { error: String(e) }; }
})();

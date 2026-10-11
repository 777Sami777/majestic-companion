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
};
const wikiGroups = {};
let wikiData = null;
const wikiRenderer = L.canvas({ padding: 0.3 });

function buildWikiLayer(slug, items) {
  const cfg = WIKI[slug], g = L.layerGroup();
  for (const it of items) {
    const label = it.n ? esc(it.n) : cfg.name;
    if (it.t === "cell") {
      const [x, y, h] = it.c;
      const col = it.oc || "#ffffff";
      L.rectangle([[y - h, x - h], [y + h, x + h]], { renderer: wikiRenderer, color: col, weight: 0.6, opacity: it.o ? 0.5 : 0.15,
        fillColor: col, fillOpacity: it.o ? 0.28 : 0.03 })
        .bindTooltip(`${it.n ? label + " · " : ""}${it.o ? "Rodzina #" + it.o : "Wolne pole"}`, { className: "mk-tip", sticky: true }).addTo(g);
    } else if (it.t === "g") {
      L.polygon(it.c.map(([x, y]) => [y, x]), { renderer: wikiRenderer, color: it.col || cfg.color, weight: 1.5, fillOpacity: 0.18 })
        .bindTooltip(label, { className: "mk-tip", sticky: true }).addTo(g);
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
  }).join("");
  $("#wiki-meta").textContent = !Host.available ? "Warstwy z wiki działają w aplikacji Majestic Companion."
    : wikiData ? `Serwer ${wikiData.server} · pobrano ${new Date(wikiData.at).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
    : "Kliknij Aktualizuj, żeby pobrać warstwy (ok. 1–2 min, potrzebny internet).";
}
function setWikiVisible(slug, show) {
  state.wikiOn = (state.wikiOn || []).filter((s) => s !== slug);
  if (show) state.wikiOn.push(slug);
  if (show && !wikiGroups[slug] && wikiData?.layers[slug]) wikiGroups[slug] = buildWikiLayer(slug, wikiData.layers[slug]);
  const g = wikiGroups[slug];
  if (g) show ? g.addTo(map) : map.removeLayer(g);
  save(); renderWikiPanel();
}
$("#wiki-layers").addEventListener("click", (e) => {
  const li = e.target.closest("[data-wiki]");
  if (!li || li.classList.contains("disabled")) return;
  setWikiVisible(li.dataset.wiki, !(state.wikiOn || []).includes(li.dataset.wiki));
});
async function loadWiki() {
  if (!Host.available) return renderWikiPanel();
  try { const raw = await Host.call("wiki_layers"); wikiData = raw ? JSON.parse(raw) : null; } catch { wikiData = null; }
  Object.keys(wikiGroups).forEach((k) => { map.removeLayer(wikiGroups[k]); delete wikiGroups[k]; });
  renderWikiPanel();
  (state.wikiOn || []).forEach((s) => setWikiVisible(s, true));
}
$("#wiki-sync").addEventListener("click", async (e) => {
  if (!Host.available) return toast("Aktualizacja z wiki działa w aplikacji Majestic Companion");
  const b = e.currentTarget;
  if (b.disabled) return;
  b.disabled = true; b.textContent = "Pobieram…";
  toast("Pobieram warstwy z Majestic Wiki. To potrwa 1–2 minuty");
  try {
    const st = await Host.call("get_settings");
    const r = await Host.call("wiki_sync", st.server || "PL1");
    if (r.ok) toast(`Pobrano warstwy: ${Object.keys(r.counts).length}${r.errors.length ? " (bez " + r.errors.length + ")" : ""}`);
    else toast("Nie udało się pobrać warstw. Sprawdź internet i spróbuj ponownie");
    await loadWiki();
  } catch { toast("Nie udało się pobrać warstw z wiki"); }
  b.disabled = false; b.textContent = "Aktualizuj";
});

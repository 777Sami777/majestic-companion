import os
HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(HERE, "..", "web", "mapa")


def patch(path, pairs):
    p = os.path.join(WEB, path)
    s = open(p, encoding="utf8").read()
    for a, b in pairs:
        assert s.count(a) == 1, (path, a[:70], s.count(a))
        s = s.replace(a, b)
    open(p, "w", encoding="utf8").write(s)


patch("app.js", [
    # filtr terytoriów: wpięty w panel warstw i budowanie warstwy
    ('''  }).join("");
  $("#wiki-meta").textContent =''', '''  }).join("") + capFilterHtml();
  $("#wiki-meta").textContent ='''),
    ('''  for (const it of items) {
    const label = it.n ? esc(it.n) : cfg.name;''', '''  const cf = slug === "captures" ? state.capFilter || "" : "";
  for (const it of items) {
    if (cf && it.t === "cell" && (cf === "free" ? it.o : String(it.o) !== cf)) continue;
    const label = it.n ? esc(it.n) : cfg.name;'''),
    ('''$("#wiki-layers").addEventListener("click", (e) => {''', '''$("#wiki-layers").addEventListener("change", (e) => {
  if (e.target.id !== "cap-filter") return;
  state.capFilter = e.target.value;
  if (wikiGroups.captures) { map.removeLayer(wikiGroups.captures); delete wikiGroups.captures; }
  setWikiVisible("captures", true);
});
$("#wiki-layers").addEventListener("click", (e) => {
  if (e.target.closest(".cap-filter")) return;'''),
    # dziennik na karcie
    ('''    <div class="card-sec shots-sec">''', '''    ${journalHtml(m)}
    <div class="card-sec shots-sec">'''),
    ('''  $("#del").onclick = (e) => confirmDelete(m, e.currentTarget);
  bindShots(m);''', '''  $("#del").onclick = (e) => confirmDelete(m, e.currentTarget);
  bindShots(m);
  bindJournal(m);'''),
    # klawisze R / Z
    ('''  if (e.key.toLowerCase() === "h") startMe();''', '''  if (e.key.toLowerCase() === "h") startMe();
  if (e.key.toLowerCase() === "r") startDraw("route");
  if (e.key.toLowerCase() === "z") startDraw("zone");'''),
    # rysowanie nie stawia znaczników
    ('''map.on("click", (e) => {
  if (placingMe)''', '''map.on("click", (e) => {
  if (drawing) return;
  if (placingMe)'''),
    ('''map.on("contextmenu", (e) => newAt(e.latlng));''', '''map.on("contextmenu", (e) => { if (drawing) return finishDraw(); newAt(e.latlng); });'''),
    ('''  renderCats();
  loadWiki();''', '''  renderCats();
  loadWiki();
  renderDrawings();'''),
    ('''$("#me-btn").addEventListener("click", startMe);''', open(os.path.join(HERE, "map_features3.js"), encoding="utf8").read() + '''
$("#me-btn").addEventListener("click", startMe);'''),
])
print("ok")

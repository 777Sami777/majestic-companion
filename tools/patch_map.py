import os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web", "mapa", "app.js")
s = open(p, encoding="utf8").read()


def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:70], s.count(a))
    s = s.replace(a, b)


rep('''  hammer:''', '''  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  me: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/>',
  hammer:''')

rep('''    <div class="card-actions">
      <button class="btn ghost" id="edit">Edytuj</button>''', '''    <div class="card-sec shots-sec">
      <div class="shots-head"><span>Zrzuty ekranu</span><small>${(m.shots || []).length || ""}</small></div>
      <div class="shots" id="shots">${shotsHtml(m)}</div>
    </div>
    <div class="card-actions">
      <button class="btn ghost" id="edit">Edytuj</button>''')

rep('''  $("#del").onclick = (e) => confirmDelete(m, e.currentTarget);
}''', open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "map_features.js"), encoding="utf8").read())

rep('''map.on("click", (e) => { if (placing) newAt(e.latlng); });''', '''map.on("click", (e) => {
  if (placingMe) { stopMe(); $("#placing-hint").hidden = true; map.getContainer().classList.remove("placing"); return setMe(e.latlng); }
  if (placing) newAt(e.latlng);
});''')

rep('''      const nm = { id: uid(), x: d.x, y: d.y, builtin: false, ...data };''',
    '''      const nm = { id: uid(), x: d.x, y: d.y, builtin: false, ...data, shots: pendingShots.splice(0) };''')
rep('''function stopPlacing() {
  placing = false;''', '''function stopPlacing() {
  placing = false;
  if (placingMe) stopMe();''')

rep('''  if (e.key === "Escape") {
    if (placing) return stopPlacing();''', '''  if (e.key === "Escape") {
    if ($("#lightbox")) return closeLightbox();
    if ($("#inbox")) return closeInbox();
    if (placing) { pendingShots.splice(0); return stopPlacing(); }''')
rep('''  if (e.key.toLowerCase() === "n") startPlacing();''', '''  if ($("#lightbox") && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return stepLb(e.key === "ArrowLeft" ? -1 : 1);
  if (e.key.toLowerCase() === "n") startPlacing();
  if (e.key.toLowerCase() === "h") startMe();
  if (e.key.toLowerCase() === "g" && Host.available) openInbox(null);''')

rep('''  const minIntro = new Promise((r) => setTimeout(r, 1600));''', '''  if (Host.available) {
    Host.call("shots_base").then((b) => { shotsBase = b; }).catch(() => {});
    watchGameShots();
  }
  drawMe(false);
  const minIntro = new Promise((r) => setTimeout(r, Host.embedded ? 300 : 1600));''')
rep('''boot();
})();''', '''// gdy grasz, co 20 s sprawdzamy, czy pojawił się nowy zrzut z gry
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
$("#me-btn").addEventListener("click", startMe);
$("#shots-btn").addEventListener("click", () => openInbox(null));
boot();
})();''')
open(p, "w", encoding="utf8").write(s)
print("ok")

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


patch("index.html", [
    ('''    <section id="cats-wrap">''', '''    <section id="favs-wrap" hidden>
      <div class="sec-head"><h2>Ulubione</h2></div>
      <ul id="favs" class="place-list"></ul>
    </section>
    <section id="wiki-wrap">
      <div class="sec-head"><h2>Warstwy z wiki</h2><button class="link" id="wiki-sync" title="Pobiera aktualne dane z Majestic Wiki">Aktualizuj</button></div>
      <ul id="wiki-layers"></ul>
      <p class="wiki-meta" id="wiki-meta"></p>
    </section>
    <section id="cats-wrap">'''),
])

patch("app.js", [
    # ulubione w panelu
    ('''  const hiddenAll = state.hiddenCats.length === cats.length;''', '''  const favs = state.markers.filter((m) => m.fav);
  $("#favs-wrap").hidden = !favs.length;
  $("#favs").innerHTML = favs.map((m, i) => placeRow(m, i)).join("");
  const hiddenAll = state.hiddenCats.length === cats.length;'''),
    ('''$("#toggle-all").addEventListener("click", () => {''', '''$("#favs").addEventListener("click", (e) => { const p = e.target.closest(".place"); if (p) select(p.dataset.id, true); });
$("#toggle-all").addEventListener("click", () => {'''),
    # karta: gwiazdka, kod, kontakty
    ('''      <span class="card-badge">${ico(markerIcon(m))}${esc(c?.name || "Znacznik")}</span>''',
     '''      <span class="card-badge">${ico(markerIcon(m))}${esc(c?.name || "Znacznik")}</span>
      <button class="fav-btn ${m.fav ? "on" : ""}" id="fav" title="Ulubione">${ico("star")}</button>'''),
    ('''<button class="copy-btn" id="copy">Kopiuj</button></div>''',
     '''<button class="copy-btn" id="copy">Kopiuj</button><button class="copy-btn" id="share" title="Kod do wysłania znajomym">Kod</button></div>
      ${contactsHtml(m)}'''),
    ('''  $("#copy").onclick = () => copy(`${m.x}, ${m.y}`);''', '''  $("#copy").onclick = () => copy(`${m.x}, ${m.y}`);
  $("#fav").onclick = () => { m.fav = !m.fav; save(); renderCats(); $("#fav").classList.toggle("on", m.fav); toast(m.fav ? "Dodano do ulubionych" : "Usunięto z ulubionych"); };
  $("#share").onclick = () => copy(shareCode(m), "Skopiowano kod znacznika. Kolega wkleja go w wyszukiwarkę (Ctrl+K)");
  document.querySelectorAll(".linked [data-contact]").forEach((b) => (b.onclick = () => Host.nav("kontakty", { select: b.dataset.contact })));'''),
    # wyszukiwarka: kod znacznika
    ('''  if (e.key === "Enter") { const first = $("#result-list .place"); if (first) select(first.dataset.id, true); }''',
     '''  if (e.key === "Enter" && e.target.value.trim().startsWith("MJM:")) { importCode(e.target.value.trim()); e.target.value = ""; e.target.dispatchEvent(new Event("input")); return; }
  if (e.key === "Enter") { const first = $("#result-list .place"); if (first) select(first.dataset.id, true); }'''),
    ('''  const hits = state.markers.filter((m) =>''', '''  if (q.startsWith("mjm:")) { $("#result-list").innerHTML = `<li class="empty">Naciśnij Enter, żeby dodać znacznik z kodu.</li>`; return; }
  const hits = state.markers.filter((m) =>'''),
])

# kopiowanie z własnym komunikatem
patch("app.js", [
    ('''async function copy(text) {''', '''async function copy(text, msg) {'''),
    ('''  toast("Skopiowano współrzędne " + text);''', '''  toast(msg || "Skopiowano współrzędne " + text);'''),
])

patch("app.js", [('''$("#me-btn").addEventListener("click", startMe);''',
                  open(os.path.join(HERE, "map_features2.js"), encoding="utf8").read() + '''
$("#me-btn").addEventListener("click", startMe);''')])
patch("app.js", [('''  setStyle(state.style, false);
  renderCats();''', '''  setStyle(state.style, false);
  renderCats();
  loadWiki();''')])
print("ok")

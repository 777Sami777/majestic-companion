import os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web", "kontakty", "app.js")
s = open(p, encoding="utf8").read()


def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:70], s.count(a))
    s = s.replace(a, b)


# karta: miejsce z mapy + przyciski
rep('''      <div class="tile" style="--i:3"><label>Gdzie go spotkać</label><div class="val">${esc(c.place || "—")}</div></div>''',
    '''      <div class="tile" style="--i:3"><label>Gdzie go spotkać</label><div class="val">${esc(c.place || "—")}</div>
        ${mapMarker(c.markerId) ? `<button class="copy" data-act="map" style="margin-top:10px">Pokaż na mapie: ${esc(mapMarker(c.markerId).name)}</button>` : ""}</div>''')
rep('''        <button class="icon-btn fav ${c.fav ? "on" : ""}" data-act="fav" title="Ulubiony">${svg("star")}</button>''',
    '''        <button class="icon-btn fav ${c.fav ? "on" : ""}" data-act="fav" title="Ulubiony">${svg("star")}</button>
        <button class="icon-btn" data-act="share" title="Kod do wysłania znajomym">${svg("share")}</button>''')
rep('''  if (act === "copy") copy(c.phone);''', '''  if (act === "copy") copy(c.phone);
  if (act === "map") Host.nav("mapa", { select: c.markerId });
  if (act === "share") copy(shareCode(c), "Skopiowano kod kontaktu. Kolega wkleja go w wyszukiwarkę kontaktów (Ctrl+K)");''')

# formularz: wybór znacznika z mapy
rep('''      <label class="field full"><span>Gdzie go spotkać</span>''', '''      <label class="field full"><span>Znacznik na mapie</span><select name="marker"><option value="">— brak —</option>${myMarkers().map((m) => `<option value="${m.id}" ${m.id === d.markerId ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select></label>
      <label class="field full"><span>Gdzie go spotkać</span>''')
rep('''fac: d.fac, rel: d.rel, trust: d.trust };''', '''fac: d.fac, rel: d.rel, trust: d.trust, markerId: form.marker.value || undefined };''')

# wyszukiwarka: kod kontaktu
rep('''$("#q").addEventListener("input", (e) => { query = e.target.value; renderList(); });''',
    '''$("#q").addEventListener("input", (e) => { query = e.target.value; renderList(); });
$("#q").addEventListener("keydown", (e) => {
  const v = e.target.value.trim();
  if (e.key !== "Enter" || !v.startsWith("MJK:")) return;
  let c; try { c = JSON.parse(decodeURIComponent(escape(atob(v.slice(4))))); } catch {}
  if (!c || !c.name) return toast("Ten kod jest uszkodzony");
  const nc = { id: uid(), created: Date.now(), debt: 0, fav: false, log: [], name: String(c.name).slice(0, 50), phone: String(c.phone || "").slice(0, 20),
    fac: facById[c.fac] ? c.fac : "cywil", rel: relById[c.rel] ? c.rel : "neutralny", trust: Math.min(5, Math.max(1, +c.trust || 3)), place: String(c.place || "").slice(0, 60), note: String(c.note || "").slice(0, 1500) };
  db.contacts.push(nc); selected = nc.id; e.target.value = ""; query = ""; save(); renderAll(); toast("Dodano kontakt z kodu: " + nc.name);
});

/* ---------- powiązania z mapą i kody ---------- */
function mapState() { try { return JSON.parse(localStorage.getItem("majestic-mapa-v1")) || {}; } catch { return {}; } }
function myMarkers() { return (mapState().markers || []).filter((m) => !m.builtin || m.fav).sort((a, b) => a.name.localeCompare(b.name, "pl")); }
function mapMarker(id) { return id ? (mapState().markers || []).find((m) => m.id === id) : null; }
function shareCode(c) {
  const d = { name: c.name, phone: c.phone, fac: c.fac, rel: c.rel, trust: c.trust, place: c.place, note: c.note };
  return "MJK:" + btoa(unescape(encodeURIComponent(JSON.stringify(d))));
}
Host.onPayload((p) => { if (p.select && byId(p.select)) { selected = p.select; mode = "view"; renderAll(); } });''')

# kopiowanie z własnym komunikatem + ikona udostępniania
rep('''async function copy(text) {''', '''async function copy(text, msg) {''')
rep('''  toast("Skopiowano numer " + text);''', '''  toast(msg || "Skopiowano numer " + text);''')
rep('''  check: '<path d="M5 12l5 5 9-10"/>',''', '''  check: '<path d="M5 12l5 5 9-10"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',''')
open(p, "w", encoding="utf8").write(s)
print("ok")

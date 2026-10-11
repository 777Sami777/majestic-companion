"""Buduje web/markers.js z punktów oficjalnej mapy Majestic Wiki (tools/majestic_wiki.txt)."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CATEGORIES = [
  ("sluzby",  "Służby państwowe",   "#4d8dff", "shield"),
  ("gangi",   "Gangi i organizacje","#ff5a6a", "skull"),
  ("prace",   "Prace",              "#f5b544", "briefcase"),
  ("zbieranie","Farmy, ryby, grzyby","#a4e05a", "leaf"),
  ("craft",   "Crafting",           "#ff8a3d", "hammer"),
  ("warsztaty","Warsztaty i tuning","#b07cff", "wrench"),
  ("sklepy",  "Sklepy",             "#2fd4d4", "bag"),
  ("bron",    "Sklepy z bronią",    "#ff7a59", "target"),
  ("wyglad",  "Ubrania, fryzjer, tatuaż","#ff7ac6", "shirt"),
  ("bank",    "Banki",              "#3ddc97", "bank"),
  ("paliwo",  "Stacje paliw",       "#d4e157", "fuel"),
  ("transport","Transport i wynajem","#7fd1ff", "car"),
  ("nieruchomosci","Nieruchomości i magazyny","#c9a27a", "home"),
  ("rozrywka","Rozrywka i miejsca", "#ffe066", "star"),
  ("moje",    "Moje znaczniki",     "#ffffff", "pin"),
]
ICON_CAT = {
  "lspd":"sluzby","lscsd":"sluzby","ems":"sluzby","fib":"sluzby","sang":"sluzby","government":"sluzby",
  "court":"sluzby","weazle-news":"sluzby","jail":"sluzby","vehicle-registration":"sluzby","parking-fine":"sluzby",
  "ballas":"gangi","vagos":"gangi","famillies":"gangi","bloods":"gangi","marabunta":"gangi","biker":"gangi",
  "nettle-grower":"gangi","wolf":"gangi","arm":"gangi",
  "job":"prace","quests":"prace",
  "farm":"zbieranie","fishing":"zbieranie","mushrooms":"zbieranie","forest":"zbieranie",
  "craft-1":"craft","craft-2":"craft","craft-3":"craft","craft-s-1":"craft","craft-s-2":"craft","craft-s-3":"craft",
  "autoservice":"warsztaty","lsc":"warsztaty","auto-repair":"warsztaty","special-tuning":"warsztaty",
  "car-washing":"warsztaty","utilization":"warsztaty","drift":"warsztaty",
  "grocery-store":"sklepy","market":"sklepy","marketplace":"sklepy","car-market":"sklepy","auto-shop":"sklepy",
  "bike-spawn":"sklepy","custom":"sklepy",
  "gunshop":"bron",
  "clothing-store":"wyglad","tattoo":"wyglad","barbershop":"wyglad",
  "bank":"bank","gas-station":"paliwo",
  "car-rent":"transport","boat-rent":"transport","boat-station":"transport","anchor":"transport",
  "aircraft-spawn":"transport","truck-spawn":"transport","airport":"transport","flying-school":"transport",
  "driving-school":"transport","car-point":"transport","spawn":"transport",
  "free-premises":"nieruchomosci","mansion":"nieruchomosci","apartment":"nieruchomosci","office":"nieruchomosci",
  "warehouse":"nieruchomosci","container":"nieruchomosci","pvz":"nieruchomosci",
  "casino":"rozrywka","bar":"rozrywka","strip-club":"rozrywka","cinema":"rozrywka","betting":"rozrywka",
  "church":"rozrywka","university":"rozrywka","arena":"rozrywka","gym":"rozrywka",
}
# nazwy dla punktów bez nazwy na wiki
FALLBACK = {
  "farm":"Farma","gas-station":"Stacja benzynowa","boat-station":"Przystań łodziowa","anchor":"Przystań",
  "craft-1":"Craft","craft-2":"Craft","craft-3":"Craft","craft-s-1":"Craft z materiałów medycznych",
  "craft-s-2":"Craft z materiałów do broni","craft-s-3":"Craft z materiałów technicznych","pvz":"Punkt odbioru zamówień",
  "free-premises":"Pokój wolnego celu","car-washing":"Myjnia","spawn":"Spawn","job":"Praca","car-point":"Punkt pojazdów",
  "special-tuning":"Tuning specjalny","quests":"Zadania","arm":"Punkt organizacji","wolf":"Punkt organizacji",
  "autoservice":"Autoserwis","custom":"Salon samochodowy","lspd":"Los Santos Police Department",
  "car-rent":"Wynajem samochodów","auto-repair":"Warsztat samochodowy",
}
NOTE = {
  "pvz":"Punkt odbioru zamówień (PVZ).","free-premises":"Lokal do wynajęcia na biznes.",
  "spawn":"Miejsce pojawienia się po wejściu na serwer.","car-point":"Punkt wydawania pojazdów.",
}

markers = []
for line in open(os.path.join(ROOT, "tools", "majestic_wiki.txt"), encoding="utf-8"):
    line = line.strip()
    if not line: continue
    i, name, icon, x, y = line.split(";")
    name = name.strip()
    if not name or name == "undefined":
        name = FALLBACK.get(icon, icon)
    cat = ICON_CAT.get(icon, "rozrywka")
    markers.append([cat, name, int(x), int(y), NOTE.get(icon, "")])

counts = {}
for m in markers: counts[m[0]] = counts.get(m[0], 0) + 1
cats = [dict(id=c, name=n, color=col, icon=ic, **({"custom": True} if c == "moje" else {})) for c, n, col, ic in CATEGORIES]
js = ("// Punkty z oficjalnej mapy Majestic Wiki (wiki.gta5majestic.com/pl/map), warstwa „Standardowe znaczniki”.\n"
      "// Współrzędne świata GTA V (x, y). Wygenerowane przez tools/build_markers.py.\n"
      "window.MARKERS_VERSION = 2;\n"
      "window.CATEGORIES = " + json.dumps(cats, ensure_ascii=False, indent=1) + ";\n\n"
      "window.DEFAULT_MARKERS = [\n" + ",\n".join("  " + json.dumps(m, ensure_ascii=False) for m in markers) + "\n];\n")
open(os.path.join(ROOT, "web", "markers.js"), "w", encoding="utf-8").write(js)
print(len(markers), counts)

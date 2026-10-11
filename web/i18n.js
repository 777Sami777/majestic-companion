/* Wersja angielska: podmienia polskie napisy interfejsu (tekst, placeholder, title, aria-label).
   shortcut: dokładne dopasowanie całego napisu; teksty z liczbami w środku zostają po polsku, do przepisania na klucze przy pełnym i18n. */
(() => {
  const EN = {
    "+ Nowy przepis": "+ New recipe", "+ Strefa": "+ Zone", "+ Trasa": "+ Route", "0 osób": "0 people", "0 znaczników": "0 markers",
    "1 h wcześniej": "1 h before", "15 min wcześniej": "15 min before", "2 dni temu": "2 days ago", "30 min wcześniej": "30 min before", "5 min wcześniej": "5 min before",
    "Adres webhooka Discorda": "Discord webhook URL", "Aktualizuj": "Update", "Aktualizuj teraz": "Update now", "Aktualizuj z wiki": "Update from wiki",
    "Alfabetycznie": "Alphabetical", "Aplikacja włącza się sama po uruchomieniu komputera, schowana przy zegarze.": "The app starts with your PC, hidden next to the clock.",
    "Atlas": "Atlas", "Bagażnik": "Trunk", "Bardzo duży": "Extra large", "Bez handlu (donate/unikat)": "Not tradable (donate/unique)", "Cele tygodnia": "Weekly goals",
    "Cena": "Price", "Ciche kliknięcie przy przyciskach.": "Quiet click on buttons.", "Ciężarówki": "Trucks", "Co się wydarzyło": "What happened",
    "Czas (min)": "Time (min)", "Czas gry dziś": "Playtime today", "Dane": "Data",
    "Dane zapisują się tylko na tym komputerze. Kopia zapasowa pozwala przenieść wszystko na inny komputer.": "Data is stored only on this PC. A backup lets you move everything to another computer.",
    "Data wydarzenia": "Event date", "Dla tego serwera pobierane są terytoria gangów z wiki.": "Gang territories from the wiki are downloaded for this server.",
    "Dodaj": "Add", "Dodaj folder": "Add folder", "Dodaj własny tekst do tej kategorii…": "Add your own line to this category…", "Dodaj znacznik": "Add marker",
    "Dodatkowe foldery ze zrzutami": "Extra screenshot folders", "Dostępność": "Availability", "Drogi": "Roads", "Duży": "Large", "Dziennik postaci": "Character journal",
    "Dzisiaj": "Today", "Dziś": "Today", "Dziś (Ctrl+1)": "Today (Ctrl+1)", "Długi": "Debts", "Dźwięki interfejsu": "Interface sounds", "Ekipa": "Crew",
    "Ekipa: grafik, magazyn, raport (Ctrl+9)": "Crew: schedule, storage, report (Ctrl+9)", "Eksport": "Export", "Enter zapisuje · Shift+Enter nowa linia": "Enter saves · Shift+Enter new line",
    "Folder danych": "Data folder", "Frakcje": "Factions", "Gdy serwer ma przerwę i gdy znowu działa.": "When the server goes down for maintenance and when it is back.",
    "Godziny": "Hours", "Gra": "Game", "Gracze na serwerze": "Players on server", "Grafik": "Schedule", "Grafik ekipy": "Crew schedule",
    "Grafik i magazyn jako jeden kod. Wyślij go ekipie na Discordzie, a każdy wklei go u siebie. Nic nie trafia do internetu.": "Schedule and storage as one code. Send it to your crew on Discord and everyone pastes it in. Nothing goes online.",
    "Grafik spotkań z przypomnieniem, magazyn ekipy i gotowy raport do wklejenia na Discorda.": "Meeting schedule with reminders, crew storage and a ready report to paste on Discord.",
    "Ilość": "Quantity", "Ilość (szt.)": "Quantity (pcs)", "Imię postaci, do której mówisz": "Name of the character you talk to", "Import": "Import", "Ja wiszę": "I owe",
    "Jasny": "Light", "KONTAKTY": "CONTACTS", "Kontakty": "Contacts", "Kontakty (Ctrl+3)": "Contacts (Ctrl+3)", "Kalkulator craftingu": "Crafting calculator", "Kategorie": "Categories", "Kiedy": "When",
    "Klawisz pokazuje aplikację nad grą i chowa ją z powrotem. Gra musi działać w trybie okna bez ramki (Borderless).": "The key shows the app over the game and hides it again. The game must run in borderless window mode.",
    "Kliknij na mapie, gdzie postawić znacznik": "Click on the map to place a marker",
    "Kliknij tekst, a trafi do schowka. W grze wklejasz go w czat (Ctrl+V).": "Click a line to copy it. Paste it into the game chat (Ctrl+V).",
    "Kod ekipy": "Crew code", "Kolor akcentu": "Accent color", "Kompaktowy": "Compact", "Kopia zapasowa": "Backup", "Kopiuj kod ekipy": "Copy crew code", "Kopiuj raport": "Copy report",
    "Krzyżyk chowa okno do ikony przy zegarze. Minutniki, przypomnienia i powiadomienia działają dalej. Wyłączysz z menu ikony.": "The X button hides the window to the tray. Timers, reminders and notifications keep working. Quit from the tray icon menu.",
    "Licznik (sztuki × cena)": "Counter (pieces × price)", "MDT granat": "MDT navy", "Magazyn": "Storage", "Maksymalizuj": "Maximize", "Mapa": "Map", "Mapa (Ctrl+2)": "Map (Ctrl+2)",
    "Mapa ekipy na żywo": "Live crew map", "Mapa: nowy znacznik / tu jestem / zrzuty z gry": "Map: new marker / I'm here / game screenshots",
    "Mapa: rysuj trasę / strefę (Enter kończy, Backspace cofa)": "Map: draw route / zone (Enter finishes, Backspace undoes)",
    "Małe okienko na wierzchu z czasem sesji i najbliższym minutnikiem. Można je przeciągać.": "A small always-on-top window with session time and the next timer. You can drag it.",
    "Mini-widżet": "Mini widget", "Minimalizuj": "Minimize", "Minutnik": "Timer", "Minutniki": "Timers", "Minutniki (Ctrl+5)": "Timers (Ctrl+5)",
    "Minutniki liczą, gdy Majestic Companion jest włączony (może być zminimalizowany). Po ponownym uruchomieniu odliczanie wraca w to samo miejsce.": "Timers run while Majestic Companion is open (it can be minimized). After a restart the countdown continues where it was.",
    "Minuty": "Minutes", "Moduły": "Modules", "Motocykle": "Motorcycles", "Motyw": "Theme",
    "Na Discordzie: Ustawienia kanału → Integracje → Webhooki → Nowy webhook → Kopiuj URL. Wklej go tutaj.": "On Discord: Channel settings → Integrations → Webhooks → New webhook → Copy URL. Paste it here.",
    "Na czysto dziś": "Net today", "Najbliższe minutniki": "Next timers", "Nakładka nad grą": "In-game overlay", "Nazwa": "Name", "Nocny": "Night", "Normalny": "Normal",
    "Notatki": "Notes", "Nowy kontakt": "New contact",
    "Odliczanie cooldownów, wypłat i opłat. Gdy czas minie, dostaniesz powiadomienie Windows, nawet z grą na pierwszym planie.": "Countdowns for cooldowns, paydays and bills. When time is up you get a Windows notification, even with the game in front.",
    "Odsprzedaż": "Resale", "Ostatnio dodani": "Recently added", "Otwórz folder": "Open folder", "Paczka dla kolegi": "Pack for a friend", "Paliwo": "Fuel",
    "Pełny ekran": "Full screen", "Pełny ekran (F11)": "Full screen (F11)", "Po 1 h": "After 1 h", "Po 2 h": "After 2 h", "Po 3 h": "After 3 h", "Po 4 h": "After 4 h",
    "Pobiera aktualne dane z Majestic Wiki": "Downloads current data from Majestic Wiki", "Pojazd": "Vehicle", "Pojazdy": "Vehicles", "Pojazdy (Ctrl+7)": "Vehicles (Ctrl+7)",
    "Pokaż Majestic Companion": "Show Majestic Companion", "Pokaż panel (Tab)": "Show panel (Tab)", "Pokaż widżet": "Show widget", "Porównaj": "Compare",
    "Powiadomienie, gdy jedna sesja trwa dłużej niż wybrany czas.": "Notification when one session lasts longer than the chosen time.",
    "Powiększa albo zmniejsza tekst i przyciski we wszystkich zakładkach.": "Makes text and buttons bigger or smaller in all tabs.",
    "Powtarzaj": "Repeat", "Poza służbą": "Off duty", "Praca": "Job", "Przerwy techniczne serwera": "Server maintenance", "Przełączanie zakładek (0 = Ustawienia)": "Switch tabs (0 = Settings)",
    "Przyciski, wyróżnienia i aktywna zakładka.": "Buttons, highlights and the active tab.", "Przypomnienia z grafiku ekipy": "Crew schedule reminders",
    "Przypomnienie": "Reminder", "Przypomnienie o przerwie": "Break reminder", "Prędkość": "Speed", "Raport na Discorda": "Discord report", "Raport tygodnia": "Weekly report",
    "Rodzaj": "Type", "Rodzaj wpisu": "Entry type", "Rowery": "Bicycles", "Rysuj strefę (Z)": "Draw zone (Z)", "Rysuj trasę (R)": "Draw route (R)", "Samochody": "Cars", "Samoloty": "Planes",
    "Satelita": "Satellite", "Serwer Majestic": "Majestic server", "Skróty": "Shortcuts", "Sortowanie": "Sorting", "Sprawdzam…": "Checking…", "Sprawdź aktualizacje": "Check for updates",
    "Start z Windowsem": "Start with Windows", "Status gry": "Game status", "Statystyki": "Stats", "Statystyki gry": "Game stats", "Statystyki gry (Ctrl+4)": "Game stats (Ctrl+4)",
    "Styl mapy": "Map style", "Szeryf": "Sheriff", "Szukaj": "Search", "Szukaj (wklej tu kod MJM: albo MJK: od znajomego)": "Search (paste an MJM: or MJK: code from a friend here)",
    "Szukaj miejsca…": "Search places…", "Szukaj po imieniu, numerze, notatce…": "Search by name, number, note…", "Szukaj pojazdu": "Search vehicles", "Szukaj w aplikacji": "Search the app",
    "Szukaj w całej aplikacji": "Search the whole app", "Szukaj znaczników, kontaktów, notatek, tekstów RP…": "Search markers, contacts, notes, RP lines…",
    "Szukaj: nazwa albo model (np. sultan, Daimler)…": "Search: name or model (e.g. sultan, Daimler)…", "Szybka notatka": "Quick note", "Szybka notatka (działa też w grze)": "Quick note (works in game too)",
    "Szybkie": "Quick", "Te same co w powiadomieniach Windows, z zakładki Ekipa.": "The same as Windows notifications, from the Crew tab.", "Teksty RP": "RP lines", "Teksty RP (Ctrl+8)": "RP lines (Ctrl+8)",
    "Terminal gracza · łączenie": "Player terminal · connecting",
    "Terytoria gangów, strefy skarbów, skrytki, zbieractwo, airdropy, strefy gry i fotoradary. Pobieranie trwa ok. 30 s.": "Gang territories, treasure zones, stashes, gathering, airdrops, game zones and speed cameras. Download takes about 30 s.",
    "Trasy i strefy": "Routes and zones", "Treść notatki": "Note text", "Tu jestem": "I'm here", "Tu leżą zrzuty, ustawienia i pobrane warstwy.": "Screenshots, settings and downloaded layers live here.",
    "Twoje znaczniki, trasy, strefy i kontakty w jednym pliku. Kolega wczytuje ją u siebie, a jego własne dane zostają.": "Your markers, routes, zones and contacts in one file. Your friend loads it and keeps their own data.",
    "Tylko na handel": "Tradable only", "Ukryj wszystkie": "Hide all", "Ulubione": "Favorites", "Ulubione miejsca": "Favorite places", "Uruchamianie": "Startup", "Ustawienia": "Settings",
    "Ustawienia (Ctrl+0)": "Settings (Ctrl+0)", "W chwili startu": "At start time", "W niedzielę wieczorem: godziny gry, zarobek, najlepsza praca.": "Sunday evening: playtime, earnings, best job.",
    "Warstwy z Majestic Wiki": "Majestic Wiki layers", "Warstwy z wiki": "Wiki layers", "Wczoraj": "Yesterday", "Wczytaj": "Load", "Wczytaj kopię": "Restore backup", "Wczytaj paczkę": "Load pack",
    "Wczytaj znaczniki z pliku": "Load markers from file", "Webhook kanału ekipy": "Crew channel webhook", "Wersja aplikacji": "App version", "Widok": "View", "Wielkość interfejsu": "Interface size",
    "Wiszą mi": "Owed to me", "Wklej kod MJE:…": "Paste MJE: code…", "Wklej zrzut ekranu do otwartego znacznika": "Paste a screenshot into the open marker", "Wojskowy": "Military",
    "Wpisz przepis raz: co powstaje, z jakich materiałów i ile one kosztują. Potem ustaw liczbę sztuk, a kalkulator policzy materiały, koszt i zysk.": "Enter a recipe once: what it makes, from which materials and what they cost. Then set the amount and the calculator works out materials, cost and profit.",
    "Wszyscy": "Everyone", "Wszystkie": "All", "Wszystkie auta, motocykle, łodzie i śmigłowce z Majestic Wiki. Zaznacz do trzech, żeby je porównać przed zakupem.": "All cars, bikes, boats and helicopters from Majestic Wiki. Tick up to three to compare them before buying.",
    "Wszystkie rodzaje": "All types", "Wydatek": "Expense", "Wygląd i wygoda": "Look and comfort", "Wyniki": "Results", "Wyłączone": "Off", "Z chipem": "With chip", "Zamknij": "Close",
    "Zamknij (Ctrl+Shift+N)": "Close (Ctrl+Shift+N)", "Zamknij (Esc)": "Close (Esc)", "Zamknij widżet": "Close widget", "Zamykanie chowa do zasobnika": "Closing hides to tray",
    "Zapisuj zarobki, zebrane sztuki i wydatki. Zobaczysz, która praca płaci najwięcej na godzinę i ile zostaje na czysto.": "Log earnings, gathered pieces and expenses. See which job pays most per hour and what is left net.",
    "Zapisz": "Save", "Zapisz kopię": "Save backup", "Zapisz paczkę": "Save pack", "Zapisz znaczniki do pliku": "Save markers to file", "Zarobek": "Earnings", "Zarobki": "Earnings", "Zarobki (Ctrl+6)": "Earnings (Ctrl+6)",
    "Zaufanie": "Trust", "Zawsze sprawdzam NVIDIA, Xbox Game Bar, Medal, Wycinanie i folder GTA V. Dodaj własny, jeśli zapisujesz zrzuty gdzie indziej.": "NVIDIA, Xbox Game Bar, Medal, Snipping Tool and the GTA V folder are always checked. Add your own if you save screenshots elsewhere.",
    "Zaznacz, gdzie jesteś w grze (H)": "Mark where you are in game (H)", "Zmienia kolory całej aplikacji. Jasne motywy przydają się w dzień.": "Changes the colors of the whole app. Light themes help during the day.",
    "Znaczniki, kontakty, minutniki, zarobki, własne teksty RP, ustawienia i zrzuty w jednym pliku ZIP.": "Markers, contacts, timers, earnings, your RP lines, settings and screenshots in one ZIP file.",
    "Zrzuty": "Screenshots", "Zrzuty ekranu": "Screenshots", "Zrzuty ekranu z gry (G)": "Game screenshots (G)", "Zwiń panel (Tab)": "Collapse panel (Tab)",
    "aktywne": "active", "anuluje": "cancels", "brak": "none", "tekst": "text", "z logów Majestic": "from Majestic logs", "zamienia się na imię postaci, którą wpiszesz niżej.": "is replaced with the character name you enter below.",
    "zarobki minus wydatki": "earnings minus expenses", "Łodzie": "Boats", "ładowanie…": "loading…", "Śmigłowce": "Helicopters",
    "np. Dostałem pracę w LSPD, poznałem Marka z Vagos…": "e.g. Got a job at LSPD, met Mark from Vagos…", "np. Grzyby w Paleto": "e.g. Mushrooms in Paleto", "np. Górnik": "e.g. Miner",
    "np. Materiały do broni": "e.g. Weapon materials", "np. Zbiórka na Grove Street": "e.g. Meetup at Grove Street", "np. numer tablicy, kto był na akcji, cena u dilera…": "e.g. plate number, who was on the job, dealer price…",
    /* napisy z kodu modułów */
    "Brak wpisów": "No entries", "Brak kontaktów": "No contacts", "Brak minutników": "No timers", "Pusty grafik": "Empty schedule", "Pusty magazyn": "Empty storage",
    "Najbardziej opłacalne ($ / godz.)": "Most profitable ($ / h)", "Ostatnie wpisy": "Recent entries", "Serwer na żywo": "Live server", "Newsy Majestic": "Majestic news",
    "Ostatnie 14 dni": "Last 14 days", "Sesje": "Sessions", "Czas gry w tym tygodniu": "Playtime this week", "Zarobek w tym tygodniu": "Earnings this week", "Cel na tydzień": "Weekly goal",
    "Dzisiaj na czysto": "Net today", "Ten tydzień na czysto": "Net this week", "Wydatki w tym tygodniu": "Expenses this week", "Średnio na godzinę": "Average per hour",
    "Ten tydzień": "This week", "Razem w logach": "Total in logs", "Średnia sesja": "Average session", "Folder logów": "Logs folder", "Czas gry": "Playtime", "Zarobek na czysto": "Net earnings",
    "Terytoria gangów": "Gang territories", "Strefy skarbów": "Treasure zones", "Skrytki kontrabandy": "Contraband stashes", "Zbieractwo": "Gathering", "Grzybiarz": "Mushroom picking",
    "Zwierzęta (polowanie)": "Animals (hunting)", "Zrzuty zaopatrzenia": "Supply drops", "Strefy gry": "Game zones", "Fotoradary": "Speed cameras",
    "Wyznacz trasę przez te strefy": "Plan a route through these zones", "Połącz": "Connect", "Rozłącz": "Disconnect", "Kopiuj": "Copy", "Kod": "Code", "Edytuj": "Edit", "Przesuń": "Move",
    "Usuń z mapy": "Remove from map", "Dziennik": "Journal", "Wklej": "Paste", "Z gry": "From game", "Z pliku": "From file", "Anuluj": "Cancel", "Usuń": "Delete",
    "Przyjaciel": "Friend", "Biznes": "Business", "Neutralny": "Neutral", "Wróg": "Enemy", "Pojawią się po dodaniu kontaktów": "They appear after you add contacts",
  };
  const ATTRS = ["placeholder", "title", "aria-label"];
  const tr = (s) => { const k = s.trim(); const v = k && EN[k]; return v ? s.replace(k, v) : null; };
  function walk(root) {
    if (root.nodeType === 3) { const v = tr(root.nodeValue); if (v) root.nodeValue = v; return; }
    if (root.nodeType !== 1 || root.tagName === "SCRIPT" || root.tagName === "STYLE") return;
    for (const a of ATTRS) { const cur = root.getAttribute && root.getAttribute(a); if (cur) { const v = tr(cur); if (v) root.setAttribute(a, v); } }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeType === 3) { const v = tr(n.nodeValue); if (v) n.nodeValue = v; }
      else for (const a of ATTRS) { const cur = n.getAttribute(a); if (cur) { const v = tr(cur); if (v) n.setAttribute(a, v); } }
    }
  }
  const start = () => {
    document.documentElement.lang = "en";
    walk(document.body);
    new MutationObserver((ms) => { for (const m of ms) { if (m.type === "characterData") walk(m.target); else m.addedNodes.forEach(walk); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();

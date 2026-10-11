"""Majestic Companion — mapa, kontakty i statystyki gry w jednym oknie (pywebview + WebView2).

Strony ładują się prosto z plików. Python odpowiada tylko na kilka lekkich wywołań:
status gry, historia sesji z logów klienta Majestic, zrzuty ekranu i pełny ekran.
Gra nie jest w żaden sposób dotykana: czytamy wyłącznie listę procesów,
pliki logów, które klient Majestic sam zapisuje, i foldery ze zrzutami.
"""
import base64
import datetime as dt
import io
import json
import os
import re
import subprocess
import sys
import threading
import time
import uuid
import zipfile


def unblock_own_files():
    """Zdejmuje znacznik "pobrane z internetu" (Zone.Identifier) z plików aplikacji.

    Po pobraniu ZIP-a Windows oznacza każdy wypakowany plik, a .NET odmawia wtedy
    wczytania bibliotek okna (błąd "zestaw z lokalizacji sieciowej", 0x80131515).
    """
    if os.name != "nt":
        return
    base = getattr(sys, "_MEIPASS", None)
    if not base:
        return
    roots = [base, os.path.dirname(sys.executable)]
    for root in roots:
        for folder, _, files in os.walk(root):
            for name in files:
                try:
                    os.remove(os.path.join(folder, name) + ":Zone.Identifier")
                except OSError:
                    pass


unblock_own_files()

import webview  # noqa: E402  (musi być po zdjęciu blokady)
from PIL import Image, ImageGrab  # noqa: E402

APP_NAME = "Majestic Companion"
APP_VERSION = "2.0.0"
GITHUB_REPO = "777Sami777/majestic-companion"  # "login/repozytorium": aktualizator sprawdza tam najnowsze wydanie
APPDATA = os.environ.get("APPDATA", os.path.expanduser("~"))
DATA_DIR = os.path.join(APPDATA, "MajesticMapa")  # ta sama nazwa co wcześniej: znaczniki zostają
SHOTS_DIR = os.path.join(DATA_DIR, "zrzuty")
LOGS_DIR = os.path.join(APPDATA, "majestic-launcher", "Multiplayer", "logs")
GAME_PROCESSES = ("gta5.exe", "gta5_enhanced.exe", "playgtav.exe")
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".bmp", ".webp")
HOME = os.path.expanduser("~")
SCREENSHOT_DIRS = [
    os.path.join(HOME, "Pictures", "Screenshots"),
    os.path.join(HOME, "Videos", "Captures"),
    os.path.join(HOME, "Videos", "NVIDIA"),
    os.path.join(HOME, "Videos", "Medal"),
    os.path.join(HOME, "Pictures", "Medal"),
    os.path.join(HOME, "Documents", "Rockstar Games", "GTA V", "Screenshots"),
]
NO_WINDOW = 0x08000000
SETTINGS_FILE = os.path.join(DATA_DIR, "ustawienia.json")
WIKI_FILE = os.path.join(DATA_DIR, "warstwy_wiki.json")
TERR_FILE = os.path.join(DATA_DIR, "historia_terytoriow.json")
RUN_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"
WIKI_LAYERS = ["captures", "treasure", "stash", "gatherer", "mushroomer", "animal", "airdrop", "game-zones", "dmv-cameras"]


def resource(*parts):
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, *parts)


def file_url(path):
    return "file:///" + path.replace("\\", "/")


def _parse_log(path):
    """Jedna sesja z pliku client_RRRR-MM-DD_GG-MM-SS.log."""
    m = re.search(r"client_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})", os.path.basename(path))
    if not m:
        return None
    start = dt.datetime.strptime(f"{m[1]} {m[2]}:{m[3]}:{m[4]}", "%Y-%m-%d %H:%M:%S")
    server = connected = last = None
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            if server is None and "Connect name:" in line:
                server = line.split("Connect name:", 1)[1].strip()
            if connected is None and "Connection complete!" in line:
                connected = line[1:13]
            if line.startswith("[") and len(line) > 13 and line[3] == ":":
                last = line[1:13]

    def at(hms):
        t = dt.datetime.strptime(f"{start:%Y-%m-%d} {hms[:8]}", "%Y-%m-%d %H:%M:%S")
        return t + dt.timedelta(days=1) if t < start - dt.timedelta(minutes=1) else t

    end = at(last) if last else start
    if end < start:
        end = start
    begin = at(connected) if connected else start
    return {
        "file": os.path.basename(path),
        "server": server or "?",
        "start": start.timestamp() * 1000,
        "joined": begin.timestamp() * 1000,
        "end": end.timestamp() * 1000,
        "played": max(0, (end - begin).total_seconds()) if connected else 0,
        "connected": bool(connected),
    }


class Api:
    def __init__(self):
        self._window = None
        self._log_cache = {}
        self._started = time.time()

    # ---------- gra ----------
    def game_status(self):
        try:
            out = subprocess.run(["tasklist", "/FO", "CSV", "/NH"], capture_output=True, text=True,
                                 creationflags=NO_WINDOW, timeout=5).stdout.lower()
        except Exception:
            out = ""
        running = any(f'"{p}"' in out for p in GAME_PROCESSES)
        current = None
        if running:
            logs = sorted(self._log_files(), key=os.path.getmtime)
            if logs:
                current = _parse_log(logs[-1])
        return {"running": running, "session": current}

    def _log_files(self):
        if not os.path.isdir(LOGS_DIR):
            return []
        return [os.path.join(LOGS_DIR, f) for f in os.listdir(LOGS_DIR) if f.startswith("client_") and f.endswith(".log")]

    def live(self):
        """Publiczne API Majestic (to samo co launcher): gracze online, kolejka, przerwy, newsy."""
        import urllib.request
        def get(url):
            req = urllib.request.Request(url, headers={"User-Agent": "MajesticCompanion"})
            with urllib.request.urlopen(req, timeout=8) as r:
                return json.load(r).get("result") or {}
        out = {"servers": [], "news": [], "nick": ""}
        try:
            out["servers"] = [{k: s.get(k) for k in ("id", "name", "region", "players", "queuedPlayers", "techWorks", "status")}
                              for s in get("https://api.majestic-files.com/meta/servers").get("servers", [])]
        except Exception:
            pass
        try:
            out["news"] = [{k: n.get(k) for k in ("id", "title", "previewUrl", "publishedAt")}
                           for n in get("https://api.majestic-files.com/news?region=eu").get("items", [])[:6]]
            for n in out["news"]:  # domena .net bywa niedostępna, ta sama grafika leży na .com
                n["previewUrl"] = (n.get("previewUrl") or "").replace("majestic-files.net", "majestic-files.com")
        except Exception:
            pass
        try:
            with open(os.path.join(os.path.dirname(LOGS_DIR), "majestic.json"), encoding="utf8") as f:
                out["nick"] = json.load(f).get("name", "")
        except Exception:
            pass
        return out

    def sessions(self):
        result = []
        for path in self._log_files():
            key = (path, os.path.getmtime(path), os.path.getsize(path))
            if key not in self._log_cache:
                try:
                    self._log_cache[key] = _parse_log(path)
                except Exception:
                    self._log_cache[key] = None
            if self._log_cache[key]:
                result.append(self._log_cache[key])
        result.sort(key=lambda s: s["start"], reverse=True)
        return {"logsDir": LOGS_DIR, "found": os.path.isdir(LOGS_DIR), "sessions": result}

    # ---------- zrzuty ekranu ----------
    def recent_screenshots(self, since_ms=0, limit=24):
        since = max(since_ms / 1000, time.time() - 3 * 86400)
        found = []
        for d in SCREENSHOT_DIRS + list(load_settings().get("shotDirs") or []):
            if not os.path.isdir(d):
                continue
            for folder, _, files in os.walk(d):
                for name in files:
                    if name.lower().endswith(IMAGE_EXT):
                        p = os.path.join(folder, name)
                        try:
                            t = os.path.getmtime(p)
                        except OSError:
                            continue
                        if t > since:
                            found.append((t, p))
        found.sort(reverse=True)
        return [{"path": p, "url": file_url(p), "time": t * 1000, "name": os.path.basename(p)} for t, p in found[:limit]]

    def _store(self, img):
        os.makedirs(SHOTS_DIR, exist_ok=True)
        img = img.convert("RGB")
        img.thumbnail((1920, 1920))
        name = uuid.uuid4().hex[:12] + ".jpg"
        img.save(os.path.join(SHOTS_DIR, name), "JPEG", quality=88)
        return name

    def import_image_file(self, path):
        """Kopiuje zrzut (np. z folderu NVIDIA) do danych aplikacji."""
        with Image.open(path) as img:
            return self._store(img)

    def import_image_data(self, data_url):
        """Zapisuje obraz wklejony (Ctrl+V) albo przeciągnięty na okno."""
        raw = base64.b64decode(data_url.split(",", 1)[1])
        with Image.open(io.BytesIO(raw)) as img:
            return self._store(img)

    def paste_clipboard_image(self):
        img = ImageGrab.grabclipboard()
        if isinstance(img, Image.Image):
            return self._store(img)
        if isinstance(img, list):
            for p in img:
                if str(p).lower().endswith(IMAGE_EXT):
                    return self.import_image_file(p)
        return None

    def pick_image(self):
        result = self._window.create_file_dialog(webview.OPEN_DIALOG, allow_multiple=True,
                                                file_types=("Obrazy (*.png;*.jpg;*.jpeg;*.bmp;*.webp)",))
        return [self.import_image_file(p) for p in (result or [])]

    def delete_image(self, name):
        try:
            os.remove(os.path.join(SHOTS_DIR, os.path.basename(name)))
        except OSError:
            pass
        return True

    def shots_base(self):
        return file_url(SHOTS_DIR) + "/"

    # ---------- okno ----------
    def win_min(self):
        self._window.minimize()

    def win_max(self):
        self._maxed = not getattr(self, "_maxed", False)
        self._window.maximize() if self._maxed else self._window.restore()
        return self._maxed

    def win_close(self):
        if load_settings().get("trayOnClose", True) and getattr(self, "_tray", None):
            self._window.hide()  # minutniki i przypomnienia dalej działają w tle
        else:
            self.quit_app()

    def toggle_fullscreen(self):
        self._window.toggle_fullscreen()
        return True

    def open_folder(self, which):
        path = {"logs": LOGS_DIR, "shots": SHOTS_DIR, "data": DATA_DIR}.get(which)
        if path and os.path.isdir(path):
            os.startfile(path)
        return True

    def toggle_overlay(self):
        """Pokazuje okno nad grą albo je chowa (klawisz z ustawień, domyślnie F10)."""
        # WinAPI zamiast metod pywebview: te wołane z wątku API/skrótu zakleszczały okno
        import ctypes
        from ctypes import wintypes
        user32 = ctypes.windll.user32
        # bez argtypes uchwyt -1 (HWND_TOPMOST) obcina się do 32 bitów i Windows go ignoruje
        user32.SetWindowPos.argtypes = [wintypes.HWND, wintypes.HWND, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_uint]
        user32.FindWindowW.restype = wintypes.HWND
        hwnd = user32.FindWindowW(None, APP_NAME)
        if not hwnd:
            return False
        self._overlay = not getattr(self, "_overlay", False)
        flags = 0x0001 | 0x0002 | 0x0010  # SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE
        if self._overlay:
            user32.ShowWindowAsync(hwnd, 9)  # SW_RESTORE
            user32.SetWindowPos(hwnd, wintypes.HWND(-1), 0, 0, 0, 0, flags)  # HWND_TOPMOST
            user32.SetForegroundWindow(hwnd)
        else:
            user32.SetWindowPos(hwnd, wintypes.HWND(-2), 0, 0, 0, 0, flags)  # HWND_NOTOPMOST
            user32.ShowWindowAsync(hwnd, 6)  # SW_MINIMIZE
        return self._overlay

    # ---------- mini-widżet ----------
    def _main_hwnd(self):
        import ctypes
        return ctypes.windll.user32.FindWindowW(None, APP_NAME)

    def win_rect(self):
        import ctypes
        from ctypes import wintypes
        r = wintypes.RECT()
        ctypes.windll.user32.GetWindowRect(self._main_hwnd(), ctypes.byref(r))
        return [r.left, r.top, r.right - r.left, r.bottom - r.top]

    def win_set(self, x, y, w, h):
        """Zmiana rozmiaru za krawędzie (okno bez ramki nie ma własnych uchwytów)."""
        import ctypes
        w, h = max(1000, int(w)), max(640, int(h))
        ctypes.windll.user32.MoveWindow(self._main_hwnd(), int(x), int(y), w, h, True)
        return True

    def capture_map(self):
        """Zdjęcie okna: zapis do Obrazy/Majestic i kopia do schowka (Ctrl+V na Discordzie)."""
        import ctypes
        from PIL import ImageGrab
        x, y, w, h = self.win_rect()
        img = ImageGrab.grab((x, y, x + w, y + h), all_screens=True).convert("RGB")
        out_dir = os.path.join(HOME, "Pictures", "Majestic")
        os.makedirs(out_dir, exist_ok=True)
        path = os.path.join(out_dir, dt.datetime.now().strftime("mapa_%Y-%m-%d_%H-%M-%S.png"))
        img.save(path)
        buf = io.BytesIO()
        img.save(buf, "BMP")
        data = buf.getvalue()[14:]  # CF_DIB = BMP bez nagłówka pliku
        k32, u32 = ctypes.windll.kernel32, ctypes.windll.user32
        k32.GlobalAlloc.restype = ctypes.c_void_p
        k32.GlobalLock.restype = ctypes.c_void_p
        k32.GlobalLock.argtypes = k32.GlobalUnlock.argtypes = [ctypes.c_void_p]
        u32.SetClipboardData.argtypes = [ctypes.c_uint, ctypes.c_void_p]
        copied = False
        if u32.OpenClipboard(None):
            try:
                u32.EmptyClipboard()
                hmem = k32.GlobalAlloc(0x0002, len(data))
                ctypes.memmove(k32.GlobalLock(hmem), data, len(data))
                k32.GlobalUnlock(hmem)
                copied = bool(u32.SetClipboardData(8, hmem))
            finally:
                u32.CloseClipboard()
        return {"path": path, "copied": copied}

    def toggle_note(self):
        if getattr(self, "_note", None):
            try:
                self._note.destroy()
            except Exception:
                pass
            self._note = None
            return False
        import ctypes
        sw = ctypes.windll.user32.GetSystemMetrics(0)
        self._note = webview.create_window(
            "Majestic Notatka", file_url(resource("web", "notatka.html")), js_api=self,
            width=380, height=300, x=sw - 400, y=110, frameless=True, on_top=True, resizable=False,
            background_color="#0a1424", easy_drag=False)
        self._note.events.closed += lambda: setattr(self, "_note", None)
        return True

    def open_widget(self):
        if getattr(self, "_widget", None):
            return True
        import ctypes
        sw = ctypes.windll.user32.GetSystemMetrics(0)
        self._widget = webview.create_window(
            "Majestic Widget", file_url(resource("web", "widget.html")), js_api=self,
            width=330, height=74, x=sw - 350, y=16, frameless=True, on_top=True, resizable=False,
            background_color="#0c0e13", easy_drag=True)
        self._widget.events.closed += lambda: setattr(self, "_widget", None)
        return True

    def close_widget(self):
        w = getattr(self, "_widget", None)
        self._widget = None
        if w:
            threading.Thread(target=w.destroy, daemon=True).start()  # destroy z osobnego wątku: bez zakleszczenia wywołania z JS
        return True

    def show_main(self):
        import ctypes
        from ctypes import wintypes
        user32 = ctypes.windll.user32
        user32.FindWindowW.restype = wintypes.HWND
        hwnd = user32.FindWindowW(None, APP_NAME)
        if hwnd:
            user32.ShowWindowAsync(hwnd, 9)
            user32.SetForegroundWindow(hwnd)
        return True

    # ---------- ustawienia ----------
    def get_settings(self):
        return load_settings()

    def set_settings(self, data):
        s = load_settings()
        s.update({k: v for k, v in (data or {}).items() if k in DEFAULT_SETTINGS})
        save_json(SETTINGS_FILE, s)
        start_hotkey(self)
        return s

    def pick_folder(self):
        result = self._window.create_file_dialog(webview.FOLDER_DIALOG)
        return result[0] if result else None

    # ---------- powiadomienia Windows ----------
    def notify(self, title, text):
        ps = (
            "[Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime]>$null;"
            "$x=[Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent(1);"
            "$t=$x.GetElementsByTagName('text');"
            "$t.Item(0).AppendChild($x.CreateTextNode($env:MJ_T))>$null;$t.Item(1).AppendChild($x.CreateTextNode($env:MJ_B))>$null;"
            "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Majestic Companion').Show([Windows.UI.Notifications.ToastNotification]::new($x))"
        )
        env = dict(os.environ, MJ_T=str(title)[:120], MJ_B=str(text)[:240])  # tekst przez zmienne: bez wstrzykiwania w polecenie
        subprocess.Popen(["powershell", "-NoProfile", "-Command", ps], env=env, creationflags=NO_WINDOW)
        return True

    # ---------- warstwy z Majestic Wiki ----------
    def wiki_layers(self):
        try:
            with open(WIKI_FILE, encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            pass
        try:  # pierwsze uruchomienie: warstwy dołączone do aplikacji, "Aktualizuj" pobiera świeże
            with open(resource("warstwy_wiki.json"), encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            return None

    @staticmethod
    def _terr_counts(data):
        counts = {}
        for c in (data or {}).get("layers", {}).get("captures", []):
            if c.get("t") == "cell" and c.get("o"):
                counts[str(c["o"])] = counts.get(str(c["o"]), 0) + 1
        return counts

    def _record_territories(self, new):
        """Zapisuje, ile pól ma każda rodzina, i różnicę względem poprzedniej aktualizacji."""
        if not new["layers"].get("captures"):
            return
        try:
            with open(WIKI_FILE, encoding="utf-8") as f:
                old = json.load(f)
        except Exception:
            old = None
        hist = load_json(TERR_FILE, [])
        now = self._terr_counts(new)
        before = self._terr_counts(old) if old and old.get("server") == new["server"] else (hist[-1]["counts"] if hist else None)
        # pierwszy zapis to punkt odniesienia: bez niego każda rodzina wyglądałaby na „zdobywcę”
        diff = {} if before is None else {k: now.get(k, 0) - before.get(k, 0) for k in set(now) | set(before) if now.get(k, 0) != before.get(k, 0)}
        hist.append({"at": new["at"], "server": new["server"], "counts": now, "diff": diff})
        save_json(TERR_FILE, hist[-60:])

    def wiki_history(self):
        return load_json(TERR_FILE, [])

    def wiki_sync(self, server="PL1"):
        """Otwiera mapy wiki w ukrytym oknie WebView2 i zapisuje znaczniki warstw.

        Wiki chroni Cloudflare, więc zwykłe pobieranie nie działa; prawdziwa przeglądarka okna przechodzi."""
        script = open(resource("wiki_extract.js"), encoding="utf-8").read().replace("__SERVER__", re.sub(r"\W", "", server))
        result, errors = {"server": server, "at": time.time() * 1000, "layers": {}}, []
        for slug in WIKI_LAYERS:
            win = webview.create_window("wiki", f"https://wiki.gta5majestic.com/pl/map/{slug}", hidden=True)
            try:
                data = None
                for _ in range(60):  # do 30 s na stronę
                    time.sleep(0.5)
                    try:
                        if win.evaluate_js("!!document.querySelector('.ol-viewport') && !window.__mjxStarted"):
                            win.evaluate_js("window.__mjxStarted = true;" + script)
                        data = win.evaluate_js("window.__mjx || null")
                    except Exception:
                        data = None
                    if data:
                        break
                if not data or data.get("error"):
                    errors.append(f"{slug}: {data.get('error') if data else 'brak odpowiedzi'}")
                else:
                    result["layers"][slug] = data["items"]
                    if data.get("servers"):
                        result["servers"] = data["servers"]
            finally:
                win.destroy()
        if result["layers"]:
            self._record_territories(result)
            save_json(WIKI_FILE, result)
        return {"ok": bool(result["layers"]), "counts": {k: len(v) for k, v in result["layers"].items()}, "errors": errors}

    # ---------- kopia zapasowa ----------
    def export_pack(self, pack_json):
        result = self._window.create_file_dialog(webview.SAVE_DIALOG, save_filename=f"paczka-majestic-{dt.date.today()}.mjpack",
                                                 file_types=("Paczka Majestic (*.mjpack)",))
        if not result:
            return None
        path = result if isinstance(result, str) else result[0]
        with open(path, "w", encoding="utf-8") as f:
            f.write(pack_json)
        return path

    def import_pack(self):
        result = self._window.create_file_dialog(webview.OPEN_DIALOG, file_types=("Paczka Majestic (*.mjpack)",))
        if not result:
            return None
        with open(result[0], encoding="utf-8") as f:
            return f.read(5_000_000)

    def app_version(self):
        return APP_VERSION

    def check_update(self):
        """Najnowsze wydanie z GitHuba (publiczne API, bez logowania)."""
        if not GITHUB_REPO:
            return None
        import urllib.request
        try:
            req = urllib.request.Request(f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest",
                                         headers={"User-Agent": "MajesticCompanion", "Accept": "application/vnd.github+json"})
            with urllib.request.urlopen(req, timeout=8) as r:
                rel = json.load(r)
        except Exception:
            return None
        tag = str(rel.get("tag_name", "")).lstrip("vV")
        newer = tuple(int(x) for x in re.findall(r"\d+", tag)[:3]) > tuple(int(x) for x in APP_VERSION.split("."))
        return {"current": APP_VERSION, "latest": tag, "newer": newer, "url": rel.get("html_url", ""), "notes": (rel.get("body") or "")[:1500]}

    def open_url(self, url):
        if str(url).startswith("https://github.com/"):
            os.startfile(url)
        return True

    def get_autostart(self):
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY) as k:
                winreg.QueryValueEx(k, APP_NAME)
            return True
        except OSError:
            return False

    def set_autostart(self, on):
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY, 0, winreg.KEY_SET_VALUE) as k:
            if on:
                winreg.SetValueEx(k, APP_NAME, 0, winreg.REG_SZ, f'"{sys.executable}" --tray')
            else:
                try:
                    winreg.DeleteValue(k, APP_NAME)
                except OSError:
                    pass
        return self.get_autostart()

    def quit_app(self):
        self._quitting = True
        if getattr(self, "_tray", None):
            self._tray.stop()
        self._window.destroy()

    def backup(self, data_json):
        result = self._window.create_file_dialog(webview.SAVE_DIALOG, save_filename=f"majestic-kopia-{dt.date.today()}.zip",
                                                 file_types=("Kopia zapasowa (*.zip)",))
        if not result:
            return None
        path = result if isinstance(result, str) else result[0]
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("dane.json", data_json)
            for extra in (SETTINGS_FILE, WIKI_FILE):
                if os.path.exists(extra):
                    z.write(extra, os.path.basename(extra))
            if os.path.isdir(SHOTS_DIR):
                for name in os.listdir(SHOTS_DIR):
                    z.write(os.path.join(SHOTS_DIR, name), "zrzuty/" + name)
        return path

    def restore(self):
        result = self._window.create_file_dialog(webview.OPEN_DIALOG, file_types=("Kopia zapasowa (*.zip)",))
        if not result:
            return None
        with zipfile.ZipFile(result[0]) as z:
            names = z.namelist()
            if "dane.json" not in names:
                raise ValueError("To nie jest kopia Majestic Companion")
            os.makedirs(SHOTS_DIR, exist_ok=True)
            for n in names:
                base = os.path.basename(n)
                if n.startswith("zrzuty/") and base:
                    with open(os.path.join(SHOTS_DIR, base), "wb") as f:  # basename: plik z ZIP-a nie wyjdzie poza folder
                        f.write(z.read(n))
                elif n in (os.path.basename(SETTINGS_FILE), os.path.basename(WIKI_FILE)):
                    with open(os.path.join(DATA_DIR, n), "wb") as f:
                        f.write(z.read(n))
            return z.read("dane.json").decode("utf-8")


DEFAULT_SETTINGS = {"shotDirs": [], "overlayKey": "F10", "server": "PL1", "trayOnClose": True}
VK = {f"F{i}": 0x6F + i for i in range(1, 13)}


def load_settings():
    try:
        with open(SETTINGS_FILE, encoding="utf-8") as f:
            return {**DEFAULT_SETTINGS, **json.load(f)}
    except (FileNotFoundError, ValueError):
        return dict(DEFAULT_SETTINGS)


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, ValueError):
        return default


def save_json(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp, path)


_hotkey = {"thread_id": None}


def start_hotkey(api):
    """Globalny skrót (działa też, gdy gra ma fokus) przez RegisterHotKey z WinAPI."""
    import ctypes
    import threading
    from ctypes import wintypes
    user32, kernel32 = ctypes.windll.user32, ctypes.windll.kernel32
    if _hotkey["thread_id"]:
        user32.PostThreadMessageW(_hotkey["thread_id"], 0x0012, 0, 0)  # WM_QUIT: zatrzymaj stary skrót
        _hotkey["thread_id"] = None
    vk = VK.get(load_settings().get("overlayKey"))

    def loop():
        _hotkey["thread_id"] = kernel32.GetCurrentThreadId()
        if vk:
            user32.RegisterHotKey(None, 1, 0x4000, vk)  # MOD_NOREPEAT
        user32.RegisterHotKey(None, 2, 0x4000 | 0x0002 | 0x0004, 0x4E)  # Ctrl+Shift+N: szybka notatka
        msg = wintypes.MSG()
        while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) > 0:
            if msg.message == 0x0312:  # WM_HOTKEY
                try:
                    api.toggle_note() if msg.wParam == 2 else api.toggle_overlay()
                except Exception:
                    pass
        user32.UnregisterHotKey(None, 1)
        user32.UnregisterHotKey(None, 2)

    threading.Thread(target=loop, daemon=True).start()


def start_tray(api):
    """Ikona przy zegarze: zamknięcie okna chowa aplikację, a minutniki liczą dalej."""
    try:
        import pystray
        from PIL import Image
    except ImportError:
        return
    try:
        icon_img = Image.open(resource("icon.ico"))
    except Exception:
        icon_img = Image.new("RGB", (64, 64), "#132a4a")
    menu = pystray.Menu(
        pystray.MenuItem("Pokaż Majestic Companion", lambda *_: api.show_main(), default=True),
        pystray.MenuItem("Szybka notatka", lambda *_: api.toggle_note()),
        pystray.MenuItem("Zamknij", lambda *_: api.quit_app()),
    )
    api._tray = pystray.Icon("MajesticCompanion", icon_img, APP_NAME, menu)
    threading.Thread(target=api._tray.run, daemon=True).start()


def main():
    os.makedirs(SHOTS_DIR, exist_ok=True)
    api = Api()
    api._window = webview.create_window(
        APP_NAME,
        file_url(resource("web", "index.html")),
        js_api=api,
        width=1480,
        height=920,
        min_size=(1000, 640),
        background_color="#0a1424",
        frameless=True,  # własny pasek MDT zamiast białej belki Windows
        easy_drag=False,
        hidden="--tray" in sys.argv,  # autostart: od razu do zasobnika
    )

    def on_start():
        start_hotkey(api)
        start_tray(api)

    webview.start(on_start, gui="edgechromium", private_mode=False,
                  storage_path=os.path.join(DATA_DIR, "webview"))


if __name__ == "__main__":
    main()

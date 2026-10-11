"""Instalator Majestic Companion: rozpakowuje aplikację do %LOCALAPPDATA%\\Programs, tworzy skróty
i wpis „Odinstaluj” w Ustawieniach Windows. Bez uprawnień administratora (tylko bieżący użytkownik)."""
import os
import shutil
import subprocess
import sys
import tkinter as tk
import winreg
import zipfile
from tkinter import messagebox, ttk

APP = "Majestic Companion"
DEST = os.path.join(os.environ["LOCALAPPDATA"], "Programs", "MajesticCompanion")
EXE = os.path.join(DEST, "MajesticCompanion.exe")
UNINSTALL_KEY = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\MajesticCompanion"


def payload():
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, "MajesticCompanion.zip")


def shortcut(path, target):
    # skrót .lnk przez WScript.Shell; ścieżki przez zmienne środowiskowe, żeby nie było problemu z cudzysłowami
    env = {**os.environ, "MC_LNK": path, "MC_TARGET": target, "MC_DIR": os.path.dirname(target)}
    ps = "$s=(New-Object -ComObject WScript.Shell).CreateShortcut($env:MC_LNK);$s.TargetPath=$env:MC_TARGET;$s.WorkingDirectory=$env:MC_DIR;$s.IconLocation=$env:MC_TARGET;$s.Save()"
    subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], env=env, creationflags=0x08000000, check=False)


def install(progress, root):
    subprocess.run(["taskkill", "/IM", "MajesticCompanion.exe", "/F"], creationflags=0x08000000, capture_output=True)
    with zipfile.ZipFile(payload()) as z:
        names = z.namelist()
        for i, n in enumerate(names):
            rel = n.split("/", 1)[1] if "/" in n else n
            if not rel:
                continue
            out = os.path.join(DEST, rel)
            if n.endswith("/"):
                os.makedirs(out, exist_ok=True)
            else:
                os.makedirs(os.path.dirname(out), exist_ok=True)
                with z.open(n) as src, open(out, "wb") as dst:
                    shutil.copyfileobj(src, dst)
            if i % 25 == 0:
                progress["value"] = 90 * i / len(names)
                root.update()
    desktop = os.path.join(os.environ["USERPROFILE"], "Desktop")
    start = os.path.join(os.environ["APPDATA"], "Microsoft", "Windows", "Start Menu", "Programs")
    shortcut(os.path.join(desktop, APP + ".lnk"), EXE)
    shortcut(os.path.join(start, APP + ".lnk"), EXE)
    # odinstalowanie: skrypt usuwa pliki programu i skróty, dane gracza w %APPDATA%\MajesticMapa zostają
    bat = os.path.join(DEST, "odinstaluj.bat")
    with open(bat, "w", encoding="mbcs") as f:
        f.write(f"""@echo off
taskkill /IM MajesticCompanion.exe /F >nul 2>&1
reg delete "HKCU\\{UNINSTALL_KEY}" /f >nul 2>&1
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "{APP}" /f >nul 2>&1
del "{os.path.join(desktop, APP + '.lnk')}" >nul 2>&1
del "{os.path.join(start, APP + '.lnk')}" >nul 2>&1
cd /d "%TEMP%"
start "" /b cmd /c "timeout /t 2 /nobreak >nul & rmdir /s /q \\"{DEST}\\""
""")
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, UNINSTALL_KEY) as k:
        for name, val in (("DisplayName", APP), ("DisplayIcon", EXE), ("Publisher", "777Sami777"), ("InstallLocation", DEST),
                          ("UninstallString", f'cmd /c "{bat}"'), ("URLInfoAbout", "https://777sami777.github.io/majestic-companion/")):
            winreg.SetValueEx(k, name, 0, winreg.REG_SZ, val)
        winreg.SetValueEx(k, "NoModify", 0, winreg.REG_DWORD, 1)
        winreg.SetValueEx(k, "NoRepair", 0, winreg.REG_DWORD, 1)
    progress["value"] = 100
    root.update()


def main():
    root = tk.Tk()
    root.title("Instalator " + APP)
    root.geometry("440x170")
    root.resizable(False, False)
    tk.Label(root, text=APP, font=("Segoe UI", 14, "bold")).pack(pady=(18, 4))
    msg = tk.Label(root, text=f"Instalacja do:\n{DEST}", font=("Segoe UI", 9), justify="center")
    msg.pack()
    progress = ttk.Progressbar(root, length=380, mode="determinate")
    progress.pack(pady=14)
    root.update()
    if not messagebox.askyesno(APP, f"Zainstalować {APP}?\n\nPowstaną skróty na pulpicie i w menu Start. Twoje znaczniki i kontakty zostają bez zmian."):
        root.destroy()
        return
    try:
        install(progress, root)
    except Exception as e:  # pokazujemy błąd zamiast cichego zamknięcia
        messagebox.showerror(APP, f"Instalacja nie powiodła się:\n{e}")
        root.destroy()
        return
    messagebox.showinfo(APP, "Gotowe! Majestic Companion jest zainstalowany. Uruchamiam aplikację.")
    subprocess.Popen([EXE], cwd=DEST)
    root.destroy()


if __name__ == "__main__":
    main()

# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[('web', 'web'), ('wiki_extract.js', '.'), ('wiki_vehicles.js', '.'), ('wiki_crafting.js', '.'), ('wiki_list.js', '.'), ('wiki_changelog.js', '.'), ('dane', 'dane'), ('warstwy_wiki.json', '.'), ('pojazdy.json', '.'), ('crafting.json', '.'), ('icon.ico', '.')],
    hiddenimports=['pystray._win32', 'segno'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='MajesticCompanion',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['icon.ico'],
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='MajesticCompanion',
)

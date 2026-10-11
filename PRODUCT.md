# Majestic Companion

## Product
Windows desktop companion (pywebview, Edge WebView2) for players of the Majestic RP GTA V roleplay server (Polish server Warsaw/PL1). One app, rail of modules: interactive GTA V map with wiki markers, own markers, routes/zones and screenshots; contacts with debts and factions; game sessions stats from local launcher logs plus live server players and news from the public Majestic API; timers with Windows notifications; earnings log; RP /me /do templates; crew schedule, warehouse and Discord report; settings and backup. Also an always-on-top mini widget and an in-game overlay toggled by a hotkey (F10).

## Users
Polish-speaking Majestic RP players, mainly the owner and friends. Used both mid-game (quick glance via overlay/Alt+Tab, must be readable in a second) and off-game (planning routes, reviewing stats, editing contacts). Usually in the evening, dark room, next to a running game.

## Platform
web (desktop WebView2 window, 1280–1920 px wide; must also work narrower in the overlay)

## Constraints
- UI copy in Polish.
- All data local (localStorage, %APPDATA%); no hosting.
- No game memory reading; only files and public endpoints.
- Must not lose any existing function or stored data keys (majestic-*-v1).
- Files load via file:// inside iframes; fonts and assets must be bundled locally.

## Tone
Practical tool for a game scene; confident, no marketing. Owner asked for a complete visual redesign, open to surprise, leaning tactical/police-dispatch.

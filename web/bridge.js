// Łączy moduł (iframe) z głównym oknem Majestic Companion.
(() => {
  const embedded = window.parent !== window;
  const pending = new Map();
  const gameCbs = [], payloadCbs = [];
  let seq = 0, lastGame = null;

  window.addEventListener("message", (e) => {
    const m = e.data;
    if (!m || typeof m !== "object") return;
    if (m.__apiRes && pending.has(m.__apiRes)) {
      const { ok, fail } = pending.get(m.__apiRes);
      pending.delete(m.__apiRes);
      m.error ? fail(new Error(m.error)) : ok(m.result);
    }
    if (m.__game) { lastGame = m.__game; gameCbs.forEach((cb) => cb(m.__game)); }
    if (m.__payload) payloadCbs.forEach((cb) => cb(m.__payload));
  });

  // skróty globalne działają też, gdy fokus jest w module
  document.addEventListener("keydown", (e) => {
    if (!embedded) return;
    if (e.key === "F11") { e.preventDefault(); window.parent.postMessage({ __key: "F11" }, "*"); }
    if (e.ctrlKey && /^[1-9]$/.test(e.key)) { e.preventDefault(); window.parent.postMessage({ __key: "ctrl+" + e.key }, "*"); }
    if (e.ctrlKey && e.code === "Space") { e.preventDefault(); window.parent.postMessage({ __key: "ctrl+space" }, "*"); }
  });

  window.Host = {
    embedded,
    available: embedded,
    call(fn, ...args) {
      if (!embedded) return Promise.reject(new Error("Poza aplikacją"));
      const id = "r" + ++seq;
      return new Promise((ok, fail) => {
        pending.set(id, { ok, fail });
        window.parent.postMessage({ __api: id, fn, args }, "*");
        setTimeout(() => { if (pending.has(id)) { pending.delete(id); fail(new Error("Brak odpowiedzi")); } }, 30000);
      });
    },
    onGame(cb) { gameCbs.push(cb); if (lastGame) cb(lastGame); },
    onPayload(cb) { payloadCbs.push(cb); },
    nav(mod, payload) { if (embedded) window.parent.postMessage({ __nav: mod, payload }, "*"); },
  };
  if (embedded) document.documentElement.classList.add("embedded");

  /* wygląd (motyw, akcent) i dźwięki: zapisane w Ustawieniach, wspólne dla wszystkich zakładek */
  // motywy: każdy podmienia tokeny kolorów; accent to domyślny akcent motywu (wybór w Ustawieniach go nadpisuje)
  const THEMES = {
    light: { accent: "#2563eb", "--bg": "#eef2f7", "--bg-2": "#ffffff", "--card": "#f3f6fa", "--card-2": "#e6ecf4", "--panel": "rgba(255,255,255,.96)", "--panel-solid": "#ffffff", "--input": "#ffffff",
      "--rail": "#ffffff", "--bar": "#13294b", "--fg-rgb": "12,24,44", "--line": "rgba(12,24,44,.09)", "--line-2": "rgba(12,24,44,.17)", "--text": "#0c182c", "--text-2": "#33425a", "--text-3": "#56657c" },
    noc: { accent: "#d99a1e", "--bg": "#07080b", "--bg-2": "#0e1015", "--card": "#14171e", "--card-2": "#1a1e27", "--panel": "rgba(14,16,21,.95)", "--panel-solid": "#0e1015", "--input": "#090b0f",
      "--rail": "#0b0d11", "--bar": "#111318", "--fg-rgb": "238,240,245", "--text": "#eef0f5", "--text-2": "#b3b8c4", "--text-3": "#8e95a5" },
    wojsko: { accent: "#6b8a2c", "--bg": "#12150e", "--bg-2": "#191d13", "--card": "#212618", "--card-2": "#282e1d", "--panel": "rgba(25,29,19,.95)", "--panel-solid": "#191d13", "--input": "#0f120b",
      "--rail": "#161a10", "--bar": "#2a3120", "--fg-rgb": "232,234,220", "--text": "#e8eadc", "--text-2": "#bcc1a8", "--text-3": "#979d84" },
    szeryf: { accent: "#8c2f2f", "--bg": "#efe8dc", "--bg-2": "#fbf7f0", "--card": "#f4ede1", "--card-2": "#e9dfcf", "--panel": "rgba(251,247,240,.97)", "--panel-solid": "#fbf7f0", "--input": "#fffdf9",
      "--rail": "#f7f1e6", "--bar": "#4a2a1c", "--fg-rgb": "42,28,20", "--line": "rgba(42,28,20,.1)", "--line-2": "rgba(42,28,20,.2)", "--text": "#2a1c14", "--text-2": "#5a4334", "--text-3": "#6e5646" },
    weazel: { accent: "#d3121f", "--bg": "#0c0c0d", "--bg-2": "#141416", "--card": "#1b1b1e", "--card-2": "#232327", "--panel": "rgba(20,20,22,.96)", "--panel-solid": "#141416", "--input": "#0a0a0b",
      "--rail": "#101012", "--bar": "#d3121f", "--fg-rgb": "245,245,245", "--text": "#f5f5f5", "--text-2": "#c4c4c8", "--text-3": "#9a9aa0" },
  };
  const TOKENS = [...new Set(Object.values(THEMES).flatMap(Object.keys))].filter((k) => k.startsWith("--"));
  const LIGHTISH = ["light", "szeryf"];
  const prefs = () => { try { return JSON.parse(localStorage.getItem("majestic-wyglad-v1")) || {}; } catch { return {}; } };
  function applyLook() {
    const p = prefs(), root = document.documentElement, t = THEMES[p.theme] || {};
    TOKENS.forEach((k) => root.style.removeProperty(k));
    root.classList.toggle("light", LIGHTISH.includes(p.theme));
    root.dataset.theme = THEMES[p.theme] ? p.theme : "mdt";
    Object.entries(t).forEach(([k, v]) => k.startsWith("--") && root.style.setProperty(k, v));
    const accent = p.accent || t.accent || "";
    if (accent) root.style.setProperty("--accent", accent); else root.style.removeProperty("--accent");
    // mapa bez powiększenia: Leaflet źle liczy kliknięcia przy CSS zoom
    root.style.zoom = embedded && p.scale && p.scale !== 1 && !location.pathname.includes("/mapa/") ? p.scale : "";
    // napis na przycisku: ciemny na jasnym akcencie (np. złoty), biały na ciemnym
    const hex = (accent || "#2563eb").replace("#", ""), [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    root.style.setProperty("--accent-ink", 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#0c182c" : "#ffffff");
  }
  applyLook();
  window.addEventListener("storage", (e) => { if (e.key === "majestic-wyglad-v1") applyLook(); });
  window.addEventListener("message", (e) => { if (e.data && e.data.__look) applyLook(); });

  let ctx = null;
  document.addEventListener("click", (e) => {
    if (!prefs().sounds || !e.target.closest("button")) return;
    try {
      ctx ||= new AudioContext();
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
      o.type = "triangle"; o.frequency.setValueAtTime(1300, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.05);
      g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.08);
    } catch {}
  }, true);
})();

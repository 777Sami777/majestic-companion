// Uruchamiane w ukrytym oknie na wiki.gta5majestic.com: pobiera listę zmian w grze (/pl/changelogs, format RSC).
// Wynik: window.__changes = { items: [{ title, at, logs: [[typ, tekst]] }] } albo { error }.
(async () => {
  const arrayAfter = (text, key) => {
    const at = text.indexOf(key);
    if (at < 0) return null;
    let depth = 0, inStr = false;
    const i = at + key.length - 1;
    for (let j = i; j < text.length; j++) {
      const c = text[j];
      if (inStr) { if (c === "\\") j++; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === "[") depth++;
      else if (c === "]" && --depth === 0) return JSON.parse(text.slice(i, j + 1));
    }
    return null;
  };
  const textOf = (n) => (n.text || "") + (n.content || []).map(textOf).join("");
  try {
    const t = await (await fetch("/pl/changelogs", { headers: { RSC: "1" } })).text();
    const items = (arrayAfter(t, '"results":[') || []).slice(0, 20).map((r) => ({
      title: r.title || r.slug,
      at: r.availableAt || r.publishedAt || r.createdAt || null,
      logs: (r.content?.content || []).filter((n) => n.type === "log").map((n) => [n.attrs?.type || "", textOf(n).slice(0, 400)]).slice(0, 60),
    }));
    window.__changes = items.length ? { items } : { error: "nie znaleziono zmian" };
  } catch (e) {
    window.__changes = { error: String(e && e.message || e) };
  }
})();

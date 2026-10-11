// Uruchamiane w ukrytym oknie na stronie listy wiki (np. /pl/realties): przechodzi przez strony („Dalej”)
// i zbiera rekordy z propsów Reacta. Zostawia tylko proste pola. Wynik: window.__list = { items } albo { error }.
(async () => {
  const SKIP = new Set(["_id", "__v", "createdAt", "updatedAt", "isPrivate", "isFresh", "sources", "properties", "information"]);
  const slim = (o) => Object.fromEntries(Object.entries(o).filter(([k, v]) => !SKIP.has(k) && v !== null && v !== "" &&
    (typeof v !== "object" || (Array.isArray(v) && v.length <= 4 && v.every((x) => typeof x !== "object")))));
  const grab = () => {
    for (const e of document.querySelectorAll("*")) {
      const k = Object.keys(e).find((k) => k.startsWith("__reactFiber"));
      if (!k) continue;
      let f = e[k];
      for (let d = 0; f && d < 6; d++, f = f.return) {
        const v = f.memoizedProps && f.memoizedProps.data;
        if (Array.isArray(v) && v.length && v[0] && typeof v[0] === "object" && (v[0]._id || v[0].id || v[0].slug)) return v;
      }
    }
    return null;
  };
  try {
    const all = new Map();
    let lastFirst = null;
    for (let page = 0; page < 80; page++) {
      let data = null;
      for (let t = 0; t < 60; t++) {
        data = grab();
        const first = data && JSON.stringify(data[0]).slice(0, 120);
        if (data && first !== lastFirst) { lastFirst = first; break; }
        data = null;
        await new Promise((r) => setTimeout(r, 300));
      }
      if (!data) break;
      for (const v of data) all.set(v._id || v.slug || v.id || JSON.stringify(v).slice(0, 80), slim(v));
      const next = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Dalej");
      if (!next || next.disabled || next.getAttribute("aria-disabled") === "true") break;
      next.click();
    }
    window.__list = all.size ? { items: [...all.values()] } : { error: "nie znaleziono listy" };
  } catch (e) {
    window.__list = { error: String(e && e.message || e) };
  }
})();

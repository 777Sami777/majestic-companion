// Uruchamiane w ukrytym oknie na wiki.gta5majestic.com: pobiera dane stron /recipes (kuchnia) i /crafts (frakcje)
// w formacie RSC Next.js i wyciąga z nich tablice JSON. Wynik: window.__craft = { recipes, crafts } albo { error }.
(async () => {
  // wycina tablicę JSON zaczynającą się zaraz po kluczu (pomija nawiasy w napisach)
  const arrayAfter = (text, key) => {
    const at = text.indexOf(key);
    if (at < 0) return null;
    let i = at + key.length - 1, depth = 0, inStr = false;
    for (let j = i; j < text.length; j++) {
      const c = text[j];
      if (inStr) { if (c === "\\") j++; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === "[") depth++;
      else if (c === "]" && --depth === 0) return JSON.parse(text.slice(i, j + 1));
    }
    return null;
  };
  try {
    const get = async (p) => (await fetch(p, { headers: { RSC: "1" } })).text();
    const [rt, ct] = await Promise.all([get("/pl/recipes"), get("/pl/crafts")]);
    const recipes = (arrayAfter(rt, '"recipes":[') || []).map((r) => ({
      id: r.itemId, n: r.name, lvl: r.cookingLvl || 0, klvl: r.kitchenLvl || 0, min: r.cookDurationMinutes || 0, out: r.outputCount || 1,
      ing: (r.ingredients || []).filter((x) => x.type === "item").map((x) => [x.name, x.amount || 1]),
      how: (r.ingredients || []).filter((x) => x.type === "cookingMethod").map((x) => x.cookingMethod),
    }));
    const crafts = (arrayAfter(ct, '"initialData":[') || []).filter((c) => c.item).map((c) => ({
      id: c.item.id, n: c.item.name, d: c.item.description || "", mat: c.item.materials || 0, mt: c.item.materialType || "", w: c.item.weight || 0, fr: c.fractions || [],
    }));
    window.__craft = recipes.length || crafts.length ? { recipes, crafts } : { error: "nie znaleziono danych craftingu" };
  } catch (e) {
    window.__craft = { error: String(e && e.message || e) };
  }
})();

// Uruchamiane w ukrytym oknie na wiki.gta5majestic.com/pl/vehicles: przechodzi przez strony listy
// („Dalej”) i zbiera dane pojazdów z propsów Reacta. Wynik: window.__veh = { items } albo { error }.
(async () => {
  const grab = () => {
    for (const e of document.querySelectorAll("*")) {
      const k = Object.keys(e).find((k) => k.startsWith("__reactFiber"));
      if (!k) continue;
      let f = e[k];
      for (let d = 0; f && d < 6; d++, f = f.return) {
        const v = f.memoizedProps && f.memoizedProps.data;
        if (Array.isArray(v) && v.length && v[0] && v[0].model) return v;
      }
    }
    return null;
  };
  try {
    const all = new Map();
    let lastFirst = null;
    for (let page = 0; page < 60; page++) {
      let data = null;
      for (let t = 0; t < 60; t++) {
        data = grab();
        if (data && data[0].model !== lastFirst) break;
        await new Promise((r) => setTimeout(r, 300));
      }
      if (!data || data[0].model === lastFirst) break;
      lastFirst = data[0].model;
      for (const v of data) {
        all.set(v.model, [v.model, v.name || v.model, v.type || "", v.vehicleClass && v.vehicleClass !== "null" ? v.vehicleClass : "", v.fuelType || "",
          v.trunkCapacity || 0, v.maxSpeed || 0, v.maxSpeedFT || 0, v.price || 0, v.sellPrice || 0, v.maxPayload || 0, v.isTradable ? 1 : 0]);
      }
      const next = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Dalej");
      if (!next || next.disabled || next.getAttribute("aria-disabled") === "true") break;
      next.click();
    }
    window.__veh = all.size ? { items: [...all.values()] } : { error: "nie znaleziono listy pojazdów" };
  } catch (e) {
    window.__veh = { error: String(e && e.message || e) };
  }
})();

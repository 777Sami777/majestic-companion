(() => {
"use strict";

const FACTIONS = [
  { id: "cywil", name: "Cywil", color: "#8fa3c4" },
  { id: "lspd", name: "LSPD", color: "#4d8dff" },
  { id: "lscsd", name: "LSCSD", color: "#c9a27a" },
  { id: "ems", name: "EMS", color: "#ff5a6a" },
  { id: "fib", name: "FIB", color: "#5b7cff" },
  { id: "sang", name: "SANG", color: "#8db35a" },
  { id: "gov", name: "Rząd", color: "#d9c27a" },
  { id: "wn", name: "Weazel News", color: "#ff8a3d" },
  { id: "ballas", name: "Ballas", color: "#b07cff" },
  { id: "vagos", name: "Vagos", color: "#ffd23f" },
  { id: "families", name: "Families", color: "#3ddc97" },
  { id: "bloods", name: "Bloods", color: "#e5484d" },
  { id: "marabunta", name: "Marabunta", color: "#2fd4d4" },
  { id: "biznes", name: "Biznes", color: "#f5b544" },
];
const RELATIONS = [
  { id: "przyjaciel", name: "Przyjaciel", color: "#3ddc97" },
  { id: "biznes", name: "Biznes", color: "#b07cff" },
  { id: "neutralny", name: "Neutralny", color: "#8fa3c4" },
  { id: "wrog", name: "Wróg", color: "#ff5a6a" },
];
const TRUST_COLORS = ["#ff5a6a", "#ff8a3d", "#f5b544", "#a4e05a", "#3ddc97"];
const facById = Object.fromEntries(FACTIONS.map((f) => [f.id, f]));
const relById = Object.fromEntries(RELATIONS.map((r) => [r.id, r]));

const ICON = {
  star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4l-5.5 2.9 1-6.2L3 9.7l6.2-.9z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  users: '<path d="M3 20c.8-3.5 3-5 6-5s5.2 1.5 6 5M9 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM16 5a3.5 3.5 0 0 1 0 7M18 15c2 .5 3 2 3.5 5"/>',
  heart: '<path d="M12 20s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.5-8 11-8 11z"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6.5v11"/>',
  person: '<path d="M6 20c1-4 3.5-6 6-6s5 2 6 6M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
};
const svg = (n, extra = "") => `<svg viewBox="0 0 24 24" ${extra}>${ICON[n]}</svg>`;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const money = (n) => "$" + Math.abs(Math.round(n)).toLocaleString("pl-PL");
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");
const initials = (n) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";
const fmtDate = (t) => new Date(t).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "2-digit" });

/* ---------- dane ---------- */
const KEY = "majestic-kontakty-v1";
let db = load();
let view = "all", fac = null, query = "", selected = null, mode = "view";

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.contacts)) return d;
  } catch {}
  return { contacts: [], sort: "recent" };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { toast("Nie udało się zapisać"); }
}
const byId = (id) => db.contacts.find((c) => c.id === id);

/* ---------- licznik pieniędzy z animacją ---------- */
const counters = new Map();
function countTo(el, value) {
  const from = counters.get(el) ?? 0;
  counters.set(el, value);
  const t0 = performance.now(), dur = 900;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
    el.textContent = money(from + (value - from) * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- panel boczny ---------- */
const VIEWS = [
  { id: "all", name: "Wszyscy", icon: "users", test: () => true },
  { id: "fav", name: "Ulubieni", icon: "star", test: (c) => c.fav },
  { id: "debt", name: "Długi", icon: "coin", test: (c) => c.debt },
  ...RELATIONS.map((r) => ({ id: "rel:" + r.id, name: r.name, dot: r.color, test: (c) => c.rel === r.id })),
];

function renderRail() {
  const n = db.contacts.length;
  $("#count").textContent = `${n} ${n === 1 ? "osoba" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "osoby" : "osób"}`;
  $("#views").innerHTML = VIEWS.map((v) => `<li><button class="filter ${view === v.id && !fac ? "on" : ""}" data-view="${v.id}" style="--c:${v.dot || "var(--accent)"}">
    ${v.icon ? svg(v.icon) : `<i class="dot"></i>`}<span>${v.name}</span><small>${db.contacts.filter(v.test).length}</small></button></li>`).join("");
  const used = FACTIONS.filter((f) => db.contacts.some((c) => c.fac === f.id));
  $("#facs").innerHTML = used.length ? used.map((f) => `<li><button class="filter ${fac === f.id ? "on" : ""}" data-fac="${f.id}" style="--c:${f.color}">
    <i class="dot"></i><span>${f.name}</span><small>${db.contacts.filter((c) => c.fac === f.id).length}</small></button></li>`).join("")
    : `<li class="filter" style="cursor:default">Pojawią się po dodaniu kontaktów</li>`;
  const inSum = db.contacts.reduce((s, c) => s + Math.max(0, c.debt || 0), 0);
  const outSum = db.contacts.reduce((s, c) => s + Math.max(0, -(c.debt || 0)), 0);
  countTo($("#owed-in"), inSum);
  countTo($("#owed-out"), outSum);
  const tot = inSum + outSum || 1;
  $("#bar-in").style.width = (inSum / tot) * 100 + "%";
  $("#bar-out").style.width = (outSum / tot) * 100 + "%";
}
$("#views").addEventListener("click", (e) => { const b = e.target.closest("[data-view]"); if (b) { view = b.dataset.view; fac = null; renderAll(); } });
$("#facs").addEventListener("click", (e) => { const b = e.target.closest("[data-fac]"); if (b) { fac = fac === b.dataset.fac ? null : b.dataset.fac; if (!fac) view = "all"; renderAll(); } });

/* ---------- lista ---------- */
function visible() {
  const v = VIEWS.find((x) => x.id === view) || VIEWS[0];
  const q = norm(query);
  let list = db.contacts.filter((c) => (fac ? c.fac === fac : v.test(c)) &&
    (!q || norm([c.name, c.phone, c.note, c.place, facById[c.fac]?.name, (c.log || []).map((l) => l.t).join(" ")].join(" ")).includes(q)));
  const s = db.sort;
  list.sort((a, b) => s === "name" ? a.name.localeCompare(b.name, "pl")
    : s === "trust" ? (b.trust || 0) - (a.trust || 0)
    : s === "debt" ? Math.abs(b.debt || 0) - Math.abs(a.debt || 0)
    : (b.created || 0) - (a.created || 0));
  return list.sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0));
}

function avatar(c) {
  return `<span class="av" style="--c:${facById[c.fac]?.color || "#8fa3c4"};--rel:${relById[c.rel]?.color || "#8fa3c4"}">${esc(initials(c.name))}</span>`;
}

function renderList() {
  const list = visible();
  $("#list-title").textContent = fac ? facById[fac].name : (VIEWS.find((v) => v.id === view)?.name || "Wszyscy");
  if (!list.length) {
    $("#list").innerHTML = db.contacts.length
      ? `<li class="empty">${svg("search")}<b>Nic tu nie ma</b>Zmień wyszukiwanie albo filtr.</li>`
      : `<li class="empty">${svg("person")}<b>Brak kontaktów</b>Dodaj pierwszą osobę poznaną w mieście.<button class="btn primary" data-new style="margin-top:8px">Dodaj kontakt</button></li>`;
    return;
  }
  $("#list").innerHTML = list.map((c, i) => {
    const f = facById[c.fac];
    const debt = c.debt ? `<span class="row-debt ${c.debt > 0 ? "in" : "out"}">${c.debt > 0 ? "+" : "−"}${money(c.debt)}</span>` : "";
    return `<li><button class="row ${selected === c.id ? "on" : ""}" data-id="${c.id}" style="--i:${Math.min(i, 20)};--c:${f?.color || "#8fa3c4"}">
      ${avatar(c)}
      <div class="row-main"><div class="row-name">${esc(c.name)}${c.fav ? svg("star", 'class="star"') : ""}</div>
      <div class="row-sub">${esc(c.phone || "brak numeru")} · ${esc(f?.name || "Cywil")}</div></div>${debt}</button></li>`;
  }).join("");
}
$("#list").addEventListener("click", (e) => {
  if (e.target.closest("[data-new]")) return openForm(null);
  const r = e.target.closest(".row"); if (!r) return;
  selected = r.dataset.id; mode = "view";
  document.querySelectorAll(".row.on").forEach((x) => x.classList.remove("on"));
  r.classList.add("on");
  renderDetail();
});

/* ---------- szczegóły ---------- */
function renderDetail() {
  const el = $("#detail");
  const c = selected && byId(selected);
  if (mode === "form") return;
  if (!c) {
    el.innerHTML = `<div class="placeholder"><div class="big"><span></span><span></span><span>${svg("person")}</span></div>
      <b>${db.contacts.length ? "Wybierz kontakt" : "Twoja książka jest pusta"}</b>
      <div>${db.contacts.length ? "Kliknij osobę z listy, żeby zobaczyć szczegóły." : "Zapisuj ludzi poznanych w mieście: numery, frakcje, długi i notatki."}</div></div>`;
    return;
  }
  const f = facById[c.fac], r = relById[c.rel], tc = TRUST_COLORS[Math.max(0, (c.trust || 1) - 1)];
  const debtCls = !c.debt ? "zero" : c.debt > 0 ? "in" : "out";
  const debtLbl = !c.debt ? "Jesteście kwita" : c.debt > 0 ? "Wisi Ci" : "Ty wisisz";
  el.innerHTML = `<div class="d-in" style="--c:${f?.color || "#8fa3c4"}">
    <div class="d-hero">
      <div class="d-actions">
        <button class="icon-btn fav ${c.fav ? "on" : ""}" data-act="fav" title="Ulubiony">${svg("star")}</button>
        <button class="icon-btn" data-act="share" title="Kod do wysłania znajomym">${svg("share")}</button>
        <button class="icon-btn" data-act="edit" title="Edytuj (E)">${svg("edit")}</button>
        <button class="icon-btn danger" data-act="del" title="Usuń">${svg("trash")}</button>
      </div>
      <div class="d-top">${avatar(c)}<div style="min-width:0">
        <h2 class="d-name" style="margin:0;color:var(--text);font:700 44px/1 var(--display);letter-spacing:.02em;text-transform:none">${esc(c.name)}</h2>
        <div class="d-tags"><span class="tag" style="--c:${f?.color || "#8fa3c4"}"><i></i>${esc(f?.name || "Cywil")}</span>
        <span class="tag" style="--c:${r?.color || "#8fa3c4"}"><i></i>${esc(r?.name || "Neutralny")}</span></div></div></div>
    </div>
    <div class="d-grid">
      <div class="tile" style="--i:0"><label>Telefon</label><div class="phone"><span class="val">${esc(c.phone || "—")}</span>${c.phone ? `<button class="copy" data-act="copy">Kopiuj</button>` : ""}</div></div>
      <div class="tile" style="--i:1"><label>Zaufanie</label><div class="val">${["Zero", "Słabe", "Takie sobie", "Dobre", "Pełne"][(c.trust || 1) - 1]}</div>
        <div class="trust" style="--tc:${tc}">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= (c.trust || 1) ? "on" : ""}" style="--k:${k}"></i>`).join("")}</div></div>
      <div class="tile" style="--i:2"><label>${debtLbl}</label><div class="debt-val ${debtCls}" id="debt-val">${c.debt ? money(c.debt) : "$0"}</div>
        <div class="debt-btns"><button data-debt="1" title="Pożyczyłem mu pieniądze">Dałem</button><button data-debt="-1" title="On pożyczył mi pieniądze">Wziąłem</button>${c.debt ? `<button data-debt="0">Spłacone</button>` : ""}</div></div>
      <div class="tile" style="--i:3"><label>Gdzie go spotkać</label><div class="val">${esc(c.place || "—")}</div>
        ${mapMarker(c.markerId) ? `<button class="copy" data-act="map" style="margin-top:10px">Pokaż na mapie: ${esc(mapMarker(c.markerId).name)}</button>` : ""}</div>
    </div>
    <div class="d-sec"><h3>Notatka</h3><p class="note ${c.note ? "" : "muted"}">${c.note ? esc(c.note) : "Brak notatki. Kliknij edycję, żeby coś dopisać."}</p></div>
    <div class="d-sec"><h3>Historia</h3>
      <form class="log-add" id="log-form"><input type="text" id="log-in" maxlength="200" placeholder="Co się stało? np. sprzedał mi auto za 40k"><button class="btn ghost" style="height:44px">Dodaj</button></form>
      <ul class="log">${(c.log || []).slice().reverse().map((l, i) => `<li style="--i:${i}"><time>${fmtDate(l.at)}</time><span>${esc(l.t)}</span></li>`).join("") || `<li style="--i:0"><span style="color:var(--text-3)">Dodano ${fmtDate(c.created || Date.now())}</span></li>`}</ul>
    </div></div>`;
  $("#log-form").onsubmit = (e) => {
    e.preventDefault();
    const t = $("#log-in").value.trim(); if (!t) return;
    (c.log ||= []).push({ at: Date.now(), t });
    save(); renderDetail();
    setTimeout(() => $("#log-in")?.focus(), 50);
  };
}

$("#detail").addEventListener("click", (e) => {
  const c = selected && byId(selected);
  const a = e.target.closest("[data-act]");
  const d = e.target.closest("[data-debt]");
  if (d && c) return askDebt(c, +d.dataset.debt, d);
  if (!a || !c) return;
  const act = a.dataset.act;
  if (act === "fav") { c.fav = !c.fav; save(); renderAll(); }
  if (act === "edit") openForm(c);
  if (act === "copy") copy(c.phone);
  if (act === "map") Host.nav("mapa", { select: c.markerId });
  if (act === "share") copy(shareCode(c), "Skopiowano kod kontaktu. Kolega wkleja go w wyszukiwarkę kontaktów (Ctrl+K)");
  if (act === "del") {
    const idx = db.contacts.indexOf(c);
    db.contacts.splice(idx, 1); selected = null; save(); renderAll();
    toast(`Usunięto: ${c.name}`, "Cofnij", () => { db.contacts.splice(idx, 0, c); selected = c.id; save(); renderAll(); });
  }
});

function askDebt(c, dir, btn) {
  if (dir === 0) {
    const before = c.debt; c.debt = 0;
    (c.log ||= []).push({ at: Date.now(), t: `Rozliczone (${before > 0 ? "oddał" : "oddałem"} ${money(before)})` });
    save(); renderAll(); toast("Dług spłacony");
    return;
  }
  const box = btn.parentElement;
  box.innerHTML = `<input type="number" min="1" step="1000" placeholder="Kwota $" style="flex:1;min-width:0;padding:8px 10px" id="debt-in"><button data-ok>OK</button>`;
  const inp = $("#debt-in"); inp.focus();
  const done = () => {
    const v = Math.round(+inp.value);
    if (v > 0) {
      c.debt = (c.debt || 0) + dir * v;
      (c.log ||= []).push({ at: Date.now(), t: dir > 0 ? `Pożyczyłem mu ${money(v)}` : `Pożyczył mi ${money(v)}` });
      save(); renderAll(); toast(dir > 0 ? `+${money(v)} do oddania dla Ciebie` : `Zapisano: wisisz ${money(v)}`);
    } else renderDetail();
  };
  box.querySelector("[data-ok]").onclick = done;
  inp.onkeydown = (e) => { if (e.key === "Enter") done(); if (e.key === "Escape") renderDetail(); };
}

/* ---------- formularz ---------- */
function openForm(c) {
  mode = "form";
  const d = c ? { ...c } : { name: "", phone: "", fac: "cywil", rel: "neutralny", trust: 3, place: "", note: "" };
  const tc = () => TRUST_COLORS[d.trust - 1];
  $("#detail").innerHTML = `<form class="form" id="cform" autocomplete="off">
    <h3>${c ? "Edytuj kontakt" : "Nowy kontakt"}</h3>
    <div class="f-grid">
      <label class="field"><span>Imię i nazwisko (IC)</span><input type="text" name="name" maxlength="50" placeholder="np. Tony Montana" value="${esc(d.name)}"></label>
      <label class="field"><span>Numer telefonu</span><input type="tel" name="phone" maxlength="20" placeholder="np. 555-1234" value="${esc(d.phone)}"></label>
      <div class="field full"><span>Frakcja</span><div class="chips" id="f-fac">${FACTIONS.map((f) => `<button type="button" class="chip ${f.id === d.fac ? "on" : ""}" data-v="${f.id}" style="--c:${f.color}"><i></i>${f.name}</button>`).join("")}</div></div>
      <div class="field"><span>Relacja</span><div class="chips" id="f-rel">${RELATIONS.map((r) => `<button type="button" class="chip ${r.id === d.rel ? "on" : ""}" data-v="${r.id}" style="--c:${r.color}"><i></i>${r.name}</button>`).join("")}</div></div>
      <div class="field"><span>Zaufanie</span><div class="stars" id="f-trust" style="--tc:${tc()}">${[1, 2, 3, 4, 5].map((k) => `<button type="button" data-v="${k}" class="${k <= d.trust ? "on" : ""}" aria-label="Zaufanie ${k} z 5"></button>`).join("")}</div></div>
      <label class="field full"><span>Znacznik na mapie</span><select name="marker"><option value="">— brak —</option>${myMarkers().map((m) => `<option value="${m.id}" ${m.id === d.markerId ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select></label>
      <label class="field full"><span>Gdzie go spotkać</span><input type="text" name="place" maxlength="60" placeholder="np. warsztat LSC w Burton, wieczorami" value="${esc(d.place)}"></label>
      <label class="field full"><span>Notatka</span><textarea name="note" maxlength="1500" placeholder="Kim jest, co załatwia, na co uważać…">${esc(d.note)}</textarea></label>
    </div>
    <div class="f-actions"><button type="button" class="btn ghost" id="f-cancel" style="height:46px">Anuluj</button><button class="btn primary">${c ? "Zapisz zmiany" : "Dodaj kontakt"}</button></div>
  </form>`;
  const form = $("#cform");
  const pick = (sel, key) => form.querySelector(sel).onclick = (e) => {
    const b = e.target.closest("[data-v]"); if (!b) return;
    d[key] = b.dataset.v;
    form.querySelectorAll(sel + " [data-v]").forEach((x) => x.classList.toggle("on", x === b));
  };
  pick("#f-fac", "fac"); pick("#f-rel", "rel");
  form.querySelector("#f-trust").onclick = (e) => {
    const b = e.target.closest("[data-v]"); if (!b) return;
    d.trust = +b.dataset.v;
    form.querySelector("#f-trust").style.setProperty("--tc", tc());
    form.querySelectorAll("#f-trust [data-v]").forEach((x) => x.classList.toggle("on", +x.dataset.v <= d.trust));
  };
  form.querySelector("#f-cancel").onclick = () => { mode = "view"; renderDetail(); };
  form.onsubmit = (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    if (!name) { const f = form.name.closest(".field"); f.classList.remove("err"); void f.offsetWidth; f.classList.add("err"); form.name.focus(); return; }
    const data = { name, phone: form.phone.value.trim(), place: form.place.value.trim(), note: form.note.value.trim(), fac: d.fac, rel: d.rel, trust: d.trust, markerId: form.marker.value || undefined };
    if (c) { Object.assign(c, data); toast("Zapisano zmiany"); }
    else { const nc = { id: uid(), created: Date.now(), debt: 0, fav: false, log: [], ...data }; db.contacts.push(nc); selected = nc.id; toast(`Dodano: ${name}`); }
    mode = "view"; save(); renderAll();
  };
  setTimeout(() => form.name.focus(), 60);
}
$("#add-btn").addEventListener("click", () => openForm(null));

/* ---------- reszta ---------- */
function renderAll() { renderRail(); renderList(); renderDetail(); }

$("#q").addEventListener("input", (e) => { query = e.target.value; renderList(); });
$("#q").addEventListener("keydown", (e) => {
  const v = e.target.value.trim();
  if (e.key !== "Enter" || !v.startsWith("MJK:")) return;
  let c; try { c = JSON.parse(decodeURIComponent(escape(atob(v.slice(4))))); } catch {}
  if (!c || !c.name) return toast("Ten kod jest uszkodzony");
  const nc = { id: uid(), created: Date.now(), debt: 0, fav: false, log: [], name: String(c.name).slice(0, 50), phone: String(c.phone || "").slice(0, 20),
    fac: facById[c.fac] ? c.fac : "cywil", rel: relById[c.rel] ? c.rel : "neutralny", trust: Math.min(5, Math.max(1, +c.trust || 3)), place: String(c.place || "").slice(0, 60), note: String(c.note || "").slice(0, 1500) };
  db.contacts.push(nc); selected = nc.id; e.target.value = ""; query = ""; save(); renderAll(); toast("Dodano kontakt z kodu: " + nc.name);
});

/* ---------- powiązania z mapą i kody ---------- */
function mapState() { try { return JSON.parse(localStorage.getItem("majestic-mapa-v1")) || {}; } catch { return {}; } }
function myMarkers() { return (mapState().markers || []).filter((m) => !m.builtin || m.fav).sort((a, b) => a.name.localeCompare(b.name, "pl")); }
function mapMarker(id) { return id ? (mapState().markers || []).find((m) => m.id === id) : null; }
function shareCode(c) {
  const d = { name: c.name, phone: c.phone, fac: c.fac, rel: c.rel, trust: c.trust, place: c.place, note: c.note };
  return "MJK:" + btoa(unescape(encodeURIComponent(JSON.stringify(d))));
}
Host.onPayload((p) => { if (p.select && byId(p.select)) { selected = p.select; mode = "view"; renderAll(); } });
$("#sort").addEventListener("change", (e) => { db.sort = e.target.value; save(); renderList(); });

function toast(text, actionLabel, action) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = `${svg("check")}<span>${esc(text)}</span>${actionLabel ? `<button>${esc(actionLabel)}</button>` : ""}`;
  if (action) t.querySelector("button").onclick = () => { action(); t.remove(); };
  $("#toasts").appendChild(t);
  while ($("#toasts").children.length > 3) $("#toasts").firstChild.remove();
  setTimeout(() => { t.classList.add("bye"); setTimeout(() => t.remove(), 360); }, actionLabel ? 5000 : 2600);
}
async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); }
  catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
  toast(msg || "Skopiowano numer " + text);
}

$("#export-btn").addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: "majestic-kontakty", version: 1, contacts: db.contacts }, null, 2)], { type: "application/json" }));
  a.download = "majestic-kontakty.json"; a.click();
  toast(`Wyeksportowano ${db.contacts.length} kontaktów`);
});
$("#import-btn").addEventListener("click", () => $("#import-file").click());
$("#import-file").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  let list; try { list = JSON.parse(await f.text()).contacts; } catch {}
  if (!Array.isArray(list)) return toast("To nie jest plik z kontaktami Majestic Kontakty");
  let n = 0;
  for (const c of list) {
    if (!c?.name || db.contacts.some((x) => x.name === c.name && x.phone === c.phone)) continue;
    db.contacts.push({ ...c, id: uid(), fac: facById[c.fac] ? c.fac : "cywil", rel: relById[c.rel] ? c.rel : "neutralny" }); n++;
  }
  save(); renderAll(); toast(n ? `Zaimportowano ${n} kontaktów` : "Wszystkie kontakty z pliku już masz");
});

document.addEventListener("keydown", (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("#q").focus(); $("#q").select(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") { e.preventDefault(); openForm(null); return; }
  if (e.key === "Escape") { if (mode === "form") { mode = "view"; renderDetail(); } else if (typing) document.activeElement.blur(); return; }
  if (typing) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    const list = visible(); if (!list.length) return;
    e.preventDefault();
    let i = list.findIndex((c) => c.id === selected);
    i = e.key === "ArrowDown" ? Math.min(list.length - 1, i + 1) : Math.max(0, i - 1);
    selected = list[i].id; mode = "view"; renderList(); renderDetail();
    document.querySelector(`.row[data-id="${selected}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  if (e.key.toLowerCase() === "e" && selected) openForm(byId(selected));
});

/* start */
$("#sort").value = db.sort || "recent";
setTimeout(() => {
  $("#intro").classList.add("out");
  $(".app").classList.add("ready");
  renderAll();
}, window.Host && Host.embedded ? 60 : 1500);
})();

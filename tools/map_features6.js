/* ---------- wspólna mapa ekipy na żywo (ntfy.sh, szyfrowane kodem ekipy) ---------- */
// Serwer ntfy.sh trzyma wiadomości ok. 12 h, więc nowa osoba prosi resztę o pełną listę ("hello").
const CREW_KEY = "majestic-ekipa-mapa-v1";
const crewId = Math.random().toString(36).slice(2, 10);
let crew = null;           // { topic, key, es, sent: Map(id -> json) }
const SYNC_FIELDS = ["id", "cat", "name", "x", "y", "note", "color", "icon"];
const crewView = (m) => Object.fromEntries(SYNC_FIELDS.filter((k) => m[k] !== undefined).map((k) => [k, m[k]]));
const b64 = { enc: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))), dec: (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) };

async function crewKeys(code) {
  const raw = new TextEncoder().encode("majestic-crew:" + code.trim().toLowerCase());
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", raw));
  const topic = "mjc" + [...hash.slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const key = await crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", new Uint8Array([...raw, 1])), "AES-GCM", false, ["encrypt", "decrypt"]);
  return { topic, key };
}
async function crewSend(obj) {
  if (!crew) return;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, crew.key, new TextEncoder().encode(JSON.stringify({ ...obj, from: crewId })));
  try { await fetch("https://ntfy.sh/" + crew.topic, { method: "POST", body: b64.enc(iv) + "." + b64.enc(data) }); } catch {}
}
async function crewOpen(msg) {
  const [iv, data] = String(msg).split(".");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64.dec(iv) }, crew.key, b64.dec(data));
  return JSON.parse(new TextDecoder().decode(plain));
}
function crewApply(ev) {
  if (!ev || ev.from === crewId) return;
  if (ev.op === "hello") return crewSnapshot();
  const list = ev.op === "put" ? [ev.m] : ev.op === "snap" ? ev.ms || [] : [];
  let changed = false;
  for (const raw of list) {
    if (!raw || typeof raw.id !== "string" || typeof raw.name !== "string" || !Number.isFinite(raw.x) || !Number.isFinite(raw.y)) continue;
    const m = { ...crewView(raw), name: raw.name.slice(0, 60), crew: ev.by || "ekipa" };
    const cur = state.markers.find((x) => x.id === m.id);
    if (cur && cur.builtin) continue;
    if (cur) { if (JSON.stringify(crewView(cur)) === JSON.stringify(crewView(m))) continue; Object.assign(cur, m); refreshIcon(cur); leafletById.get(cur.id)?.setLatLng(toLL(cur.x, cur.y)); }
    else { state.markers.push(m); addLeaflet(m); }
    crew.sent.set(m.id, JSON.stringify(crewView(m)));
    changed = true;
  }
  if (ev.op === "del" && typeof ev.id === "string") {
    const cur = state.markers.find((x) => x.id === ev.id && !x.builtin);
    if (cur) { state.markers = state.markers.filter((x) => x !== cur); removeLeaflet(cur.id); crew.sent.delete(cur.id); if (selectedId === cur.id) closeCard(); changed = true; }
  }
  if (changed) { renderCats(); saveLocalOnly(); if (ev.op === "put") toast(`${ev.by || "Ekipa"}: ${ev.m.name}`); }
}
function crewSnapshot() {
  const own = state.markers.filter((m) => !m.builtin).map(crewView);
  for (let i = 0; i < own.length; i += 12) crewSend({ op: "snap", ms: own.slice(i, i + 12), by: crewNick() });  // limit 4 KB na wiadomość
}
const crewNick = () => (U.load(CREW_KEY, {}).nick || "").slice(0, 24) || "ktoś z ekipy";
function crewDiff() {
  if (!crew) return;
  const now = new Map(state.markers.filter((m) => !m.builtin).map((m) => [m.id, JSON.stringify(crewView(m))]));
  for (const [id, json] of now) if (crew.sent.get(id) !== json) { crew.sent.set(id, json); crewSend({ op: "put", m: JSON.parse(json), by: crewNick() }); }
  for (const id of [...crew.sent.keys()]) if (!now.has(id)) { crew.sent.delete(id); crewSend({ op: "del", id, by: crewNick() }); }
}
let saveLocalOnly = save;  // zapis bez ponownego wysyłania zmian, które właśnie przyszły od ekipy
const _crewSave = save;
save = function () { _crewSave(); clearTimeout(save._crewT); save._crewT = setTimeout(crewDiff, 400); };
saveLocalOnly = _crewSave;

async function crewConnect(code, nick) {
  crewDisconnect(true);
  if (!crypto.subtle) return toast("Szyfrowanie niedostępne w tej wersji Windows");
  const { topic, key } = await crewKeys(code);
  crew = { topic, key, sent: new Map(state.markers.filter((m) => !m.builtin).map((m) => [m.id, JSON.stringify(crewView(m))])) };
  U.save(CREW_KEY, { code, nick });
  crew.es = new EventSource(`https://ntfy.sh/${topic}/sse?since=12h`);
  crew.es.onmessage = async (e) => { try { const d = JSON.parse(e.data); if (d.event === "message") crewApply(await crewOpen(d.message)); } catch {} };
  crew.es.onopen = () => renderCrew("on");
  crew.es.onerror = () => renderCrew("err");
  crewSend({ op: "hello", by: nick });
  crewSnapshot();
  renderCrew("wait");
}
function crewDisconnect(silent) {
  if (crew?.es) crew.es.close();
  crew = null;
  if (!silent) { U.save(CREW_KEY, { nick: U.load(CREW_KEY, {}).nick }); renderCrew("off"); }
}
function renderCrew(st) {
  const s = U.load(CREW_KEY, {});
  $("#crew-box").innerHTML = crew
    ? `<p class="crew-st ${st}"><i></i>${st === "on" ? "Połączono z mapą ekipy" : st === "err" ? "Brak połączenia, ponawiam…" : "Łączenie…"}</p>
       <small>Twoje znaczniki widzi każdy z tym samym kodem. Szyfrowane kodem ekipy.</small>
       <button class="link" id="crew-off">Rozłącz</button>`
    : `<form id="crew-form" class="crew-form" autocomplete="off">
         <input name="code" type="password" placeholder="Wspólny kod ekipy (min. 8 znaków)" aria-label="Kod ekipy" value="">
         <input name="nick" placeholder="Twój nick w ekipie" aria-label="Nick" maxlength="24" value="${esc(s.nick || "")}">
         <button class="copy-btn">Połącz</button></form>
       <small>Wszyscy wpisują ten sam kod. Znaczniki dodane przez jedną osobę od razu pojawią się u reszty.</small>`;
}
$("#crew-box").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = e.target.code.value.trim(), nick = e.target.nick.value.trim();
  if (code.length < 8) return toast("Kod ekipy musi mieć co najmniej 8 znaków");
  crewConnect(code, nick);
});
$("#crew-box").addEventListener("click", (e) => { if (e.target.id === "crew-off") crewDisconnect(); });
{ const s = U.load(CREW_KEY, {}); renderCrew("off"); if (s.code) crewConnect(s.code, s.nick || ""); }

// Drobiazgi wspólne dla zakładek: $, esc, toast, kopiowanie, zapis w localStorage.
window.U = {
  $: (s, el = document) => el.querySelector(s),
  esc: (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { U.toast("Nie udało się zapisać"); } },
  money: (n) => (n < 0 ? "−" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("pl-PL"),
  toast(text) {
    let box = document.getElementById("toasts");
    if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.appendChild(box); }
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg><span>${U.esc(text)}</span>`;
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { t.classList.add("bye"); setTimeout(() => t.remove(), 360); }, 2600);
  },
  async copy(text, msg) {
    try { await navigator.clipboard.writeText(text); }
    catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
    U.toast(msg || "Skopiowano");
  },
};

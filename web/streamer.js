/* Tryb streamera: zamazuje kwoty pieniędzy i nick postaci w całym interfejsie (tekst na ekranie, nie zapisane dane). */
(() => {
  let nick = "";
  try { nick = JSON.parse(localStorage.getItem("majestic-nick-v1")) || ""; } catch {}
  const MONEY = /−?\$\s?\d[\d\s  .,]*/g;
  const hide = (s) => {
    let out = s.replace(MONEY, "$•••");
    if (nick && nick.length > 2) out = out.split(nick).join("•••");
    return out;
  };
  function walk(root) {
    if (root.nodeType === 3) { const v = hide(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
    if (root.nodeType !== 1 || root.tagName === "SCRIPT" || root.tagName === "STYLE" || root.tagName === "TEXTAREA") return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const v = hide(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  }
  const style = document.createElement("style");
  // pola z kwotami i kodami też nieczytelne, dopóki nie najedziesz kursorem
  style.textContent = 'input[type=number],input[type=password],input[name=code]{filter:blur(5px)}input[type=number]:hover,input[type=number]:focus{filter:none}';
  const start = () => {
    document.head.appendChild(style);
    walk(document.body);
    new MutationObserver((ms) => { for (const m of ms) { if (m.type === "characterData") walk(m.target); else m.addedNodes.forEach(walk); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();

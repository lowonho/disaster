(() => {
  "use strict";
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function rollSummary(roll) {
    return (roll.passed ? "상세 경로 확인" : "가까운 표지만 확인") + " · 눈 " + roll.face + " · 목표 " + roll.target + " 이상";
  }
  function button(text, kind, callback, iconName) {
    const node = element("button", kind);
    node.type = "button";
    if (iconName) node.append(globalThis.DisasterArt.icon(iconName));
    node.append(document.createTextNode(text));
    node.addEventListener("click", callback);
    return node;
  }
  function selectField(parent, caption, name, entries) {
    const label = element("label", "difficulty-field", caption);
    const select = element("select");
    select.name = name;
    for (const [value, text] of entries) {
      const option = element("option", "", text);
      option.value = value;
      select.append(option);
    }
    label.append(select);
    parent.append(label);
    return select;
  }
  function progress(run) {
    const turn = run.elapsed + Number(run.status === "playing");
    return turn + "턴 · " + globalThis.DisasterGame.currentPlace(run) + " · " + globalThis.DisasterGame.statusLabel(run);
  }
  globalThis.DisasterUI = {
    byId: id => document.getElementById(id), element, rollSummary, button, selectField, progress,
    signed: n => n > 0 ? "+" + n : n < 0 ? "−" + Math.abs(n) : "0"
  };
})();

(() => {
  "use strict";
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function rollSummary(roll) {
    return (roll.passed ? "판정 성공" : "판정 실패") + " · 눈 " + roll.face + " · 목표 " + roll.target + " 이상";
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
    const status = { playing: "진행 중", escaped: "탈출 성공", exhausted: "체력 소진", exposed: "노출 한계" };
    const turn = run.elapsed + Number(run.status === "playing");
    return turn + "턴 · " + globalThis.DisasterMaps.of(run).nodes[run.node].place + " · " + status[run.status];
  }
  globalThis.DisasterUI = {
    byId: id => document.getElementById(id), element, rollSummary, button, selectField, progress,
    signed: n => n > 0 ? "+" + n : n < 0 ? "−" + Math.abs(n) : "0"
  };
})();

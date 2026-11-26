(() => {
  "use strict";

  const glyphs = {
    play: ["M7 4.5 19 12 7 19.5Z"],
    next: ["m9 5 7 7-7 7"],
    folder: ["M3 8V5h6l2 2h9v3", "M3 10h19l-3 10H3Z"],
    menu: ["M3 6h18M3 12h18M3 18h18"],
    settings: ["M3 6h8m4 0h6M3 12h2m4 0h12M3 18h10m4 0h4", "M11 3v6m-6 0v6m8 0v6"],
    brand: ["M12 2.3 22.1 20.7H2L12 2.3Z", "M5.4 15h4l1.5-4.1 2.1 6.7 1.8-4h2.2"],
    help: ["M12 2.8a9.2 9.2 0 1 1 0 18.4 9.2 9.2 0 1 1 0-18.4Z", "M9.4 9.3a2.7 2.7 0 0 1 5.3.5c0 2.1-2.8 2.4-2.8 4.3", "M12 17h.03"],
    sound: ["M3 9h4l5-4v14l-5-4H3Z", "M15.4 8.4a5.2 5.2 0 0 1 0 7.2", "M18.4 5.5a9.3 9.3 0 0 1 0 13"],
    muted: ["M3 9h4l5-4v14l-5-4H3Z", "m16.2 9 5.2 6", "m21.4 9-5.2 6"],
    flame: ["M12.7 2.5c.5 4-1.4 5.1-2.4 7.4-1.2-.9-1.7-1.8-2-3-2.5 3.2-4.1 5.5-4.1 8.1a7.8 7.8 0 0 0 15.6 0c0-4.3-3.2-8.8-7.1-12.5Z", "M11.9 13.1c.4 2.1 2.6 2.6 2.6 4.4a2.5 2.5 0 0 1-5 0c0-1.2 1.4-2.8 2.4-4.4Z"],
    water: ["M2 7c2.6 0 2.6-2.3 5-2.3S9.5 7 12 7s2.6-2.3 5-2.3S19.5 7 22 7", "M2 12.5c2.6 0 2.6-2.3 5-2.3s2.5 2.3 5 2.3 2.6-2.3 5-2.3 2.5 2.3 5 2.3", "M2 18c2.6 0 2.6-2.3 5-2.3S9.5 18 12 18s2.6-2.3 5-2.3 2.5 2.3 5 2.3"],
    quake: ["M2 12h4l2.5-6 2.7 13 2.6-16 2.8 12 1.7-3H22"],
    restart: ["M3.3 9a8.4 8.4 0 1 1-.1 5.3", "M3 3.6v5.8h5.8"],
    alert: ["M10.5 4.6a1.7 1.7 0 0 1 3 0l8.1 14a1.5 1.5 0 0 1-1.3 2.3H3.7a1.5 1.5 0 0 1-1.3-2.3Z", "M12 9v4.7", "M12 17h.03"],
    pin: ["M19 10.3c0 5-7 11-7 11s-7-6-7-11a7 7 0 1 1 14 0Z", "M14.3 10a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 1 1 4.6 0Z"],
    clock: ["M12 3a9 9 0 1 1 0 18 9 9 0 1 1 0-18Z", "M12 7v5l3.2 2"],
    cursor: ["M4 3.4 11 20l2.3-6.1L20 11 4 3.4Z", "m14 14 5 5"],
    pulse: ["M1.8 12H7l2.3-6 4 12.5 2.9-8 1.5 1.5h4.5"],
    heart: ["M20.3 5.6a5.1 5.1 0 0 0-7.3 0L12 6.7l-1-1.1a5.1 5.1 0 1 0-7.3 7.1L12 21l8.3-8.3a5.1 5.1 0 0 0 0-7.1Z"],
    route: ["M7 6h9a3.5 3.5 0 0 1 0 7.1H8a2.5 2.5 0 0 0 0 5H17", "M6.8 6a2 2 0 1 1-4 0 2 2 0 1 1 4 0Z", "M21 18a2 2 0 1 1-4 0 2 2 0 1 1 4 0Z"],
    flag: ["M5 21V3.5", "M5 4c4.5-3 8 3.4 14-.2v10c-5.5 3.4-9.7-3.2-14 0"],
    log: ["M5 3.5h13.5a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5Z", "M8 3.5v17", "M11 8h5", "M11 12h5", "M11 16h3"],
    save: ["M3.5 3.5h14L21 7v13.5H3.5Z", "M7 3.5V9h9V3.5", "M7.5 20v-6.5h9V20"],
    close: ["m6 6 12 12", "M18 6 6 18"],
    phone: ["M6 3h3l1.5 4.5-2.3 2a13 13 0 0 0 6.3 6.3l2-2.3L21 15v3c0 1.5-1.2 3-3 3C10 20.5 3.5 14 3 6c0-1.8 1.2-3 3-3Z"],
    radio: ["M6 8V3", "M9.7 5.5h5.6", "M5 8h12.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 19.5v-10A1.5 1.5 0 0 1 5.5 8Z", "M7.5 11.5h7", "M7.5 15h3", "M7.5 17.7h3", "M16 16h.03"],
    door: ["M4 21h16", "M6 20V4l10-2v19", "M16 5h3v15", "M12.5 12.5h.06"],
    stairs: ["M2.7 19.7h5.8v-5.3h5.2V9.1H19V4h2.2", "M3.5 12.5 11 5", "M6.8 5h4.3v4.3"],
    walk: ["M14.5 5a1.9 1.9 0 1 1 0-3.8 1.9 1.9 0 1 1 0 3.8Z", "m7 12 2-3.3 3.3-1.4 2.4 4.3 3.4 1.1", "m12.3 7.7-1.8 6.5 3.7 2.5 2 4.5", "m10.7 14.3-2.2 4.1-3.4 3"],
    breath: ["M3 9h10a2.8 2.8 0 1 0-2.7-3.4", "M2 13h16a3.4 3.4 0 1 0-3.2-4.3", "M5 17h7a2.6 2.6 0 1 1-2.5 3.2"],
    eye: ["M2 12s3.7-6.5 10-6.5S22 12 22 12s-3.7 6.5-10 6.5S2 12 2 12Z", "M15 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0Z"],
    shield: ["M12 2.7c2.7 2 5.5 2.9 8 3.2v6.4c0 4.4-4 7.6-8 9.4-4-1.8-8-5-8-9.4V5.9c2.5-.3 5.3-1.2 8-3.2Z", "m8.5 12.3 2.4 2.4 4.6-5"],
    voice: ["M3 10h4l10-5v14l-10-5H3Z", "m6 14 1.5 6H11l-1.5-5", "M20 9.5c1.2 1.5 1.2 3.5 0 5"],
    lock: ["M6 10h12a1 1 0 0 1 1 1v9H5v-9a1 1 0 0 1 1-1Z", "M8 10V7.5a4 4 0 1 1 8 0V10", "M12 14v2"],
    die: ["M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z", "M7.6 7.6h.3", "M12 12h.3", "M16.4 16.4h.3"],
    check: ["m4 12.5 5 5 11-11"],
    bag: ["M5 10a7 7 0 0 1 14 0v10H5Z", "M9 4V2.8h6V4", "M8 13h8v5H8Z", "M8 9h8"],
    battery: ["M3 7h16v10H3Z", "M21 10v4", "M6 10v4", "M10 10v4"],
    lamp: ["M3 4h9l-2 6H5Z", "m5 10 2 10 4-1-1-9", "m15 4 3-2", "m15 7 5 1"],
    ration: ["M4 5h16v14H4Z", "M4 8h16", "M4 16h16", "M9 12h6"]
  };
  const masks = new Map();

  function paint(element) {
    const name = element.dataset.icon;
    if (!glyphs[name]) return;
    if (!masks.has(name)) {
      const surface = document.createElement("canvas");
      surface.width = surface.height = 96;
      const pen = surface.getContext("2d");
      pen.scale(4, 4);
      pen.strokeStyle = "#000";
      pen.lineWidth = name === "brand" ? 2.3 : 1.8;
      pen.lineCap = pen.lineJoin = "round";
      for (const path of glyphs[name]) pen.stroke(new Path2D(path));
      masks.set(name, "url(" + surface.toDataURL() + ")");
    }
    element.setAttribute("aria-hidden", "true");
    element.style.backgroundColor = "currentColor";
    element.style.webkitMask = element.style.mask = masks.get(name) + " center / contain no-repeat";
  }

  function icon(name) {
    const element = document.createElement("i");
    element.dataset.icon = name;
    paint(element);
    return element;
  }

  const diePips = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
  function die(value, animate) {
    const frame = document.createElement("span");
    frame.className = "die";
    frame.setAttribute("aria-hidden", "true");
    const cube = document.createElement("span");
    cube.className = animate ? "die-cube tumble" : "die-cube";
    cube.dataset.face = value;
    for (const positions of diePips) {
      const side = document.createElement("span");
      side.className = "die-side";
      for (const position of positions) {
        const pip = document.createElement("span");
        pip.className = "die-pip";
        pip.style.gridRow = Math.floor(position / 3) + 1;
        pip.style.gridColumn = position % 3 + 1;
        side.append(pip);
      }
      cube.append(side);
    }
    frame.append(cube);
    return frame;
  }

  globalThis.DisasterArt = { icon, die, paint };
})();

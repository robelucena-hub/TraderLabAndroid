// Motion graphics ITCONT — animação determinística: renderAt(frame) desenha o quadro exato.
(function () {
  const T = window.T, C = T.cues, FPS = T.fps;
  const $ = (id) => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const P = (t, t0, d) => clamp((t - t0) / d);
  const lerp = (a, b, x) => a + (b - a) * x;
  const oCubic = (x) => 1 - Math.pow(1 - x, 3);
  const oExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const ioCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const oBack = (x) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  function rnd(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const R = rnd(20261021);
  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function show(e, op) { e.style.opacity = op; e.style.visibility = op <= 0.002 ? "hidden" : "visible"; }

  const HOOK_END = C.hook_end, CLOSE = C.closing, WIPE = C.closing_wipe;
  const unspoken = T.show_unspoken_info;

  // ---------- grade ----------
  const gl = $("gridLines");
  for (let x = -640; x <= 1720; x += 64) el("line", { x1: x, y1: -700, x2: x, y2: 2600 }, gl);
  for (let y = -704; y <= 2600; y += 64) el("line", { x1: -700, y1: y, x2: 1780, y2: y }, gl);
  gl.setAttribute("stroke-width", "1.5");
  // grade do encerramento
  const cg = $("closeGrid");
  for (let x = 12; x <= 1080; x += 64) el("line", { x1: x, y1: 0, x2: x, y2: 1920 }, cg);
  for (let y = 0; y <= 1920; y += 64) el("line", { x1: 0, y1: y, x2: 1080, y2: y }, cg);

  // ---------- circuitos ----------
  function buildCircuits(g, color, mirrorBoth) {
    const out = [];
    const ys = [300, 430, 560, 700, 840, 990, 1140];
    for (let side = 0; side < 2; side++) {
      ys.forEach((y0, i) => {
        const yy = y0 + (R() - 0.5) * 40;
        const h1 = 60 + R() * 110, d = (R() < 0.5 ? -1 : 1) * (30 + R() * 40), v = 40 + R() * 90;
        let pts = [[-30, yy], [h1, yy], [h1 + Math.abs(d), yy + d], [h1 + Math.abs(d), yy + d + Math.sign(d) * v]];
        if (R() < 0.6) pts.push([h1 + Math.abs(d) + 40 + R() * 50, yy + d + Math.sign(d) * v]);
        if (side === 1) pts = pts.map(([x, y]) => [1080 - x, y]);
        const dstr = "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L");
        const path = el("path", { d: dstr, fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        const end = pts[pts.length - 1];
        const pad = el("circle", { cx: end[0], cy: end[1], r: 6, fill: "none", stroke: color, "stroke-width": 2.2 }, g);
        const dot = el("circle", { r: 4, fill: "#22D3EE" }, g);
        const L = path.getTotalLength();
        path.setAttribute("stroke-dasharray", L); out.push({ path, pad, dot, L, i, side, spd: 160 + R() * 140, off: R() * 1000 });
      });
    }
    return out;
  }
  const circ = buildCircuits($("circG"), "#1F5EFF");
  const circClose = buildCircuits($("closeCirc"), "#3B82F6");

  // ---------- partículas ----------
  function buildParticles(g, n) {
    const a = [];
    for (let i = 0; i < n; i++) {
      const c = el("circle", { r: 1.4 + R() * 2.4, fill: R() < 0.5 ? "#22D3EE" : "#3B82F6" }, g);
      a.push({ c, x: R() * 1080, y: 180 + R() * 1400, sp: 8 + R() * 22, ph: R() * 6.28, amp: 6 + R() * 16, o: 0.25 + R() * 0.45 });
    }
    return a;
  }
  const parts = buildParticles($("partG"), 44);
  const partsClose = buildParticles($("closeParts"), 50);

  // ---------- ícones contábeis discretos ----------
  const gg = $("glyphG");
  const glyphs = [];
  function glyphText(txt, x, y, size) { const t = el("text", { x, y, "font-family": "Sora", "font-weight": 800, "font-size": size, fill: "#0A1B3F", "text-anchor": "middle" }, gg); t.textContent = txt; return t; }
  glyphs.push({ e: glyphText("Σ", 170, 760, 78), x: 170, y: 760 });
  glyphs.push({ e: glyphText("%", 925, 720, 64), x: 925, y: 720 });
  glyphs.push({ e: glyphText("R$", 905, 905, 54), x: 905, y: 905 });
  const bars = el("g", {}, gg);
  [[0, 40], [22, 62], [44, 28], [66, 80]].forEach(([dx, h]) => el("rect", { x: 120 + dx, y: 930 - h, width: 14, height: h, rx: 3, fill: "#1F5EFF" }, bars));
  el("path", { d: "M114 936 H214", stroke: "#0A1B3F", "stroke-width": 3, "stroke-linecap": "round" }, bars);
  glyphs.push({ e: bars, x: 0, y: 0, g: true });

  // ---------- formação ----------
  const nodesX = [200, 540, 880];
  const credItems = [["Graduação", "CONCLUÍDA"], ["Mestrado", "CONCLUÍDO"], ["Doutorado", "EM CONCLUSÃO"]];
  const credTimes = [C.cred_1, C.cred_2, C.cred_3];
  const cn = $("credNodes"), credNodes = [], credLabels = [];
  nodesX.forEach((x, i) => {
    const g = el("g", { transform: `translate(${x} 410)` }, cn);
    el("circle", { r: 20, fill: "rgba(34,211,238,.25)" }, g);
    el("circle", { r: 11, fill: "#0A1B3F", stroke: "#22D3EE", "stroke-width": 4 }, g);
    credNodes.push(g);
    const d = document.createElement("div");
    d.className = "abs"; d.style.cssText = `left:${x - 200}px;top:440px;width:400px;text-align:center`;
    d.innerHTML = `<div class="sora" style="font-size:40px;font-weight:700;color:#0A1B3F;line-height:48px">${credItems[i][0]}</div>` +
      `<div class="mono" style="font-size:20px;font-weight:700;letter-spacing:3px;color:${i === 2 ? "#1F5EFF" : "#3B82F6"}">${credItems[i][1]}</div>`;
    $("credItems").appendChild(d); credLabels.push(d);
  });

  // ---------- linhas do ITCONT ----------
  const itcL = $("itcLines");
  const lineL = el("path", { d: "M300 112 H120 L96 136 H-20" }, itcL), lineR = el("path", { d: "M780 112 H960 L984 88 H1100" }, itcL);
  const padL = el("circle", { cx: 300, cy: 112, r: 6, fill: "#22D3EE", stroke: "none" }, itcL), padR = el("circle", { cx: 780, cy: 112, r: 6, fill: "#22D3EE", stroke: "none" }, itcL);
  [lineL, lineR].forEach((p) => { const L = p.getTotalLength(); p.setAttribute("stroke-dasharray", L); p._L = L; });

  // ---------- informações do encerramento ----------
  const ico = {
    cal: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.8v3.4M16 2.8v3.4"/></svg>',
    clock: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>',
    pin: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
    link: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/></svg>',
  };
  const ev = T.event;
  const rows = [[ico.cal, ev.date]];
  if (unspoken) { rows.push([ico.clock, ev.time]); rows.push([ico.pin, `${ev.venue_1} · ${ev.venue_2.replace(" · ", " — ")}`]); }
  rows.push([ico.link, "Inscrições: link na descrição"]);
  const infoRows = rows.map(([ic, txt]) => {
    const d = document.createElement("div");
    d.style.cssText = "display:flex;align-items:center;gap:18px;white-space:nowrap";
    d.innerHTML = ic + `<span>${txt}</span>`; $("clInfo").appendChild(d); return d;
  });
  if (!unspoken) { $("cTime").style.display = "none"; $("cVenue").style.display = "none"; }

  // ---------- legendas ----------
  const HL = T.highlight.slice().sort((a, b) => b.length - a.length);
  function capHTML(text) {
    let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const marks = [];
    HL.forEach((h) => { let i = html.indexOf(h); while (i >= 0) { if (!marks.some(([a, b]) => i < b && i + h.length > a)) marks.push([i, i + h.length]); i = html.indexOf(h, i + 1); } });
    marks.sort((a, b) => b[0] - a[0]).forEach(([a, b]) => { html = html.slice(0, a) + '<span class="hl">' + html.slice(a, b) + "</span>" + html.slice(b); });
    return html;
  }
  let capCur = -1;

  // largura medida do nome para posicionar a etiqueta UEFS

  // =================================================================
  window.renderAt = function (f) {
    const t = f / FPS;
    const cam = T.cam_frames[Math.min(f, T.cam_frames.length - 1)];
    const dark = t < HOOK_END ? 1 : 0;
    // parallax da grade/circuitos acompanhando a câmera (fator 0.6)
    function wallTf(p) {
      const s = 1 + (cam[0] - 1) * p, x0 = cam[1] * p, y0 = -232 + (cam[2] + 232) * p;
      return `translate(${(-x0 * s).toFixed(2)} ${(s * (-232 - y0)).toFixed(2)}) scale(${s.toFixed(5)})`;
    }
    // ---- fundo ----
    show($("dark"), dark);
    show($("vig"), 1 - dark);
    $("glow").style.opacity = dark ? 0.95 : 0.13 + 0.03 * Math.sin(t * 1.3);
    // grade
    const gIn = dark ? oCubic(P(t, 0.0, 0.5)) : oCubic(P(t, HOOK_END + 0.12, 0.7));
    gl.setAttribute("stroke", dark ? "#22D3EE" : "#1F5EFF");
    gl.setAttribute("stroke-opacity", (dark ? 0.16 : 0.085) * gIn);
    gl.setAttribute("transform", wallTf(0.6));
    // circuitos
    $("circG").setAttribute("transform", wallTf(0.6));
    const tDraw = dark ? 0.05 : HOOK_END + 0.2;
    const burst = Math.exp(-Math.max(0, t - C.itcont) * 2.2) * (t >= C.itcont ? 1 : 0);
    circ.forEach((c) => {
      const pr = oCubic(P(t, tDraw + c.i * 0.07, 0.9));
      c.path.setAttribute("stroke-dashoffset", c.L * (1 - pr));
      c.path.setAttribute("stroke", dark ? "#22D3EE" : "#1F5EFF");
      c.path.setAttribute("stroke-opacity", (dark ? 0.55 : 0.32) + 0.3 * burst);
      c.pad.setAttribute("stroke", dark ? "#22D3EE" : "#1F5EFF");
      c.pad.style.opacity = pr > 0.97 ? (dark ? 0.7 : 0.45) : 0;
      const pos = (t * c.spd * (1 + 1.5 * burst) + c.off) % (c.L + 260);
      if (pr > 0.99 && pos < c.L) { const pt = c.path.getPointAtLength(pos); c.dot.setAttribute("cx", pt.x); c.dot.setAttribute("cy", pt.y); c.dot.style.opacity = (dark ? 0.9 : 0.6) + 0.4 * burst; }
      else c.dot.style.opacity = 0;
    });
    // partículas
    parts.forEach((p) => {
      const y = ((p.y - t * p.sp) % 1500 + 1500) % 1500 + 150;
      p.c.setAttribute("cx", (p.x + Math.sin(t * 0.8 + p.ph) * p.amp).toFixed(1));
      p.c.setAttribute("cy", y.toFixed(1));
      p.c.style.opacity = (dark ? 0.85 : p.o) * (0.6 + 0.4 * Math.sin(t * 2 + p.ph)) * (dark ? 1 : oCubic(P(t, HOOK_END + 0.2, 0.8)));
    });
    // ícones contábeis
    $("glyphG").setAttribute("transform", wallTf(0.35));
    glyphs.forEach((g, i) => { g.e.style.opacity = dark ? 0 : 0.13 * oCubic(P(t, HOOK_END + 0.6 + i * 0.15, 0.8));
      const dy = Math.sin(t * 0.6 + i * 1.7) * 8; g.e.setAttribute("transform", g.g ? `translate(0 ${dy.toFixed(1)})` : `translate(0 ${dy.toFixed(1)})`); });

    // ---- GANCHO ----
    const hk = t < HOOK_END;
    show($("hook"), hk ? 1 : 0);
    if (hk) {
      [["h1", 0.03], ["h2", 0.17], ["h3", 0.34]].forEach(([id, t0]) => {
        const q = oExpo(P(t, t0, 0.55));
        $(id).style.transform = `translateY(${(1 - q) * 135}%)`;
      });
      $("h2").style.backgroundPosition = `${lerp(100, 0, ioCubic(P(t, 0.55, 0.9)))}% 0`;
      $("hline").style.transform = `scaleX(${oCubic(P(t, 0.6, 0.5))})`;
      $("hook").style.transform = `scale(${1 + 0.025 * t})`;
    }
    // transição (cortina)
    const sp = ioCubic(P(t, HOOK_END - 0.24, 0.48));
    const shY = lerp(1960, -2440, sp);
    show($("shutter"), sp > 0 && sp < 1 ? 1 : 0);
    $("shutter").style.transform = `translateY(${shY.toFixed(1)}px)`;

    // ---- TARJA ----
    const lti = C.lower_third_in, lto = C.lower_third_out;
    const ltOn = t >= lti && t < lto + 0.6;
    show($("lt"), ltOn ? 1 : 0);
    if (ltOn) {
      const ex = ioCubic(P(t, lto, 0.32));
      $("ltBar").style.transform = `scaleY(${oExpo(P(t, lti, 0.3)) * (1 - oCubic(P(t, lto + 0.2, 0.25)))})`;
      const nIn = oExpo(P(t, lti + 0.06, 0.5)), rIn = oExpo(P(t, lti + 0.18, 0.5));
      $("ltName").style.clipPath = `inset(0 ${(100 * (1 - nIn) + 100 * ex).toFixed(2)}% 0 0)`;
      $("ltRole").style.clipPath = `inset(0 ${(100 * (1 - rIn) + 100 * ioCubic(P(t, lto + 0.05, 0.32))).toFixed(2)}% 0 0)`;
      $("ltUefs").style.left = 22 + $("ltName").offsetWidth + 14 + "px";
      const u = P(t, C.lower_third_uefs, 0.32);
      $("ltUefs").style.transform = `scale(${u > 0 ? oBack(u) : 0})`;
      $("ltUefs").style.opacity = u > 0 ? 1 - ex : 0;
    }

    // ---- FORMAÇÃO ----
    const crOn = t >= C.cred_in - 0.01 && t < T.segments[1].t1;
    show($("cred"), crOn ? 1 - oCubic(P(t, T.segments[1].t1 - 0.28, 0.24)) : 0);
    if (crOn) {
      $("cred").style.transform = `translateY(${-24 * oCubic(P(t, T.segments[1].t1 - 0.28, 0.24))}px)`;
      const lq = oCubic(P(t, C.cred_in, 0.4));
      $("credLbl").style.opacity = lq; $("credLbl").style.transform = `translateX(${(1 - lq) * -30}px)`;
      $("credHead").style.transform = `translateY(${(1 - oExpo(P(t, C.cred_head, 0.55))) * 135}%)`;
      // linha: chega a cada nó quando o grau é pronunciado
      let x2 = 200;
      if (t >= credTimes[1] - 0.3) x2 = lerp(200, 540, oCubic(P(t, credTimes[1] - 0.3, 0.32)));
      if (t >= credTimes[2] - 0.3) x2 = lerp(540, 880, oCubic(P(t, credTimes[2] - 0.3, 0.32)));
      $("credLine").setAttribute("x2", x2); $("credLine").style.opacity = t >= credTimes[1] - 0.3 ? 1 : 0;
      credNodes.forEach((g, i) => { const q = P(t, credTimes[i], 0.35); g.style.opacity = q > 0 ? 1 : 0;
        g.setAttribute("transform", `translate(${nodesX[i]} 410) scale(${q > 0 ? oBack(q) : 0})`); });
      credLabels.forEach((d, i) => { const q = oExpo(P(t, credTimes[i] + 0.05, 0.45)); d.style.opacity = q; d.style.transform = `translateY(${(1 - q) * 24}px)`; });
    }

    // ---- CONVITE ----
    const B1 = T.segments[2].t1; // fim do segmento B
    const tg = P(t, C.first_tag, 0.3);
    show($("tag1"), t >= C.first_tag && t < C.itcont + 0.25 ? 1 - P(t, C.itcont, 0.2) : 0);
    $("tag1").style.transform = `scale(${tg > 0 ? oBack(tg) : 0})`;
    const wOn = t >= C.w_imersao && t < C.itcont + 0.35;
    show($("words"), wOn ? 1 - oCubic(P(t, C.itcont - 0.04, 0.26)) : 0);
    if (wOn) {
      [["w1", C.w_imersao], ["w2", C.w_tecnologica], ["w3", C.w_contabil]].forEach(([id, t0]) => {
        $(id).style.transform = `translateY(${(1 - oExpo(P(t, t0, 0.42))) * 135}%)`; });
      const ex = oCubic(P(t, C.itcont - 0.04, 0.26));
      $("words").style.transform = `translateY(${-50 * ex}px) scale(${1 - 0.12 * ex})`;
    }
    const itOn = t >= C.itcont && t < C.date_in + 0.3;
    show($("itc"), itOn ? 1 - oCubic(P(t, C.date_in - 0.62, 0.3)) : 0);
    if (itOn) {
      const q = oExpo(P(t, C.itcont, 0.5));
      const sh = ioCubic(P(t, C.date_in - 0.75, 0.45)); // encolhe para o cabeçalho
      $("itcWord").style.clipPath = `inset(0 ${(50 * (1 - q)).toFixed(2)}% 0 ${(50 * (1 - q)).toFixed(2)}%)`;
      $("itcShine").style.clipPath = $("itcWord").style.clipPath;
      const sc = (1.12 - 0.12 * q) * lerp(1, 0.28, sh);
      $("itcWord").style.transform = `translateY(${-92 * sh}px) scale(${sc})`;
      $("itcShine").style.transform = $("itcWord").style.transform;
      $("itcShine").style.backgroundPosition = `${lerp(100, 0, ioCubic(P(t, C.itcont + 0.25, 0.9)))}% 0`;
      const lq = oCubic(P(t, C.itcont + 0.12, 0.5));
      [lineL, lineR].forEach((p) => p.setAttribute("stroke-dashoffset", p._L * (1 - lq)));
      $("itcLines").style.opacity = 1 - sh;
      padL.style.opacity = padR.style.opacity = lq > 0 ? 1 - sh : 0;
      const sq = oExpo(P(t, C.itcont + 0.2, 0.5));
      $("itcSub").style.opacity = sq * (1 - P(t, C.date_in - 0.85, 0.2));
      $("itcSub").style.transform = `translateY(${(1 - sq) * 26}px)`;
      const u = P(t, C.itcont_uefs, 0.32);
      $("itcUefs").style.transform = `scale(${u > 0 ? oBack(u) : 0})`;
    }
    // cabeçalho compacto
    const hdOn = t >= C.date_in - 0.4 && t < C.link_in + 0.3;
    show($("hdr"), hdOn ? oCubic(P(t, C.date_in - 0.4, 0.25)) * (1 - oCubic(P(t, C.link_in, 0.25))) : 0);

    // ---- INFORMAÇÕES ----
    function cardAnim(id, tin, k) {
      const on = t >= tin && t < C.link_in + 0.5;
      const e = $(id); show(e, on ? 1 : 0); if (!on) return;
      const q = oExpo(P(t, tin, 0.5)), x = oCubic(P(t, C.link_in + k * 0.04, 0.24));
      e.style.opacity = q * (1 - x);
      e.style.transform = `translateY(${(1 - q) * 34 - 40 * x}px)`;
      e.style.clipPath = `inset(0 ${(100 * (1 - q)).toFixed(2)}% 0 0 round 24px)`;
    }
    cardAnim("cDate", C.date_in, 0); cardAnim("cTime", C.time_in, 1); cardAnim("cVenue", C.venue_in, 2);
    [["d21", C.date_21], ["d22", C.date_22], ["dMonth", C.date_month], ["dYear", C.date_year]].forEach(([id, t0]) => {
      const q = oExpo(P(t, t0, 0.35)); $(id).style.opacity = q; if (id[1] === "2") $(id).style.display = "inline-block";
      $(id).style.transform = `translateY(${(1 - q) * 18}px)`; });
    // inscrições
    const lkOn = t >= C.link_in && t < C.cards_out + 0.4;
    show($("link"), lkOn ? oCubic(P(t, C.link_in + 0.24, 0.3)) * (1 - oCubic(P(t, C.cards_out, 0.3))) : 0);
    if (lkOn) {
      $("linkTxt").style.transform = `translateY(${(1 - oExpo(P(t, C.link_in + 0.28, 0.5))) * 135}%)`;
      $("linkArrow").style.transform = `translateY(${(Math.sin((t - C.link_in) * 7) * 8).toFixed(1)}px)`;
      $("link").style.transform = `translateY(${-20 * oCubic(P(t, C.cards_out, 0.3))}px)`;
    }
    // ITCONT final
    const fq = P(t, C.final_itcont, 0.34);
    show($("fin"), t >= C.final_itcont && t < CLOSE + 0.5 ? oCubic(fq) : 0);
    $("fin").style.transform = `scale(${fq > 0 ? lerp(1.28, 1, oBack(fq)) : 1})`;

    // ---- LEGENDAS ----
    let ci = -1;
    for (let i = 0; i < T.captions.length; i++) { const c = T.captions[i]; if (t >= c.t0 && t < c.t1) { ci = i; break; } }
    if (ci !== capCur) { capCur = ci; $("capBox").innerHTML = ci >= 0 ? capHTML(T.captions[ci].text) : ""; }
    if (ci >= 0 && t < WIPE + 0.1) {
      const c = T.captions[ci]; const q = oCubic(P(t, c.t0, 0.14)), x = P(t, c.t1 - 0.08, 0.08);
      show($("cap"), q * (1 - x)); $("cap").style.transform = `translateY(${(1 - q) * 12}px)`;
    } else show($("cap"), 0);

    // ---- ENCERRAMENTO ----
    const cw = ioCubic(P(t, WIPE, 0.46));
    show($("close"), cw > 0 ? 1 : 0);
    if (cw > 0) {
      $("close").style.transform = `translateY(${((1 - cw) * 1940).toFixed(1)}px)`;
      $("clEdge").style.opacity = 1 - P(t, WIPE + 0.4, 0.3);
      const tc = WIPE + 0.3;
      const fade = (id, t0, dy = 26) => { const q = oExpo(P(t, t0, 0.55)); $(id).style.opacity = q; $(id).style.transform = `translateY(${(1 - q) * dy}px)`; };
      fade("cl0", tc + 0.02);
      $("cl1").style.transform = `translateY(${(1 - oExpo(P(t, tc + 0.08, 0.6))) * 135}%)`;
      fade("cl2", tc + 0.28); fade("cl3", tc + 0.36);
      $("clDiv").style.transform = `scaleX(${oCubic(P(t, tc + 0.42, 0.5))})`;
      infoRows.forEach((d, i) => { const q = oExpo(P(t, tc + 0.5 + i * 0.09, 0.5)); d.style.opacity = q; d.style.transform = `translateX(${(1 - q) * -30}px)`; });
      const cq = P(t, tc + 0.92, 0.42); $("clCta").style.opacity = oCubic(cq); $("clCta").style.transform = `scale(${cq > 0 ? lerp(0.9, 1, oBack(cq)) : 0.9})`;
      fade("clOrg", tc + 1.12);
      circClose.forEach((c) => {
        const pr = oCubic(P(t, WIPE + 0.25 + c.i * 0.06, 0.8));
        c.path.setAttribute("stroke-dashoffset", c.L * (1 - pr)); c.path.setAttribute("stroke-opacity", 0.5);
        c.pad.style.opacity = pr > 0.97 ? 0.7 : 0;
        const pos = (t * c.spd + c.off) % (c.L + 260);
        if (pr > 0.99 && pos < c.L) { const pt = c.path.getPointAtLength(pos); c.dot.setAttribute("cx", pt.x); c.dot.setAttribute("cy", pt.y); c.dot.style.opacity = 0.9; } else c.dot.style.opacity = 0;
      });
      partsClose.forEach((p) => { const y = ((p.y - t * p.sp) % 1500 + 1500) % 1500 + 150;
        p.c.setAttribute("cx", (p.x + Math.sin(t * 0.8 + p.ph) * p.amp).toFixed(1)); p.c.setAttribute("cy", y.toFixed(1));
        p.c.style.opacity = 0.8 * (0.6 + 0.4 * Math.sin(t * 2 + p.ph)); });
    }
  };
  window.__ready = true;
})();

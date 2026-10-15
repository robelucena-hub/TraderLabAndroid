// Motion graphics ITCONT — Angelo Loula. renderAt(frame) desenha o quadro exato (determinístico).
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
  const R = rnd(20261023);
  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function show(e, op) { e.style.opacity = op; e.style.visibility = op <= 0.002 ? "hidden" : "visible"; }
  const win = (t, a, b, din = 0.3, dout = 0.3) => oCubic(P(t, a, din)) * (1 - oCubic(P(t, b, dout)));

  const HOOK_END = C.seg_H_t1, CLOSE = C.closing, WIPE = C.closing_wipe;
  const unspoken = T.show_unspoken_info;

  // ---------- grade (parede à esquerda) ----------
  const gl = $("gridLines");
  for (let x = -40; x <= 700; x += 56) el("line", { x1: x, y1: 0, x2: x, y2: 1400 }, gl);
  for (let y = 0; y <= 1400; y += 56) el("line", { x1: -40, y1: y, x2: 700, y2: y }, gl);
  gl.setAttribute("stroke-width", "1.4");
  const cg = $("closeGrid");
  for (let x = 12; x <= 1080; x += 64) el("line", { x1: x, y1: 0, x2: x, y2: 1920 }, cg);
  for (let y = 0; y <= 1920; y += 64) el("line", { x1: 0, y1: y, x2: 1080, y2: y }, cg);

  // ---------- circuitos ----------
  function buildCircuits(g, color, ys, avoid, xs = 1) {
    const out = [];
    const bad = (pts) => (avoid || []).some((r) => pts.some(([x, y]) => x > r[0] - 40 && x < r[2] + 40 && y > r[1] - 40 && y < r[3] + 40));
    for (let side = 0; side < 2; side++) {
      ys.forEach((y0, i) => {
        let pts, tries = 0;
        do {   // re-sorteia o traçado se algum vértice ou o terminal cair perto da área protegida
          const yy = y0 + (R() - 0.5) * 40;
          const h1 = 50 + R() * 90, d = (R() < 0.5 ? -1 : 1) * (26 + R() * 34), v = 30 + R() * 70;
          pts = [[-30, yy], [h1, yy], [h1 + Math.abs(d), yy + d], [h1 + Math.abs(d), yy + d + Math.sign(d) * v]];
          if (R() < 0.6) pts.push([h1 + Math.abs(d) + 30 + R() * 40, yy + d + Math.sign(d) * v]);
          pts = pts.map(([x, y]) => [x * xs, y]);
          if (side === 1) pts = pts.map(([x, y]) => [1080 - x, y]);
        } while (bad(pts) && ++tries < 40);
        const path = el("path", { d: "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L"), fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        const end = pts[pts.length - 1];
        const pad = el("circle", { cx: end[0], cy: end[1], r: 6, fill: "none", stroke: color, "stroke-width": 2.2 }, g);
        const dot = el("circle", { r: 4, fill: "#22D3EE" }, g);
        const L = path.getTotalLength(); path.setAttribute("stroke-dasharray", L);
        out.push({ path, pad, dot, L, i, spd: 150 + R() * 130, off: R() * 1000 });
      });
    }
    return out;
  }
  const circ = buildCircuits($("circG"), "#3B82F6", [880, 1010, 1140], null, 0.55);   // só nas bordas da parede
  const circClose = buildCircuits($("closeCirc"), "#3B82F6", [300, 430, 560, 700, 840, 1190, 1310],
    [[140, 940, 940, 1110], [240, 1120, 840, 1300]]);   // nenhum traçado perto das linhas de informação nem do botão
  function animCircuits(list, t, tDraw, op, burst) {
    list.forEach((c) => {
      const pr = oCubic(P(t, tDraw + c.i * 0.07, 0.9));
      c.path.setAttribute("stroke-dashoffset", c.L * (1 - pr));
      c.path.setAttribute("stroke-opacity", op + 0.3 * burst);
      c.pad.style.opacity = pr > 0.97 ? op + 0.2 : 0;
      const pos = (t * c.spd * (1 + 1.5 * burst) + c.off) % (c.L + 260);
      if (pr > 0.99 && pos < c.L) { const pt = c.path.getPointAtLength(pos); c.dot.setAttribute("cx", pt.x); c.dot.setAttribute("cy", pt.y); c.dot.style.opacity = 0.75 + 0.25 * burst; }
      else c.dot.style.opacity = 0;
    });
  }

  // ---------- partículas ----------
  function buildParticles(g, n, y0, h) {
    const a = [];
    for (let i = 0; i < n; i++) {
      const c = el("circle", { r: 1.4 + R() * 2.2, fill: R() < 0.5 ? "#22D3EE" : "#3B82F6" }, g);
      a.push({ c, x: R() * 1080, y: y0 + R() * h, sp: 8 + R() * 20, ph: R() * 6.28, amp: 6 + R() * 14, o: 0.3 + R() * 0.45, h, y0 });
    }
    return a;
  }
  const parts = buildParticles($("partG"), 26, 160, 1000);
  const partsClose = buildParticles($("closeParts"), 50, 150, 1500);
  function animParticles(list, t, mult) {
    list.forEach((p) => {
      const y = ((p.y - p.y0 - t * p.sp) % p.h + p.h) % p.h + p.y0;
      p.c.setAttribute("cx", (p.x + Math.sin(t * 0.8 + p.ph) * p.amp).toFixed(1));
      p.c.setAttribute("cy", y.toFixed(1));
      p.c.style.opacity = p.o * mult * (0.6 + 0.4 * Math.sin(t * 2 + p.ph));
    });
  }

  // ---------- encerramento: linhas de informação ----------
  const ico = {
    cal: '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.8v3.4M16 2.8v3.4"/></svg>',
    pin: '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
  };
  const ev = T.event;
  const rows = unspoken ? [[ico.cal, `${ev.session_date} · ${ev.session_time}`], [ico.pin, `${ev.institution} — ${ev.venue_1} · ${ev.venue_2}`]] : [];
  const infoRows = rows.map(([ic, txt]) => {
    const d = document.createElement("div"); d.style.cssText = "display:flex;align-items:center;gap:16px;white-space:nowrap";
    d.innerHTML = ic + `<span>${txt}</span>`; $("clInfo").appendChild(d); return d;
  });
  if (!unspoken) { $("clCta").style.top = "1010px"; $("clOrg").style.top = "1206px"; }

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
  // digitação sincronizada (rótulos em fonte mono) com cursor
  function typeIn(id, text, t, t0, t1) {
    const n = Math.round(text.length * clamp(P(t, t0, t1 - t0)));
    const blink = t > t1 && Math.floor((t - t1) * 2.5) % 2 === 1;
    $(id).innerHTML = text.slice(0, n) + (t >= t0 - 0.15 && !blink ? '<span class="caret"></span>' : "");
  }
  function typeWords(id, words, t) {
    let txt = "", started = false, done = true;
    words.forEach(([w, t0, t1], i) => {
      const n = Math.round(w.length * clamp(P(t, t0, Math.max(0.08, t1 - t0))));
      if (n > 0) { txt += (i ? " " : "") + w.slice(0, n); started = true; }
      if (n < w.length) done = false;
    });
    const tEnd = words[words.length - 1][2], blink = done && Math.floor((t - tEnd) * 2.5) % 2 === 1;
    $(id).innerHTML = txt + (t >= words[0][1] - 0.15 && !blink ? '<span class="caret"></span>' : "");
  }
  // bloco de título: aparece/some inteiro com leve subida na saída
  function block(id, tin, tout, t, dout = 0.3) {
    const on = t >= tin - 0.05 && t < tout + dout + 0.1;
    show($(id), on ? 1 - oCubic(P(t, tout, dout)) : 0);
    if (on) $(id).style.transform = `translateY(${-20 * oCubic(P(t, tout, dout))}px)`;
    return on;
  }
  const rise = (id, t, t0, d = 0.45) => { $(id).style.transform = `translateY(${(1 - oExpo(P(t, t0, d))) * 135}%)`; };
  const slideIn = (id, t, t0, dx = 40) => { $(id).style.opacity = oCubic(P(t, t0 - 0.04, 0.25)); $(id).style.transform = `translateX(${(1 - oExpo(P(t, t0 - 0.04, 0.4))) * dx}px)`; };
  // conector em L do começo da linha de cima até a linha de baixo (alinhada à direita)
  function connector(blockId, pathId, topIds, botIds) {
    const base = $(blockId).getBoundingClientRect();
    const a = $(topIds[0]).getBoundingClientRect();
    const left = Math.min(...botIds.map((i) => $(i).getBoundingClientRect().left));
    const bt = $(botIds[0]).getBoundingClientRect();
    const x1 = a.left - base.left + 30, y1 = a.bottom - base.top - 4, x2 = left - base.left - 18, y2 = bt.top - base.top + 36;
    $(pathId).setAttribute("d", `M${x1} ${y1} V${y2} H${x2}`);
    const L = $(pathId).getTotalLength(); $(pathId).setAttribute("stroke-dasharray", L); return L;
  }
  function drawConn(pathId, dotId, L, q) {
    $(pathId).setAttribute("stroke-dashoffset", L * (1 - q));
    const pt = $(pathId).getPointAtLength(L * q); $(dotId).setAttribute("cx", pt.x); $(dotId).setAttribute("cy", pt.y);
    $(dotId).style.opacity = q > 0 ? 1 : 0;
  }
  // geometria medida uma vez, na primeira chamada (fontes já carregadas, nada deslocado ainda)
  let stpL = 0, temaL = 0, roleW = null;

  // =================================================================
  window.renderAt = function (f) {
    if (!roleW) {
      stpL = connector("stp", "stpPath", ["stp1"], ["stp3"]);
      temaL = connector("tema", "temaPath", ["ia1"], ["inv", "emp"]);
      roleW = [$("ltR1").offsetWidth, $("ltR2").offsetWidth];
    }
    const t = f / FPS;
    const body = t >= HOOK_END;

    // ---- faixa escura no topo (gancho e títulos) ----
    show($("scrimTop"), win(t, -1, CLOSE + 1, 0.3, 0.3));
    $("gridLines").setAttribute("stroke", "#22D3EE");
    $("gridLines").setAttribute("stroke-opacity", 0.07 * oCubic(P(t, HOOK_END + 0.15, 0.8)));
    const burst = t >= C.logo_in ? Math.exp(-(t - C.logo_in) * 2.2) : 0;
    animCircuits(circ, t, body ? HOOK_END + 0.2 : 0.05, 0.4, burst);
    animParticles(parts, t, body ? oCubic(P(t, HOOK_END + 0.2, 0.8)) : 1);

    // ---- GANCHO ----
    show($("hook"), t < HOOK_END ? 1 : 0);
    if (t < HOOK_END) {
      [["h1", -0.35], ["h2", -0.15]].forEach(([id, t0]) => { $(id).style.transform = `translateY(${(1 - oExpo(P(t, t0, 0.55))) * 135}%)`; });
      $("h2").style.backgroundPosition = `${lerp(100, 0, ioCubic(P(t, 0.7, 1.0)))}% 0`;
      $("hline").style.transform = `scaleX(${oCubic(P(t, 0.15, 0.5))})`;
      $("hook").style.transform = `scale(${1 + 0.015 * t})`;
    }
    const sp = ioCubic(P(t, HOOK_END - 0.24, 0.48));
    show($("shutter"), sp > 0 && sp < 1 ? 1 : 0);
    $("shutter").style.transform = `translateY(${lerp(1960, -2440, sp).toFixed(1)}px)`;

    // ---- TARJA: nome + função (rola para a segunda função) ----
    const lti = C.lt_in, lto = C.lt_out;
    const ltOn = t >= lti && t < lto + 0.6;
    show($("lt"), ltOn ? 1 - oCubic(P(t, lto + 0.12, 0.22)) : 0);   // some por inteiro (sem sobras da barra/caixa)
    if (ltOn) {
      const ex = ioCubic(P(t, lto, 0.32));
      $("ltBar").style.transform = `scaleY(${oExpo(P(t, lti, 0.3)) * (1 - oCubic(P(t, lto + 0.2, 0.25)))})`;
      const nIn = oExpo(P(t, lti + 0.06, 0.5)), rIn = oExpo(P(t, C.lt_role - 0.05, 0.45));
      $("ltName").style.clipPath = `inset(0 ${(100 * (1 - nIn) + 100 * ex).toFixed(2)}% 0 0)`;
      const qw = ioCubic(P(t, C.lt_role2 - 0.16, 0.2)), q2 = ioCubic(P(t, C.lt_role2 - 0.02, 0.32));
      $("ltRole").style.width = lerp(roleW[0], roleW[1], qw).toFixed(1) + "px";
      $("ltRoleIn").style.transform = `translateY(${(-60 * q2).toFixed(1)}px)`;
      $("ltRole").style.clipPath = `inset(0 ${(100 * (1 - rIn) + 100 * ioCubic(P(t, lto + 0.05, 0.32))).toFixed(2)}% 0 0)`;
    }

    // ---- E COORDENO O / PROGRAMA DE ACELERAÇÃO / DE STARTUPS ----
    if (block("stp", C.stp_in, C.stp_out, t, 0.15)) {
      typeIn("stpType", "E COORDENO O", t, C.stp_in + 0.04, C.stp_kick_end);
      rise("stp1", t, C.stp_prog); slideIn("stp2", t, C.stp_acel);
      drawConn("stpPath", "stpDot", stpL, ioCubic(P(t, C.stp_de - 0.3, 0.4)));
      rise("stp3", t, C.stp_de);
      const q = clamp(P(t, C.stp_start - 0.04, 0.3));
      $("stp4").style.opacity = oCubic(q); $("stp4").style.transform = `scale(${t >= C.stp_start - 0.04 ? lerp(0.7, 1, oBack(q)) : 0.7})`;
    }

    // ---- TRABALHO NA / AGÊNCIA DE INOVAÇÃO ----
    if (block("ag", C.ag_in, C.ag_out, t, 0.12)) {
      typeIn("agType", "TRABALHO NA", t, C.ag_in + 0.04, C.ag_kick_end);
      rise("ag1", t, C.ag_word); rise("ag2", t, C.ag_inov);
      $("agLine").style.transform = `scaleX(${oCubic(P(t, C.ag_inov + 0.05, 0.45))})`;
    }

    // ---- TEMA: INTELIGÊNCIA ARTIFICIAL E INOVAÇÃO → COMO ESTRATÉGIA EMPRESARIAL ----
    if (block("tema", C.tema_in, C.tema_out, t, 0.35)) {
      const cq = oBack(clamp(P(t, C.tema_in, 0.3)));
      $("temaChip").style.transform = `scale(${t >= C.tema_in ? cq : 0})`;
      typeWords("temaK1", [["VOU", C.kw_vou, C.kw_falar], ["FALAR", C.kw_falar, C.kw_com], ["COM", C.kw_com, C.kw_voces],
                           ["VOCÊS", C.kw_voces, C.kw_voces_end], ["SOBRE", C.kw_sobre, C.tema_kick_end]], t);
      const kq = ioCubic(P(t, C.tema_como - 0.04, 0.32));
      $("temaK1").style.transform = `translateY(${(-110 * kq).toFixed(1)}%)`;
      $("temaK2").style.transform = `translateY(${(110 * (1 - kq)).toFixed(1)}%)`;
      const sw = ioCubic(P(t, C.tema_como - 0.04, 0.32));            // troca de frase nas duas linhas
      $("ia1").style.transform = `translateY(${((1 - oExpo(P(t, C.tema_ia, 0.45))) * 135 - 135 * sw).toFixed(2)}%)`;
      slideIn("ia2", t, C.tema_art);
      $("co1").style.transform = `translateY(${(1 - oExpo(P(t, C.tema_como, 0.45))) * 135}%)`;
      slideIn("co2", t, C.tema_estr);
      const sw2 = ioCubic(P(t, C.tema_como + 0.02, 0.32));
      $("inv").style.transform = `translateY(${(-135 * sw2).toFixed(2)}%)`;
      rise("inv1", t, C.tema_e); rise("inv2", t, C.tema_inov);
      $("emp").style.transform = `translateY(${(1 - oExpo(P(t, C.tema_emp, 0.45))) * 135}%)`;
      drawConn("temaPath", "temaDot", temaL, ioCubic(P(t, C.tema_e - 0.3, 0.4)));
    }

    // ---- LOGO OFICIAL + IMERSÃO TECNOLÓGICA CONTÁBIL ----
    const lgOn = t >= C.logo_in && t < C.logo_out + 0.5;
    show($("logoBadge"), lgOn ? 1 - oCubic(P(t, C.logo_out, 0.3)) : 0);
    if (lgOn) {
      const q = oExpo(P(t, C.logo_in, 0.55));
      $("logoBadge").style.clipPath = `inset(0 ${(50 * (1 - q)).toFixed(2)}% 0 ${(50 * (1 - q)).toFixed(2)}% round 24px)`;
      $("logoBadge").style.transform = `translateY(${-20 * oCubic(P(t, C.logo_out, 0.3))}px) scale(${lerp(1.08, 1, q)})`;
      $("logoShine").style.backgroundPosition = `${lerp(100, 0, ioCubic(P(t, C.logo_in + 0.35, 0.9)))}% 0`;
    }
    if (block("imt", C.imt_im, C.logo_out + 0.04, t)) { rise("imt1", t, C.imt_im); rise("imt2", t, C.imt_tec); rise("imt3", t, C.imt_cont); }

    // ---- FINAL: VAMOS LÁ? PARTICIPE! (frente, atravessa a cortina) ----
    const TC = WIPE + 0.5;    // entrada do conteúdo do encerramento (logo após a cortina cobrir o quadro)
    const fnOn = t >= C.final_in - 0.05 && t < TC + 0.4;
    show($("fin"), fnOn ? 1 - oCubic(P(t, TC - 0.32, 0.24)) : 0);   // some sobre a cortina, antes da logo abrir
    if (fnOn) {
      rise("fin1", t, C.final_in); rise("fin1b", t, C.final_la);
      $("fin2").style.transform = `translateY(${(1 - oExpo(P(t, C.final_part, 0.45))) * 135}%) scale(${lerp(1.06, 1, oCubic(P(t, C.final_part, 0.5)))})`;
    }

    // ---- LEGENDAS (seguem até o fim da fala, mesmo sobre o encerramento) ----
    let ci = -1;
    for (let i = 0; i < T.captions.length; i++) { const c = T.captions[i]; if (t >= c.t0 && t < c.t1) { ci = c.hide ? -1 : i; break; } }
    if (ci !== capCur) {
      capCur = ci; const box = $("capBox"), tx = $("capTxt");
      tx.innerHTML = ci >= 0 ? capHTML(T.captions[ci].text).replace(/\n/g, "<br>") : "";
      box.style.width = ""; box.style.fontSize = "";
      if (ci >= 0 && $("cap").offsetHeight > 90) box.style.fontSize = "38px";
      if (ci >= 0) {   // largura da caixa = linha mais longa (text-wrap:balance não encolhe a caixa)
        const w = Math.max(...[...tx.getClientRects()].map((r) => r.width));
        box.style.width = Math.ceil(w + 48 + 2) + "px";
      }
    }
    if (ci >= 0) {
      const c = T.captions[ci];
      const q = c.joined_prev ? 1 : oCubic(P(t, c.t0, 0.14)), x = c.joined_next ? 0 : P(t, c.t1 - 0.08, 0.08);
      const hBox = $("cap").offsetHeight;
      $("cap").style.top = (T.caption_y - hBox / 2).toFixed(1) + "px";   // centrada no peito, abaixo da barba
      show($("cap"), q * (1 - x)); $("cap").style.transform = `translateY(${(1 - q) * 12}px)`;
    } else show($("cap"), 0);

    // ---- ENCERRAMENTO ----
    const cw = ioCubic(P(t, WIPE, 0.46));
    show($("close"), cw > 0 ? 1 : 0);
    if (cw > 0) {
      $("close").style.transform = `translateY(${((1 - cw) * 1940).toFixed(1)}px)`;
      $("clEdge").style.opacity = 1 - P(t, WIPE + 0.4, 0.3);
      const tc = TC;
      const fade = (id, t0, dy = 26) => { const q = oExpo(P(t, t0, 0.55)); $(id).style.opacity = q; $(id).style.transform = `translateY(${(1 - q) * dy}px)`; };
      const lq = oExpo(P(t, tc, 0.6));
      $("cl1").style.opacity = lq; $("cl1").style.transform = `scale(${lerp(0.92, 1, lq)})`;
      $("cl1").style.clipPath = `inset(0 ${(50 * (1 - lq)).toFixed(2)}% 0 ${(50 * (1 - lq)).toFixed(2)}% round 30px)`;
      $("clShine").style.backgroundPosition = `${lerp(100, 0, ioCubic(P(t, tc + 0.6, 1.0)))}% 0`;
      fade("clName", tc + 0.28);
      $("clDiv").style.transform = `scaleX(${oCubic(P(t, tc + 0.4, 0.5))})`;
      infoRows.forEach((d, i) => { const q = oExpo(P(t, tc + 0.48 + i * 0.08, 0.5)); d.style.opacity = q; d.style.transform = `translateX(${(1 - q) * -30}px)`; });
      const cq = P(t, tc + 0.68, 0.42); $("clCta").style.opacity = oCubic(cq); $("clCta").style.transform = `scale(${cq > 0 ? lerp(0.9, 1, oBack(cq)) : 0.9})`;
      fade("clOrg", tc + 0.85);
      animCircuits(circClose, t, WIPE + 0.25, 0.5, 0);
      animParticles(partsClose, t, 1);
    }
  };
  // estado inicial: tudo oculto até a primeira chamada (as medidas acima usam a posição final)
  ["hook", "lt", "stp", "ag", "tema", "logoBadge", "imt", "fin", "cap", "close", "shutter"].forEach((id) => show($(id), 0));
  window.__ready = true;
})();

// Motion graphics ITCONT — André Dedeko. renderAt(frame) desenha o quadro exato (determinístico).
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
  // janela de visibilidade com entrada/saída suaves
  const win = (t, a, b, din = 0.3, dout = 0.3) => oCubic(P(t, a, din)) * (1 - oCubic(P(t, b, dout)));

  const HOOK_END = C.seg_H_t1, CLOSE = C.closing, WIPE = C.closing_wipe;
  const unspoken = T.show_unspoken_info;

  // ---------- grade (só na parede à esquerda) ----------
  const gl = $("gridLines");
  for (let x = -40; x <= 700; x += 56) el("line", { x1: x, y1: 0, x2: x, y2: 1400 }, gl);
  for (let y = 0; y <= 1400; y += 56) el("line", { x1: -40, y1: y, x2: 700, y2: y }, gl);
  gl.setAttribute("stroke-width", "1.4");
  const cg = $("closeGrid");
  for (let x = 12; x <= 1080; x += 64) el("line", { x1: x, y1: 0, x2: x, y2: 1920 }, cg);
  for (let y = 0; y <= 1920; y += 64) el("line", { x1: 0, y1: y, x2: 1080, y2: y }, cg);

  // ---------- circuitos ----------
  function buildCircuits(g, color, ys) {
    const out = [];
    for (let side = 0; side < 2; side++) {
      ys.forEach((y0, i) => {
        const yy = y0 + (R() - 0.5) * 40;
        const h1 = 50 + R() * 90, d = (R() < 0.5 ? -1 : 1) * (26 + R() * 34), v = 30 + R() * 70;
        let pts = [[-30, yy], [h1, yy], [h1 + Math.abs(d), yy + d], [h1 + Math.abs(d), yy + d + Math.sign(d) * v]];
        if (R() < 0.6) pts.push([h1 + Math.abs(d) + 30 + R() * 40, yy + d + Math.sign(d) * v]);
        if (side === 1) pts = pts.map(([x, y]) => [1080 - x, y]);
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
  const circ = buildCircuits($("circG"), "#3B82F6", [880, 1010, 1140]);
  const circClose = buildCircuits($("closeCirc"), "#3B82F6", [300, 430, 560, 700, 840, 990, 1140, 1290]);
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
  const parts = buildParticles($("partG"), 26, 200, 1000);
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
  ico.door = '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V5.5L13 3v18M13 5h5v16M2.5 21h19"/><circle cx="10.2" cy="12.5" r=".6" fill="#22D3EE"/></svg>';
  const ev = T.event;
  const rows = [[ico.cal, ev.session_date], [ico.pin, ev.city]];
  if (unspoken) rows.push([ico.door, `${ev.institution} — ${ev.venue_1} · ${ev.venue_2}`]);
  const infoRows = rows.map(([ic, txt]) => {
    const d = document.createElement("div"); d.style.cssText = "display:flex;align-items:center;gap:16px;white-space:nowrap";
    d.innerHTML = ic + `<span>${txt}</span>`; $("clInfo").appendChild(d); return d;
  });
  if (!unspoken) { $("clCta").style.top = "1124px"; $("clOrg").style.top = "1320px"; }

  // ---------- legendas ----------
  const HL = T.highlight.slice().sort((a, b) => b.length - a.length);
  function capHTML(text) {
    let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const marks = [];
    HL.forEach((h) => { let i = html.indexOf(h); while (i >= 0) { if (!marks.some(([a, b]) => i < b && i + h.length > a)) marks.push([i, i + h.length]); i = html.indexOf(h, i + 1); } });
    marks.sort((a, b) => b[0] - a[0]).forEach(([a, b]) => { html = html.slice(0, a) + '<span class="hl">' + html.slice(a, b) + "</span>" + html.slice(b); });
    return html;
  }
  let capCur = -1, rotGeom = null, prepGeom = null;
  const KICK = "CADA VEZ MAIS IMPORTANTE", EVOK = "PRECISAMOS ACOMPANHAR";

  // =================================================================
  window.renderAt = function (f) {
    const t = f / FPS;
    const body = t >= HOOK_END;

    // ---- faixas escuras atrás dos títulos ----
    const topOn = Math.max(win(t, -1, HOOK_END - 0.05, 0.3, 0.1),
                           win(t, C.lt_in - 0.15, CLOSE + 1, 0.35, 0.3));
    show($("scrimTop"), topOn);
    show($("scrimLeft"), win(t, C.date_in - 0.3, C.cards_out + 0.1, 0.4, 0.4));
    // grade, circuitos e partículas
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
      $("hook").style.transform = `scale(${1 + 0.02 * t})`;
    }
    const sp = ioCubic(P(t, HOOK_END - 0.24, 0.48));
    show($("shutter"), sp > 0 && sp < 1 ? 1 : 0);
    $("shutter").style.transform = `translateY(${lerp(1960, -2440, sp).toFixed(1)}px)`;

    // ---- TARJA ----
    const lti = C.lt_in, lto = C.lt_out;
    const ltOn = t >= lti && t < lto + 0.6;
    show($("lt"), ltOn ? 1 : 0);
    if (ltOn) {
      const ex = ioCubic(P(t, lto, 0.32));
      $("ltBar").style.transform = `scaleY(${oExpo(P(t, lti, 0.3)) * (1 - oCubic(P(t, lto + 0.2, 0.25)))})`;
      const nIn = oExpo(P(t, lti + 0.06, 0.5)), rIn = oExpo(P(t, C.lt_role - 0.05, 0.45));
      $("ltName").style.clipPath = `inset(0 ${(100 * (1 - nIn) + 100 * ex).toFixed(2)}% 0 0)`;
      $("ltRole").style.clipPath = `inset(0 ${(100 * (1 - rIn) + 100 * ioCubic(P(t, lto + 0.05, 0.32))).toFixed(2)}% 0 0)`;
    }

    // ---- DATA E LOCAL ----
    function card(id, tin, k) {
      const on = t >= tin && t < C.cards_out + 0.6;
      const e = $(id); show(e, on ? 1 : 0); if (!on) return;
      const q = oExpo(P(t, tin, 0.5)), x = oCubic(P(t, C.cards_out + k * 0.06, 0.3));
      e.style.opacity = q * (1 - x);
      e.style.transform = `translateX(${(1 - q) * -40 - 40 * x}px)`;
      e.style.clipPath = `inset(0 ${(100 * (1 - q)).toFixed(2)}% 0 0 round 22px)`;
    }
    card("cDate", C.date_in, 0); card("cLoc", C.loc_in, 1);
    [["d21", C.date_21], ["dMonth", C.date_month], ["lCity", C.loc_city]].forEach(([id, t0]) => {
      const q = oExpo(P(t, t0, 0.35)); $(id).style.opacity = q;
      $(id).style.transform = `translateY(${(1 - q) * 16}px)`; });

    // ---- LOGO OFICIAL + 2026 ----
    const lgOn = t >= C.logo_in && t < C.cards_out + 0.5;
    show($("logoBadge"), lgOn ? 1 - oCubic(P(t, C.cards_out, 0.3)) : 0);
    if (lgOn) {
      const q = oExpo(P(t, C.logo_in, 0.55));
      $("logoBadge").style.clipPath = `inset(0 ${(50 * (1 - q)).toFixed(2)}% 0 ${(50 * (1 - q)).toFixed(2)}% round 24px)`;
      $("logoBadge").style.transform = `translateY(${-30 * oCubic(P(t, C.cards_out, 0.3))}px) scale(${lerp(1.08, 1, q)})`;
      $("logoShine").style.backgroundPosition = `${lerp(100, 0, ioCubic(P(t, C.logo_in + 0.35, 0.9)))}% 0`;
    }
    const yOn = t >= C.year_in - 0.05 && t < C.cards_out + 0.5;
    show($("year"), yOn ? 1 - oCubic(P(t, C.cards_out + 0.04, 0.3)) : 0);
    if (yOn) {
      $("yearN").style.display = "inline-block";
      $("yearN").style.transform = `translateY(${(1 - oExpo(P(t, C.year_in, 0.45))) * 135}%)`;
      $("yearN").style.backgroundPosition = `${lerp(100, 0, ioCubic(P(t, C.year_in + 0.25, 0.8)))}% 0`;
      $("yearLine").style.transform = `scaleX(${oCubic(P(t, C.year_in + 0.1, 0.45))})`;
      $("year").style.transform = `translateY(${-30 * oCubic(P(t, C.cards_out + 0.04, 0.3))}px)`;
    }

    // ---- TEMA: INTELIGÊNCIA ARTIFICIAL NA ROTINA CONTÁBIL ----
    const tmOn = t >= C.tema_in - 0.05 && t < C.tema_out + 0.5;
    show($("tema"), tmOn ? 1 - oCubic(P(t, C.tema_out, 0.35)) : 0);
    if (tmOn) {
      if (!rotGeom) {   // conector do início de "INTELIGÊNCIA" até "NA ROTINA CONTÁBIL"
        const base = $("tema").getBoundingClientRect(), a = $("ia1").getBoundingClientRect(), b = $("rot").getBoundingClientRect();
        const x1 = a.left - base.left + 30, y1 = a.bottom - base.top - 4, x2 = b.left - base.left - 18, y2 = b.top - base.top + 36;
        $("rotPath").setAttribute("d", `M${x1} ${y1} V${y2} H${x2}`);
        const L = $("rotPath").getTotalLength(); $("rotPath").setAttribute("stroke-dasharray", L); rotGeom = { L };
      }
      const cq = oBack(clamp(P(t, C.tema_in, 0.3))); $("temaChip").style.display = "inline-block";
      $("temaChip").style.transform = `scale(${t >= C.tema_in ? cq : 0})`;
      const n = Math.round(KICK.length * clamp(P(t, C.tema_kick, C.tema_kick_end - C.tema_kick)));
      const blink = t > C.tema_kick_end && Math.floor((t - C.tema_kick_end) * 2.5) % 2 === 1;
      $("temaType").innerHTML = KICK.slice(0, n) + (t >= C.tema_kick - 0.2 && !blink ? '<span class="caret"></span>' : "");
      $("ia1").style.display = "inline-block";
      $("ia1").style.transform = `translateY(${(1 - oExpo(P(t, C.ia_in, 0.45))) * 135}%)`;
      $("ia2").style.opacity = oCubic(P(t, C.ia_art - 0.04, 0.25));
      $("ia2").style.transform = `translateX(${(1 - oExpo(P(t, C.ia_art - 0.04, 0.4))) * 40}px)`;
      const lq = ioCubic(P(t, C.rot_link - 0.1, 0.5));
      $("rotPath").setAttribute("stroke-dashoffset", rotGeom.L * (1 - lq));
      const pt = $("rotPath").getPointAtLength(rotGeom.L * lq); $("rotDot").setAttribute("cx", pt.x); $("rotDot").setAttribute("cy", pt.y);
      $("rotDot").style.opacity = lq > 0 ? 1 : 0;
      $("rot").style.display = "inline-block";
      $("rot").style.transform = `translateY(${(1 - oExpo(P(t, C.rot_in, 0.45))) * 135}%)`;
      $("tema").style.transform = `translateY(${-20 * oCubic(P(t, C.tema_out, 0.35))}px)`;
    }

    // ---- A TECNOLOGIA ESTÁ TRANSFORMANDO O MERCADO ----
    const mkOn = t >= C.mkt_in - 0.05 && t < C.mkt_out + 0.4;
    show($("mkt"), mkOn ? 1 - oCubic(P(t, C.mkt_out, 0.28)) : 0);
    if (mkOn) {
      $("mkt1").style.transform = `translateY(${(1 - oExpo(P(t, C.mkt_in, 0.45))) * 135}%)`;
      $("mkt2").style.transform = `translateY(${(1 - oExpo(P(t, C.mkt_trans, 0.45))) * 135}%)`;
      $("mkt3").style.opacity = oCubic(P(t, C.mkt_merc - 0.04, 0.25));
      $("mkt3").style.transform = `translateX(${(1 - oExpo(P(t, C.mkt_merc - 0.04, 0.4))) * 30}px)`;
      $("mktLine").style.transform = `scaleX(${oCubic(P(t, C.mkt_merc, 0.5))})`;
      $("mkt").style.transform = `translateY(${-20 * oCubic(P(t, C.mkt_out, 0.28))}px)`;
    }

    // ---- PRECISAMOS ACOMPANHAR ESSA EVOLUÇÃO ----
    const evOn = t >= C.evo_in - 0.05 && t < C.evo_out + 0.4;
    show($("evo"), evOn ? 1 - oCubic(P(t, C.evo_out, 0.3)) : 0);
    if (evOn) {
      const n = Math.round(EVOK.length * clamp(P(t, C.evo_in, C.evo_kick_end - C.evo_in)));
      const blink = t > C.evo_kick_end && Math.floor((t - C.evo_kick_end) * 2.5) % 2 === 1;
      $("evoType").innerHTML = EVOK.slice(0, n) + (!blink ? '<span class="caret"></span>' : "");
      $("evo1").style.transform = `translateY(${(1 - oExpo(P(t, C.evo_essa, 0.4))) * 135}%)`;
      $("evo2").style.transform = `translateY(${(1 - oExpo(P(t, C.evo_word, 0.45))) * 135}%)`;
      const bq = ioCubic(P(t, C.evo_word, C.evo_out - C.evo_word - 0.1));
      $("evoBar").style.transform = `scaleX(${bq})`;
      $("evoHead").style.left = (600 * bq).toFixed(1) + "px"; $("evoHead").style.opacity = t >= C.evo_word ? 1 : 0;
      $("evo").style.transform = `translateY(${-20 * oCubic(P(t, C.evo_out, 0.3))}px)`;
    }

    // ---- PREPARADOS × NOVAS EXIGÊNCIAS ----
    const prOn = t >= C.prep_in - 0.05 && t < C.prep_out + 0.5;
    show($("prep"), prOn ? 1 - oCubic(P(t, C.prep_out, 0.3)) : 0);
    if (prOn) {
      if (!prepGeom) {
        $("prep1").style.display = "inline-block"; $("prep2").style.display = "inline-block";
        const base = $("prep").getBoundingClientRect(), a = $("prep1").getBoundingClientRect(), b = $("prep2").getBoundingClientRect();
        const x1 = a.left - base.left + 40, y1 = a.bottom - base.top - 6, x2 = b.left - base.left - 18, y2 = b.top - base.top + 44;
        $("prepPath").setAttribute("d", `M${x1} ${y1} V${y2} H${x2}`);
        // rótulo na mesma linha de "PREPARADOS", à direita (não colide com "NOVAS EXIGÊNCIAS")
        $("prepLbl").style.left = a.right - base.left + 24 + "px"; $("prepLbl").style.top = (a.top + a.bottom) / 2 - base.top - 17 + "px";
        const L = $("prepPath").getTotalLength(); $("prepPath").setAttribute("stroke-dasharray", L); prepGeom = { L };
      }
      $("prep1").style.transform = `translateY(${(1 - oExpo(P(t, C.prep_in, 0.45))) * 135}%)`;
      const lq = ioCubic(P(t, C.prep_link - 0.1, 0.7));
      $("prepPath").setAttribute("stroke-dashoffset", prepGeom.L * (1 - lq));
      const pt = $("prepPath").getPointAtLength(prepGeom.L * lq); $("prepDot").setAttribute("cx", pt.x); $("prepDot").setAttribute("cy", pt.y);
      $("prepDot").style.opacity = lq > 0 ? 1 : 0;
      const pl = oCubic(P(t, C.prep_link, 0.4)); $("prepLbl").style.opacity = pl; $("prepLbl").style.transform = `translateX(${(1 - pl) * -16}px)`;
      $("prep2").style.transform = `translateY(${(1 - oExpo(P(t, C.novas_in, 0.45))) * 135}%)`;
      $("prep").style.transform = `translateY(${-20 * oCubic(P(t, C.prep_out, 0.3))}px)`;
    }

    // ---- VOCÊ NÃO PODE FICAR DE FORA! ----
    const ctOn = t >= C.cta_in - 0.05 && t < C.cta_out + 0.4;
    show($("cta"), ctOn ? 1 - oCubic(P(t, C.cta_out, 0.25)) : 0);
    if (ctOn) {
      $("cta1").style.transform = `translateY(${(1 - oExpo(P(t, C.cta_in, 0.45))) * 135}%)`;
      $("cta2").style.transform = `translateY(${(1 - oExpo(P(t, C.cta_fora, 0.45))) * 135}%) scale(${lerp(1.06, 1, oCubic(P(t, C.cta_fora, 0.5)))})`;
      $("cta").style.transform = `translateY(${-24 * oCubic(P(t, C.cta_out, 0.25))}px)`;
    }

    // ---- FINAL ----
    const TC = WIPE + 0.5;    // entrada do conteúdo do encerramento (logo após a cortina cobrir o quadro)
    const fnOn = t >= C.final_in && t < TC + 0.4;
    show($("fin"), fnOn ? 1 - oCubic(P(t, TC - 0.1, 0.3)) : 0);   // cruza com a entrada da logo
    if (fnOn) {
      $("fin1").style.transform = `translateY(${(1 - oExpo(P(t, C.final_in, 0.45))) * 135}%)`;
      $("fin2").style.transform = `translateY(${(1 - oExpo(P(t, C.final_part, 0.45))) * 135}%)`;
    }

    // ---- LEGENDAS (seguem até o fim da fala, mesmo sobre o encerramento) ----
    let ci = -1;
    for (let i = 0; i < T.captions.length; i++) { const c = T.captions[i]; if (t >= c.t0 && t < c.t1) { ci = i; break; } }
    if (ci !== capCur) {
      capCur = ci; const box = $("capBox"), tx = $("capTxt");
      tx.innerHTML = ci >= 0 ? capHTML(T.captions[ci].text).replace(/\n/g, "<br>") : "";
      box.style.width = "";
      if (ci >= 0) {   // largura da caixa = linha mais longa (text-wrap:balance não encolhe a caixa)
        const w = Math.max(...[...tx.getClientRects()].map((r) => r.width));
        box.style.width = Math.ceil(w + 48 + 2) + "px";
      }
    }
    if (ci >= 0) {
      const c = T.captions[ci];
      const q = c.joined_prev ? 1 : oCubic(P(t, c.t0, 0.14)), x = c.joined_next ? 0 : P(t, c.t1 - 0.08, 0.08);
      // a caixa fica centrada no peito, abaixo do queixo (y fixo no quadro)
      const cam = T.cam_frames[Math.min(f, T.cam_frames.length - 1)];
      const yc = T.caption_anchor_src_y != null ? (T.caption_anchor_src_y - cam[2]) * cam[0] : T.caption_y;
      const hBox = $("cap").offsetHeight;
      $("cap").style.top = (yc - hBox / 2).toFixed(1) + "px";
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
  window.__ready = true;
})();

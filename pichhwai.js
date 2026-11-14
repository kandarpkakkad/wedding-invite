/*
 * Pichhwai border, shared by the invitation (invite.js) and the sending page (send.js).
 *
 * Drawn to each box's size, so on a function card it follows the arch and on a page it turns square corners:
 * a gold rule, a coloured strip with gold dots, a coloured field with a running motif, a rule and gold scallops
 * inside. Bigger flowers sit at the corners (and the top of an arch). The bands between sections carry the same
 * motif. Units of 40 per border width (24px, or the box's --pw-band). Each style has its colours and a way of
 * filling the field (run):
 *   vine      a waving stem with leaves and a flower every 40 (and a small flower between, with `small`)
 *   buds      a straight stem, a lotus bud facing out every 40 and a lotus leaf between
 *   garland   marigolds every 10 in two colours by turns, with a leaf between each
 *   feathers  peacock feathers laid along the border, tipped in and out by turns
 * Details → pichhwai_style picks the style (written into <html data-pichhwai>); ?pichhwai=<style> previews another.
 *
 * A box holds an empty <svg class="pw-frame"> (Pichhwai.SVG) that the border is drawn into. A box with the class
 * pw-img gets the border as a picture in --pw-img instead (one picture per size: for long lists of boxes).
 */
(() => {
  'use strict';

  const r1 = (n) => String(Math.round(n * 10) / 10);
  const GOLD = '#c8962f';
  const SVG = '<svg class="pw-frame" aria-hidden="true" focusable="false"></svg>';
  const STYLES = {
    lotus: { field: '#0f3e3c', strip: '#7c1733', rule: GOLD, ring: '#d9ac4a', run: 'vine', stem: '#d9ac4a', leaf: ['#3f8f52', '#2a6a3a'], flower: 'pwRose' },
    moonlit: { field: '#1a2456', strip: '#7c1733', rule: GOLD, ring: '#e6e9f2', run: 'vine', stem: '#e6e9f2', leaf: ['#a9c7b6', '#6f9584'], flower: 'pwRoseW', small: 'pwJasmine' },
    gold: { field: '#d4a243', strip: '#7c1733', rule: '#7c1733', ring: '#7c1733', run: 'buds', stem: '#2f6b3a', flower: 'pwRose' },
    marigold: { field: '#1d4a2c', strip: '#7c1733', rule: GOLD, ring: '#f2c96a', run: 'garland', leaf: ['#8cc66a', '#3d7a35'], flower: 'pwMari', colours: ['#f08519', '#f7c22c'] },
    peacock: { field: '#f3e2bd', strip: '#7c1733', rule: GOLD, ring: '#b8862b', run: 'feathers', flower: 'pwEye' },
  };
  const NAMES = {
    lotus: 'lotus', vine: 'lotus', moonlit: 'moonlit', moon: 'moonlit', night: 'moonlit', sharad: 'moonlit', white: 'moonlit',
    gold: 'gold', golden: 'gold', buds: 'gold', kamal: 'gold', marigold: 'marigold', genda: 'marigold',
    peacock: 'peacock', mor: 'peacock', feather: 'peacock', feathers: 'peacock',
  };
  let pw = STYLES.peacock;

  // the first known style name among these (a ?pichhwai= preview, the page's setting…), else peacock
  function choose(...names) {
    const name = names.map((n) => NAMES[String(n || '').trim().toLowerCase()]).find(Boolean) || 'peacock';
    pw = STYLES[name];
    return name;
  }

  /* ---------- the drawings the border is made of. Facing up = facing out of the border. Original artwork. ---------- */
  const DEFS = `
    <!-- lotus: a pink lotus seen from above, and a leaf -->
    <radialGradient id="pwPk" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#fde3ea"/><stop offset=".55" stop-color="#f19ab4"/><stop offset="1" stop-color="#d4547d"/></radialGradient>
    <path id="pwPt" d="M0 0C2.5-2.2 2.9-5.6 0-8.8C-2.9-5.6-2.5-2.2 0 0Z"/>
    <path id="pwPti" d="M0 0C1.8-1.6 2-4 0-6C-2-4-1.8-1.6 0 0Z"/>
    <path id="pwLeaf" d="M0 0C2.2-2.6 6.2-3.4 9.4-1.6C6.6 1 2.6 1.4 0 0Z"/>
    <g id="pwRose">
    <g fill="url(#pwPk)" stroke="#a5345d" stroke-width=".45"><use href="#pwPt"/><use href="#pwPt" transform="rotate(45)"/><use href="#pwPt" transform="rotate(90)"/><use href="#pwPt" transform="rotate(135)"/><use href="#pwPt" transform="rotate(180)"/><use href="#pwPt" transform="rotate(225)"/><use href="#pwPt" transform="rotate(270)"/><use href="#pwPt" transform="rotate(315)"/></g>
    <g fill="#fff1f4" stroke="#d06a8c" stroke-width=".35"><use href="#pwPti" transform="rotate(22.5)"/><use href="#pwPti" transform="rotate(67.5)"/><use href="#pwPti" transform="rotate(112.5)"/><use href="#pwPti" transform="rotate(157.5)"/><use href="#pwPti" transform="rotate(202.5)"/><use href="#pwPti" transform="rotate(247.5)"/><use href="#pwPti" transform="rotate(292.5)"/><use href="#pwPti" transform="rotate(337.5)"/></g>
    <circle r="2.3" fill="#f2c14e" stroke="#9b6a12" stroke-width=".5"/>
    <g fill="#9b6a12"><circle cy="-1" r=".35"/><circle cx=".95" cy=".45" r=".35"/><circle cx="-.95" cy=".45" r=".35"/></g>
    </g>
    <!-- moonlit: a white lotus and a jasmine flower -->
    <radialGradient id="pwW" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#eef1f8"/><stop offset="1" stop-color="#b6c0dd"/></radialGradient>
    <g id="pwRoseW">
    <g fill="url(#pwW)" stroke="#8d9ac0" stroke-width=".45"><use href="#pwPt"/><use href="#pwPt" transform="rotate(45)"/><use href="#pwPt" transform="rotate(90)"/><use href="#pwPt" transform="rotate(135)"/><use href="#pwPt" transform="rotate(180)"/><use href="#pwPt" transform="rotate(225)"/><use href="#pwPt" transform="rotate(270)"/><use href="#pwPt" transform="rotate(315)"/></g>
    <g fill="#ffffff" stroke="#aab5d3" stroke-width=".35"><use href="#pwPti" transform="rotate(22.5)"/><use href="#pwPti" transform="rotate(67.5)"/><use href="#pwPti" transform="rotate(112.5)"/><use href="#pwPti" transform="rotate(157.5)"/><use href="#pwPti" transform="rotate(202.5)"/><use href="#pwPti" transform="rotate(247.5)"/><use href="#pwPti" transform="rotate(292.5)"/><use href="#pwPti" transform="rotate(337.5)"/></g>
    <circle r="2.3" fill="#f2c14e" stroke="#9b6a12" stroke-width=".5"/>
    </g>
    <ellipse id="pwJp" cy="-2.3" rx="1.5" ry="1.9"/>
    <g id="pwJasmine">
    <g fill="#fbfaf5" stroke="#aab5d3" stroke-width=".3"><use href="#pwJp"/><use href="#pwJp" transform="rotate(72)"/><use href="#pwJp" transform="rotate(144)"/><use href="#pwJp" transform="rotate(216)"/><use href="#pwJp" transform="rotate(288)"/></g>
    <circle r=".9" fill="#f2c14e"/>
    </g>
    <!-- gold: a lotus bud with its sepals (base at 0,0) and a lotus leaf seen from above -->
    <linearGradient id="pwBudG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8416d"/><stop offset=".5" stop-color="#ee8eac"/><stop offset="1" stop-color="#fde4ec"/></linearGradient>
    <g id="pwBud">
    <path d="M0 0C-4.2-2.6-4.6-8.2 0-14C4.6-8.2 4.2-2.6 0 0Z" fill="url(#pwBudG)" stroke="#a5345d" stroke-width=".45"/>
    <path d="M0-.6C-1.7-3.4-1.5-9 0-13.4M0-.6C1.7-3.4 1.5-9 0-13.4" fill="none" stroke="#c8527a" stroke-width=".3"/>
    <g fill="#4f9a55" stroke="#2a6a3a" stroke-width=".3"><path d="M0 .6C-3.2-.4-5.4-3-5.8-6.2C-3.2-4.8-1.2-3 0 .6Z"/><path d="M0 .6C3.2-.4 5.4-3 5.8-6.2C3.2-4.8 1.2-3 0 .6Z"/></g>
    </g>
    <g id="pwPad">
    <path d="M0 0L1.3-6.4A6.5 6.5 0 1 1-1.3-6.4Z" fill="#3f8f52" stroke="#2a6a3a" stroke-width=".4"/>
    <path d="M0 0V6.4M0 0L5.6 3.2M0 0L-5.6 3.2M0 0L6.1-2.1M0 0L-6.1-2.1" fill="none" stroke="#9fd39a" stroke-width=".3"/>
    <circle r=".8" fill="#2a6a3a"/>
    </g>
    <!-- marigold: takes its colour from color="…" -->
    <circle id="pwMp" cy="-3.3" r="1.9"/>
    <circle id="pwMq" cy="-1.7" r="1.3"/>
    <g id="pwMari">
    <g fill="currentColor" stroke="#7a3205" stroke-width=".3" stroke-opacity=".55"><use href="#pwMp"/><use href="#pwMp" transform="rotate(30)"/><use href="#pwMp" transform="rotate(60)"/><use href="#pwMp" transform="rotate(90)"/><use href="#pwMp" transform="rotate(120)"/><use href="#pwMp" transform="rotate(150)"/><use href="#pwMp" transform="rotate(180)"/><use href="#pwMp" transform="rotate(210)"/><use href="#pwMp" transform="rotate(240)"/><use href="#pwMp" transform="rotate(270)"/><use href="#pwMp" transform="rotate(300)"/><use href="#pwMp" transform="rotate(330)"/></g>
    <circle r="3" fill="currentColor"/>
    <g fill="#ffffff" fill-opacity=".24"><use href="#pwMq" transform="rotate(15)"/><use href="#pwMq" transform="rotate(60)"/><use href="#pwMq" transform="rotate(105)"/><use href="#pwMq" transform="rotate(150)"/><use href="#pwMq" transform="rotate(195)"/><use href="#pwMq" transform="rotate(240)"/><use href="#pwMq" transform="rotate(285)"/><use href="#pwMq" transform="rotate(330)"/></g>
    <circle r="1" fill="#7a3205" fill-opacity=".5"/>
    </g>
    <!-- peacock: a feather lying along the border (eye forward), and a round eye for the corners -->
    <linearGradient id="pwFv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7f9a3c" stop-opacity="0"/><stop offset=".4" stop-color="#7f9f45"/><stop offset="1" stop-color="#2f7f63"/></linearGradient>
    <g id="pwFeather">
    <path d="M-17 0C-8-2.2 2-5.4 10-5.6C16.5-5.6 18.5-2.4 18.5 0C18.5 2.4 16.5 5.6 10 5.6C2 5.4-8 2.2-17 0Z" fill="url(#pwFv)"/>
    <path d="M-11 0L-7.5-2.4M-11 0L-7.5 2.4M-6 0L-2.2-3.4M-6 0L-2.2 3.4M-1 0L3-4.4M-1 0L3 4.4M3.5 0L6.5-4.8M3.5 0L6.5 4.8" fill="none" stroke="#c9b25a" stroke-width=".3"/>
    <path d="M-17 0H6" stroke="#d9c27a" stroke-width=".45"/>
    <ellipse cx="11" rx="6.2" ry="4.6" fill="#c8962f"/>
    <ellipse cx="11.4" rx="4.7" ry="3.5" fill="#1d8a7e"/>
    <ellipse cx="11.8" rx="3.1" ry="2.4" fill="#174a8c"/>
    <ellipse cx="12.1" rx="1.7" ry="1.4" fill="#0b1e45"/>
    </g>
    <g id="pwEye">
    <circle r="9.4" fill="#6f9a45"/><circle r="7.9" fill="#c8962f"/><circle r="6.1" fill="#1d8a7e"/><circle cy=".3" r="4.2" fill="#174a8c"/><ellipse cy=".6" rx="2.3" ry="2.1" fill="#0b1e45"/>
    </g>
  `;
  function addDefs() {
    if (document.getElementById('pwRose')) return;
    const holder = document.createElement('div');
    holder.innerHTML = `<svg class="defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>${DEFS}</defs></svg>`;
    document.body.prepend(holder.firstChild);
  }

  // marks along a loop of length len, with n places about `step` apart on each stretch between two marks
  const spread = (marks, len, step) => {
    const out = [];
    marks.forEach((a, i) => {
      const b = i + 1 < marks.length ? marks[i + 1] : len;
      const n = Math.max(1, Math.round((b - a) / step));
      for (let j = 0; j < n; j++) out.push(a + (b - a) * j / n);
    });
    return out;
  };

  // the running motif along a line ({ at(s) → [x, y, tx, ty] }): a flower at each stop (a big one with a ring at
  // the stops in bigs), the last stretch running from the last stop to `end`
  function run(line, stops, bigs, end) {
    const st = pw;
    const place = (s, o) => {   // o > 0 is outwards
      const [x, y, tx, ty] = line.at(s);
      return [x + ty * o, y - tx * o, Math.atan2(ty, tx) * 180 / Math.PI];
    };
    const use = (id, s, o = 0, turn = 0, scale = 1, attrs = '') => {
      const [x, y, a] = place(s, o);
      return `<use href="#${id}"${attrs} transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(a + turn)})${scale === 1 ? '' : ` scale(${scale})`}"/>`;
    };
    const next = (i) => (i + 1 < stops.length ? stops[i + 1] : end);
    // a stem along the middle, waving `wave` units out and in between the stops
    const stem = (wave, colour, width) => `<path d="${stops.map((a, i) => {
      const b = next(i);
      const m = Math.max(6, Math.round((b - a) / 2));
      let d = '';
      for (let j = 0; j <= m; j++) {
        const [x, y] = place(a + (b - a) * j / m, wave * Math.sin(2 * Math.PI * j / m));
        d += `${j ? 'L' : 'M'}${r1(x)} ${r1(y)}`;
      }
      return d;
    }).join('')}" fill="none" stroke="${colour}" stroke-width="${width}"/>`;
    const tint = (i) => (st.colours ? ` color="${st.colours[i % st.colours.length]}"` : '');
    const isBig = (s) => bigs.includes(s);
    let back = '';
    let front = '';
    if (st.run === 'vine') {
      let leaves = '';
      stops.forEach((a, i) => {
        const b = next(i);
        leaves += use('pwLeaf', a + (b - a) * 0.25, 4.4, -150) + use('pwLeaf', a + (b - a) * 0.75, -4.4, 30);
        if (st.small) front += use(st.small, (a + b) / 2, 0, 0, 1.1);
      });
      back += stem(4.5, st.stem, 0.9) + `<g fill="${st.leaf[0]}" stroke="${st.leaf[1]}" stroke-width=".35">${leaves}</g>`;
      front += stops.filter((s) => !isBig(s)).map((s) => use(st.flower, s, 0, 0, 1.02)).join('');
    } else if (st.run === 'buds') {
      back += stem(0, st.stem, 0.8);
      stops.forEach((a, i) => {
        back += use('pwPad', (a + next(i)) / 2);
        if (!isBig(a)) front += use('pwBud', a, -5.6, 0, 0.9);
      });
    } else if (st.run === 'garland') {
      let leaves = '';
      let count = 0;
      stops.forEach((a, i) => {
        const b = next(i);
        const n = Math.max(1, Math.round((b - a) / 10));
        for (let j = 0; j < n; j++) {
          leaves += use('pwLeaf', a + (b - a) * (j + 0.5) / n, 0, j % 2 ? 90 : -90, 0.85);
          if (j || !isBig(a)) front += use('pwMari', a + (b - a) * j / n, 0, 0, 1, tint(count++));
        }
      });
      back += `<g fill="${st.leaf[0]}" stroke="${st.leaf[1]}" stroke-width=".35">${leaves}</g>`;
    } else if (st.run === 'feathers') {
      let count = 0;
      stops.forEach((a, i) => {
        const b = next(i);
        const n = Math.max(1, Math.round((b - a) / 20));
        for (let j = 0; j < n; j++) back += use('pwFeather', a + (b - a) * (j + 0.5) / n, 0, count++ % 2 ? 9 : -9, 0.72);
      });
    }
    const big = stops.filter(isBig).map((s) => {
      const [x, y] = place(s, 0);
      return `<circle cx="${r1(x)}" cy="${r1(y)}" r="10.4" fill="${st.field}" stroke="${st.ring}" stroke-width=".7"/>`
        + use(st.flower, s, 0, 0, st.run === 'garland' ? 1.75 : 1.12, tint(0));
    }).join('');
    return back + front + big;
  }

  // the border round a box W × H units whose top corners are rounded by R units (0: square, more: an arch)
  function frame(W, H, R) {
    // the outline at inset d, walked from the bottom-left corner: up, over the top, down, back along the bottom
    const loop = (d) => {
      const C = Math.max(R, d);   // centre of the top corners' curve
      const r = C - d;            // 0 on a square corner
      const arc = (cx, from) => (u) => {
        const a = from + (r ? u / r : 0);
        return [cx + r * Math.cos(a), C + r * Math.sin(a), -Math.sin(a), Math.cos(a)];
      };
      const segs = [
        [H - d - C, (u) => [d, H - d - u, 0, -1]],
        [r * Math.PI / 2, arc(C, Math.PI)],
        [W - 2 * C, (u) => [C + u, d, 1, 0]],
        [r * Math.PI / 2, arc(W - C, 1.5 * Math.PI)],
        [H - d - C, (u) => [W - d, C + u, 0, 1]],
        [W - 2 * d, (u) => [W - d - u, H - d, -1, 0]],
      ];
      const ends = [];
      segs.reduce((sum, sg) => { ends.push(sum + sg[0]); return sum + sg[0]; }, 0);
      const len = ends[5];
      const at = (s) => {
        let rest = ((s % len) + len) % len;
        for (const [l, f] of segs) { if (rest <= l) return f(rest); rest -= l; }
        return segs[5][1](segs[5][0]);
      };
      const path = r
        ? `M${r1(d)} ${r1(H - d)}V${r1(C)}A${r1(r)} ${r1(r)} 0 0 1 ${r1(C)} ${r1(d)}H${r1(W - C)}`
          + `A${r1(r)} ${r1(r)} 0 0 1 ${r1(W - d)} ${r1(C)}V${r1(H - d)}Z`
        : `M${r1(d)} ${r1(H - d)}V${r1(d)}H${r1(W - d)}V${r1(H - d)}Z`;
      // the sharp corners: the bottom two, and the top two as well on a square frame
      const corners = r ? [0, ends[4]] : [0, ends[0], ends[2], ends[4]];
      return { len, at, path, segs, ends, corners };
    };
    const rule = (d, width, colour) => `<path d="${loop(d).path}" fill="none" stroke="${colour}" stroke-width="${width}"/>`;
    let out = rule(1, 2, GOLD) + rule(4, 4, pw.strip) + rule(6.65, 1.3, pw.rule) + rule(19.25, 23.9, pw.field) + rule(31.85, 1.3, pw.rule);

    // gold dots along the strip, between the corners, and a bigger one in each corner
    const strip = loop(4);
    const dotAt = (s, size) => { const [x, y] = strip.at(s); return `<circle cx="${r1(x)}" cy="${r1(y)}" r="${size}"/>`; };
    const dotMarks = spread(strip.corners, strip.len, 10);
    out += `<g fill="#f2c96a">${dotMarks.map((s, i) => dotAt((s + (i + 1 < dotMarks.length ? dotMarks[i + 1] : strip.len)) / 2, '.85')).join('')}`
      + `${strip.corners.map((s) => dotAt(s, '1.1')).join('')}</g>`;

    // gold scallops, each with a dot, on the inner side of the border
    const inner = loop(32.5);
    const scMarks = spread(inner.corners, inner.len, 10);
    let sc = '';
    let pearls = '';
    scMarks.forEach((a, i) => {
      const b = i + 1 < scMarks.length ? scMarks[i + 1] : inner.len;
      const [x0, y0] = inner.at(a);
      const [x1, y1] = inner.at(b);
      const [mx, my, tx, ty] = inner.at((a + b) / 2);
      sc += `M${r1(x0)} ${r1(y0)}Q${r1(mx - ty * 8.4)} ${r1(my + tx * 8.4)} ${r1(x1)} ${r1(y1)}`;
      pearls += `<circle cx="${r1(mx - ty * 5.5)}" cy="${r1(my + tx * 5.5)}" r="1"/>`;
    });
    out += `<path d="${sc}" fill="none" stroke="#b8862b" stroke-width=".8"/><g fill="#b8862b">${pearls}</g>`;

    // the motif runs along the middle of the field, a flower about every 40 units;
    // the big flowers sit on the corners, and on the top of an arch
    const mid = loop(19.25);
    const bigs = R ? [0, mid.ends[1] + mid.segs[2][0] / 2, mid.ends[4]] : mid.corners;
    return out + run(mid, spread(bigs, mid.len, 40), bigs, mid.len);
  }

  // a band between two sections, W × H units: the border's field and motif, running straight across
  function band(W, H) {
    const n = Math.max(1, Math.round(W / 40));
    const g = W / n;
    const stops = Array.from({ length: n + 1 }, (_, j) => (j - 0.5) * g);
    return `<rect width="${r1(W)}" height="${r1(H)}" fill="${pw.field}"/>`
      + run({ at: (s) => [s, H / 2, 1, 0] }, stops, [], W + g / 2);
  }

  // what to draw in a box at its current size: { key, viewBox, art }, or null when it has no size yet
  function artFor(box) {
    const isBand = box.classList.contains('pw-band');
    const w = isBand ? box.clientWidth : box.offsetWidth;
    const h = isBand ? box.clientHeight : box.offsetHeight;
    if (!w || !h) return null;
    const css = getComputedStyle(box);
    const k = (parseFloat(css.getPropertyValue('--pw-band')) || 24) / 40;
    const W = w / k;
    const H = h / k;
    let R = 0;
    if (!isBand) {
      R = Math.min((parseFloat(css.borderTopLeftRadius) || 0) / k, W / 2, H / 2);
      if (R < 40) R = 0;   // a square-cornered page, not an arch
    }
    const key = `${w}x${h}x${k.toFixed(3)}x${r1(R)}`;
    return { key, w, h, viewBox: `0 0 ${r1(W)} ${r1(H)}`, art: () => (isBand ? band(W, H) : frame(W, H, R)) };
  }

  // a box with the class pw-img: the border as a picture, one per size
  const pictures = new Map();
  function paintPicture(box) {
    const a = artFor(box);
    if (!a || box.dataset.pwSize === a.key) return;
    box.dataset.pwSize = a.key;
    if (!pictures.has(a.key)) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${a.w}" height="${a.h}" viewBox="${a.viewBox}">`
        + `<defs>${DEFS}</defs>${a.art()}</svg>`;
      pictures.set(a.key, URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
    }
    box.style.setProperty('--pw-img', `url("${pictures.get(a.key)}")`);
  }

  function paint(box) {
    if (box.classList.contains('pw-img')) { paintPicture(box); return; }
    const svg = box.querySelector(':scope > .pw-frame');
    const a = svg && artFor(box);
    if (!a || svg.dataset.size === a.key) return;
    svg.dataset.size = a.key;
    svg.setAttribute('viewBox', a.viewBox);
    svg.innerHTML = a.art();
  }

  // draw the border in each of these boxes now, and again whenever one changes size
  function draw(boxes) {
    boxes = Array.from(boxes);
    if (!boxes.length) return;
    addDefs();
    const all = () => boxes.forEach(paint);
    all();
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver((entries) => entries.forEach((e) => paint(e.target)));
      boxes.forEach((box) => ro.observe(box));
    } else {
      window.addEventListener('resize', all);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(all);
  }

  window.Pichhwai = { SVG, choose, draw };
})();

/*
 * Wedding invitation page.
 * Reads the guest's code from the link (#code), decrypts that guest's
 * invitation from guests.json and renders it. Nothing readable is public.
 */
(() => {
  'use strict';

  const THEMES = ['marigold', 'red'];
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const $ = (sel) => document.querySelector(sel);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const themeColor = document.querySelector('meta[name="theme-color"]');

  function applyTheme(name) {
    root.dataset.theme = name;
    if (themeColor) themeColor.content = getComputedStyle(root).getPropertyValue('--silk-2').trim() || themeColor.content;
  }
  const themeParam = (params.get('theme') || '').toLowerCase();
  applyTheme(THEMES.includes(themeParam) ? themeParam : (THEMES.includes(root.dataset.theme) ? root.dataset.theme : THEMES[0]));
  if (params.get('open') === '1') root.classList.add('static');
  const SCRIPTS = ['corinthia', 'pinyon', 'imperial', 'luxurious'];
  const scriptParam = (params.get('script') || '').toLowerCase();
  if (SCRIPTS.includes(scriptParam)) root.dataset.script = scriptParam;
  const coverParam = (params.get('cover') || '').toLowerCase();
  if (['gold', 'green', 'ivory'].includes(coverParam)) root.dataset.cover = coverParam;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
  const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const toHex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  const isDevanagari = (s) => /[ऀ-ॿ]/.test(s || '');
  const r1 = (n) => String(Math.round(n * 10) / 10);
  const TAU = Math.PI * 2;

  /* ---------------- ornaments: fine gold linework (ctx S = on silk, P = on paper) ---------------- */

  function mandala(ctx, hollow) {
    const P = (r, a) => [200 + r * Math.sin(a), 200 - r * Math.cos(a)];
    const xy = (p) => `${r1(p[0])} ${r1(p[1])}`;
    const petal = (ra, rb, w, a) => {
      const m1 = ra + (rb - ra) * 0.38;
      const m2 = ra + (rb - ra) * 0.86;
      return `M${xy(P(ra, a))}C${xy(P(m1, a - w))} ${xy(P(m2, a - w * 0.42))} ${xy(P(rb, a))}`
        + `C${xy(P(m2, a + w * 0.42))} ${xy(P(m1, a + w))} ${xy(P(ra, a))}Z`;
    };
    const each = (n, fn, off = 0) => { let d = ''; for (let i = 0; i < n; i += 1) d += fn(off + (i * TAU) / n); return d; };
    const dot = (r, s) => (a) => { const [x, y] = P(r, a); return `M${r1(x - s)} ${r1(y)}a${s} ${s} 0 1 0 ${2 * s} 0a${s} ${s} 0 1 0 ${-2 * s} 0`; };
    const circle = (r) => `M${200 - r} 200a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
    const scallops = (n, r) => {
      const rr = r1(r * Math.sin(Math.PI / n) * 1.08);
      let d = '';
      for (let i = 0; i < n; i += 1) d += `M${xy(P(r, (i * TAU) / n))}A${rr} ${rr} 0 0 1 ${xy(P(r, ((i + 1) * TAU) / n))}`;
      return d;
    };
    let line = '';
    let thin = '';
    let fill = '';
    let dots = '';
    if (!hollow) {
      fill += each(8, (a) => petal(3, 17, 0.32, a));
      line += circle(20) + each(16, (a) => petal(23, 46, 0.16, a));
    }
    dots += each(24, dot(50, 1.3), TAU / 48);
    line += circle(54);
    thin += circle(57.5);
    line += each(24, (a) => petal(60, 97, 0.12, a));
    thin += each(24, (a) => petal(67, 89, 0.06, a));
    dots += each(24, dot(101, 1.5), TAU / 48);
    thin += scallops(48, 106);
    line += each(32, (a) => petal(112, 158, 0.05, a), TAU / 64);
    dots += each(32, dot(162, 1.7), TAU / 64);
    thin += circle(167);
    fill += each(48, (a) => petal(171, 187, 0.04, a));
    dots += each(72, dot(192, 0.9));
    thin += circle(196.5);
    const g = `url(#g${ctx}m)`;
    return `<svg class="mandala" viewBox="0 0 400 400" aria-hidden="true">`
      + `<path class="mm-line" stroke="${g}" d="${line}"/><path class="mm-thin" stroke="${g}" d="${thin}"/>`
      + `<path class="mm-fill" fill="${g}" d="${fill}"/><path fill="${g}" d="${dots}"/></svg>`;
  }

  const divider = (ctx) => `<svg class="divider" viewBox="0 0 240 24" aria-hidden="true">`
    + `<path stroke="url(#gl${ctx})" stroke-width="1" d="M2 12H99M141 12H238"/>`
    + '<path class="dv-orn" d="M120 21C114 16 113 9 120 2C127 9 126 16 120 21ZM120 21C112 21 105 16 104 9C111 9 116 14 120 21ZM120 21C128 21 135 16 136 9C129 9 124 14 120 21Z"/>'
    + '<path class="dv-dot" d="M100 12l3-3 3 3-3 3zM134 12l3-3 3 3-3 3z"/></svg>';

  const corner = (pos) => `<svg class="corner ${pos}" viewBox="0 0 60 60" aria-hidden="true">`
    + '<path class="acc-green-f" d="M20 20C25 20 29.5 23 30.5 28.5C25 28.5 21 25 20 20Z"/>'
    + '<path class="acc-red-f" d="M14 5.5L22.5 14 14 22.5 5.5 14Z" stroke="currentColor" stroke-width=".9"/>'
    + '<circle cx="14" cy="14" r="2" fill="#f0b13a"/>'
    + '<path class="cn-curl" d="M24 6C35 6 41 13 37 19C34 23 28 22 29 17M6 24C6 35 13 41 19 37C23 34 22 28 17 29M37 19C44 12 51 10 58 11M19 37C12 44 10 51 11 58"/>'
    + '<circle class="cn-fill" cx="43" cy="5.5" r="1.3"/><circle class="cn-fill" cx="5.5" cy="43" r="1.3"/><circle class="cn-fill" cx="27" cy="27" r="1.6"/></svg>';

  /* Shri Ganesh, two original drawings:
     - foil (emblem "ganesha"): gold foil with fine engraved lines: a three-tier crown, scalloped ears with a flower,
       a curling trunk and one tusk, a red tilak and crown jewel
     - line (emblem "ganesha-line"): the simple gold line drawing */
  const flipX = (s) => `<g transform="translate(120 0) scale(-1 1)">${s}</g>`;
  const GN_EAR = 'M44 47 43.8 46.6 43.6 46.1 43.3 45.6 43 45 42.7 44.3 42.3 43.6 41.9 42.9 41.3 42.2 40.7 41.6 40 41 39.2 40.5 38.4 40.1 37.4 39.8 36.5 39.7 35.6 39.7 34.7 39.8 33.8 40 32.9 40.2 31.9 40.6 31 40.6 30.1 40.1 29.2 39.7 28.2 39.4 27.2 39.2 26.2 39.1 25.2 39.1 24.3 39.2 23.4 39.4 22.5 39.7 21.7 40.2 20.9 40.7 20.2 41.3 19.6 42 19 42.8 18.4 43.6 18 44.4 17.2 44.9 16.3 45.1 15.4 45.5 14.6 45.9 13.8 46.3 13 46.9 12.4 47.5 11.8 48.2 11.2 49 10.8 49.8 10.5 50.7 10.3 51.7 10.2 52.6 10.2 53.6 10.3 54.6 10.4 55.5 10.6 56.5 10.5 57.3 10 58.1 9.6 58.9 9.2 59.8 8.9 60.6 8.6 61.5 8.5 62.5 8.4 63.4 8.5 64.3 8.6 65.2 8.9 66.1 9.3 67 9.7 67.8 10.3 68.6 10.9 69.3 11.5 70 12.2 70.6 12.8 71.3 12.8 72.2 13 73.1 13.1 74.1 13.4 75 13.7 75.9 14.1 76.8 14.7 77.5 15.3 78.3 15.9 78.9 16.7 79.5 17.5 80 18.3 80.4 19.2 80.7 20.1 80.9 21 81 22 81.1 22.9 81.2 23.5 82 24.2 82.7 24.9 83.4 25.7 84 26.5 84.5 27.3 84.9 28.2 85.3 29.1 85.5 30 85.6 30.9 85.6 31.7 85.5 32.6 85.3 33.4 85 34.2 84.7 34.9 84.2 35.6 83.7 36.3 83.2 37 82.7 37.8 82.8 38.6 82.9 39.5 82.9 40.3 82.9 41.1 82.8 41.9 82.6 42.7 82.3 43.5 82 44.2 81.5 44.9 80.9 45.6 80.3 46.1 79.6 46.6 78.9 47 78.1 47.4 77.4 47.7 76.7 47.9 76 48.1 75.4 48.3 74.9 48.5 74.5 52 62 47 50Z';
  const GN_EAR_LINES = '<path d="M40 48.4 39.5 47.9 39 47.5 38.5 47.1 37.9 46.6 37.4 46.2 36.9 45.9 36.3 45.5 35.9 45.3 35.4 45.1 35 45 34.5 44.8 33.8 44.7 33.1 44.6 32.4 44.5 31.6 44.4 30.9 44.4 30.1 44.3 29.3 44.4 28.5 44.4 27.7 44.4 27 44.5 26.3 44.6 25.6 44.8 25 44.9 24.4 45.1 23.8 45.4 23.2 45.6 22.6 46 22 46.3 21.4 46.6 20.8 47 20.2 47.4 19.7 47.9 19.1 48.3 18.6 48.8 18.2 49.3 17.7 49.7 17.4 50.2 17 50.7 16.7 51.2 16.3 51.8 16 52.4 15.7 53 15.4 53.7 15.2 54.4 14.9 55.1 14.7 55.8 14.5 56.5 14.4 57.2 14.3 57.9 14.2 58.6 14.1 59.3 14 60 14 60.7 14 61.4 14.1 62.1 14.1 62.8 14.2 63.5 14.3 64.3 14.5 65 14.6 65.7 14.8 66.4 15 67.1 15.3 67.7 15.5 68.4 15.8 69 16.1 69.6 16.4 70.2 16.7 70.8 17.1 71.4 17.5 72 18 72.6 18.5 73.2 18.9 73.7 19.4 74.3 20 74.8 20.5 75.3 21 75.7 21.5 76.2 22.1 76.6 22.6 76.9 23.2 77.3 23.8 77.6 24.5 78 25.2 78.3 25.9 78.6 26.6 78.8 27.3 79.1 28 79.3 28.7 79.5 29.4 79.6 30 79.8 30.7 79.9 31.2 79.9 31.8 79.9 32.3 79.9 32.9 79.9 33.5 79.8 34.1 79.7 34.7 79.6 35.3 79.4 35.9 79.3 36.5 79.1 37.1 78.8 37.6 78.6 38.2 78.3 38.8 78.1 39.3 77.8 39.8 77.6 40.2 77.3 40.7 76.9 41.2 76.5 41.8 76 42.3 75.5 42.9 75 43.4 74.5 43.9 74 44.4 73.5 44.9 73" stroke-width="1"/>'
    + '<path d="M34.8 49.1 34.5 48.9 34.2 48.7 34.1 48.6 33.9 48.6 33.6 48.5 33.1 48.4 32.6 48.3 32 48.3 31.3 48.2 30.7 48.2 30 48.1 29.4 48.2 28.7 48.2 28.1 48.2 27.5 48.3 27 48.4 26.5 48.5 26.1 48.6 25.7 48.7 25.3 48.9 24.8 49.1 24.3 49.3 23.9 49.6 23.4 49.9 22.9 50.2 22.5 50.5 22 50.8 21.6 51.2 21.3 51.5 20.9 51.9 20.6 52.2 20.4 52.5 20.1 52.8 19.9 53.2 19.7 53.6 19.4 54.1 19.2 54.6 19 55.1 18.8 55.7 18.6 56.2 18.4 56.8 18.2 57.4 18.1 58 18 58.6 17.9 59.1 17.9 59.6 17.8 60.2 17.8 60.7 17.8 61.3 17.9 61.8 17.9 62.4 18 63 18.1 63.6 18.2 64.2 18.3 64.8 18.5 65.4 18.6 65.9 18.8 66.4 19 66.9 19.2 67.4 19.4 67.8 19.7 68.3 20 68.8 20.3 69.3 20.6 69.8 21 70.3 21.4 70.7 21.8 71.2 22.2 71.6 22.6 72.1 23 72.5 23.4 72.8 23.9 73.1 24.3 73.4 24.7 73.7 25.1 74 25.6 74.3 26.1 74.5 26.7 74.8 27.3 75 27.9 75.3 28.5 75.5 29 75.6 29.6 75.8 30.1 75.9 30.7 76 31.1 76.1 31.5 76.1 31.8 76.1 32.2 76.1 32.6 76.1 32.9 76.1 33.4 76 33.8 75.9 34.3 75.8 34.7 75.6 35.2 75.5 35.7 75.3 36.2 75.1 36.7 74.9 37.1 74.7 37.5 74.5 37.8 74.3 38 74.2 38.4 73.9 38.8 73.5" stroke-width=".8" stroke-dasharray=".1 2.3"/>';
  const GN_TRUNK = 'M52.9 58 53 59.9 53.1 61.8 53.2 63.7 53.3 65.6 53.4 67.4 53.5 69.3 53.5 71.1 53.6 72.8 53.7 74.6 53.8 76.3 53.9 78 54 79.6 54.1 81.3 54.3 82.9 54.5 84.5 54.7 86 54.9 87.6 55.2 89.1 55.5 90.6 55.9 92 56.3 93.4 56.8 94.8 57.3 96.2 58 97.6 58.8 98.9 59.7 100.1 60.6 101.2 61.6 102.2 62.7 103 63.8 103.8 64.9 104.5 66.1 105.1 67.3 105.5 68.5 105.9 69.7 106.2 70.9 106.4 72.2 106.4 73.4 106.4 74.6 106.3 75.8 106.1 77 105.7 78.2 105.3 79.3 104.8 80.3 104.1 81.3 103.3 82.2 102.5 83 101.5 83.7 100.4 84.2 99.5 84.6 98.6 85 97.6 85.2 96.7 85.3 95.8 85.4 94.9 85.4 94 85.3 93.1 85.1 92.3 84.8 91.5 84.5 90.7 84.2 89.9 83.7 89.2 83.2 88.6 82.7 88 82.1 87.5 81.4 87 80.7 86.6 79.9 86.3 79.1 86.1 78.3 85.9 77.4 85.9 76.6 85.9 75.8 86.1 75.1 86.3 74.4 86.6 73.9 86.9 73.3 87.3 72.8 87.7 72.4 88.2 72.1 88.7 71.8 89.2 71.5 89.7 71.3 90.3 71.2 90.8 71.1 91.4 71.1 92 71.1 92.5 71.2 93.1 71.3 93.7 71.6 94.2 71.9 94.7 72.2 95.2 72.7 95.7 73.2 96 73.7 96.4 74.3 96.6 74.8 96.7 75.5 96.8 76.2 96.7 76.8 96.3 77.2 95.8 77.5 95.2 77.6 94.5 77.5 93.8 77.1 93.2 76.6 92.8 76 92.5 75.7 92.4 75.7 92.4 75.7 92.4 75.7 92.3 75.7 92.3 75.7 92.3 75.7 92.3 75.7 92.3 75.7 92.2 75.7 92.1 75.7 92.1 75.7 92 75.8 91.9 75.8 91.8 75.9 91.7 75.9 91.6 76 91.5 76.1 91.4 76.2 91.3 76.3 91.3 76.4 91.2 76.5 91.2 76.7 91.1 76.8 91.1 77.1 91.1 77.4 91.1 77.6 91.1 77.8 91.2 78 91.3 78.1 91.4 78.3 91.5 78.5 91.7 78.7 91.9 78.8 92.1 78.9 92.3 79.1 92.6 79.2 92.9 79.2 93.2 79.3 93.5 79.3 93.8 79.3 94.2 79.3 94.5 79.2 94.9 79.1 95.3 79 95.6 78.8 96 78.5 96.4 78.3 96.8 77.9 97.2 77.4 97.6 77 97.9 76.5 98.2 76.1 98.4 75.5 98.6 75 98.7 74.5 98.8 73.9 98.8 73.3 98.8 72.7 98.8 72.1 98.6 71.5 98.5 70.9 98.2 70.3 98 69.8 97.7 69.2 97.3 68.7 96.9 68.2 96.4 67.8 95.9 67.4 95.4 67 94.8 66.6 94.2 66.4 93.6 66.2 92.8 65.9 91.9 65.7 90.9 65.5 89.9 65.4 88.8 65.3 87.6 65.2 86.4 65.2 85.1 65.2 83.8 65.2 82.4 65.3 81 65.3 79.5 65.4 78 65.6 76.4 65.7 74.8 65.8 73.1 66 71.3 66.1 69.6 66.3 67.8 66.5 65.9 66.6 64 66.8 62 67 60 67.1 58Z';
  const GN_ENGRAVE = 'M55.8 84.4Q59.8 85.6 63.9 83.9M56.8 90.3Q60.5 91.2 64.2 89M58.5 95.7Q61.8 96 65 93.3M63.4 102.2Q65.4 101.2 67.5 97.3'
    + 'M53.1 61.8 53.2 63.7 53.3 65.6 53.4 67.4 53.5 69.3 53.5 71.1 53.6 72.8 53.7 74.6 53.8 76.3 53.9 78M66.8 62 66.6 64 66.5 65.9 66.3 67.8 66.1 69.6 66 71.3 65.8 73.1 65.7 74.8 65.6 76.4 65.4 78'
    + 'M45.4 54Q50.4 50.6 55.4 53.2M64.6 53.2Q69.6 50.6 74.6 54M46 57.8Q50.4 54.6 54.8 57.8Q50.4 60.4 46 57.8ZM65.2 57.8Q69.6 54.6 74 57.8Q69.6 60.4 65.2 57.8Z';
  const GN_CROWN = 'M60 3C63.4 6.6 64.6 9.8 62.6 13H57.4C55.4 9.8 56.6 6.6 60 3Z'
    + 'M55.4 14.6Q60 13.4 64.6 14.6L65.4 16.8Q60 15.7 54.6 16.8Z'
    + 'M53.6 18.6Q60 17.2 66.4 18.6C68.2 20.4 69.2 22.6 69.6 25.2Q60 23.4 50.4 25.2C50.8 22.6 51.8 20.4 53.6 18.6Z'
    + 'M49.8 27Q60 25 70.2 27C72.6 29.4 73.8 32 74.2 35.2Q60 32.8 45.8 35.2C46.2 32 47.4 29.4 49.8 27Z'
    + 'M45.4 37Q60 34.4 74.6 37C77 39.2 78.2 41.6 78.6 44.6Q60 41.4 41.4 44.6C41.8 41.6 43 39.2 45.4 37Z';
  const GN_FLOWER = [0, 90, 180, 270].map((a) => '<path d="M25.6 56.4C27.3 58.4 27.3 59.9 25.6 61.2C23.9 59.9 23.9 58.4 25.6 56.4Z"'
    + ` transform="rotate(${a} 25.6 62.6)"/>`).join('');
  // a row of tiny engraved beads following a tier's curve
  const beads = (y, x0, x1, n, bow) => Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return `<circle cx="${(x0 + (x1 - x0) * t).toFixed(1)}" cy="${(y - bow * (1 - (2 * t - 1) ** 2)).toFixed(1)}" r=".72"/>`;
  }).join('');
  const GN_BEADS = beads(40.6, 47.6, 55.6, 4, .4) + beads(40.6, 64.4, 72.4, 4, -.4) + beads(30.6, 51, 69, 7, 1.1) + beads(21.6, 55.4, 64.6, 4, .6);
  let ganeshaCount = 0;
  const ganeshaFoil = (cls) => {
    const id = `gn${++ganeshaCount}`;   // each copy carries its own gradient (the cover's copy is hidden later)
    const ear = `<path d="${GN_EAR}"/>`;
    const curl = '<path d="M42.2 44.6C37 43.8 34.2 40 35.8 36.8C37.2 34.2 40.8 34.8 40.6 37.6C40.5 39 39 39.6 38.2 38.8"'
      + ` fill="none" stroke="url(#${id})" stroke-width="1.6" stroke-linecap="round"/>`;
    return `<svg class="${cls} ganesha gn-foil" viewBox="0 0 120 120" role="img" aria-label="Shri Ganesh">`
      + `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="14" y1="4" x2="106" y2="112">`
      + '<stop offset="0" class="g1"/><stop offset=".34" class="g2"/><stop offset=".52" class="g3"/><stop offset=".7" class="g2"/><stop offset="1" class="g4"/></linearGradient>'
      + `<linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e6d3a6"/></linearGradient></defs>`
      + `<g fill="url(#${id})">${ear}${flipX(ear)}<path d="M41 46.5Q60 42.6 79 46.5C80.4 57 78.4 67 72.4 74C68.6 78.2 64 78.6 60 77.4C56 78.6 51.4 78.2 47.6 74C41.6 67 39.6 57 41 46.5Z"/></g>`
      + `<path class="gn-cut" d="M52.8 74.2C50.6 79.4 47.6 83.8 43.2 86.4C47.6 87.2 51.8 83.4 55 77.2Z" fill="url(#${id}t)" stroke-width=".7" stroke-linejoin="round"/>`
      + `<g fill="url(#${id})"><path d="${GN_TRUNK}"/><path d="${GN_CROWN}"/></g>${curl}${flipX(curl)}`
      + `<g class="gn-cut" fill="none" stroke-linecap="round" stroke-linejoin="round">${GN_EAR_LINES}${flipX(GN_EAR_LINES)}`
      + `<path d="${GN_ENGRAVE}" stroke-width=".9"/><path d="M42.4 48.6Q60 44.8 77.6 48.6" stroke-width=".8"/><path d="M54.2 77.6Q51 76.4 48.6 74.6" stroke-width=".7"/></g>`
      + `<g class="gn-cut-f">${GN_BEADS}<circle cx="50.4" cy="57.7" r="1.25"/><circle cx="69.6" cy="57.7" r="1.25"/>${GN_FLOWER}${flipX(GN_FLOWER)}</g>`
      + '<g class="gn-red"><path d="M57.6 47.4Q60 53.4 62.4 47.4" fill="none" stroke-width="1.6" stroke-linecap="round"/>'
      + '<circle cx="60" cy="51.4" r="1.35"/><path d="M60 37.2C61.6 39 61.6 40.6 60 41.8C58.4 40.6 58.4 39 60 37.2Z"/><circle cx="60" cy="9.6" r="1.1"/></g></svg>';
  };

  const GANESHA_EAR = '<path d="M43 52C33 43 16 47 14.5 60C13 73 25 82 40 74"/>';
  const ganeshaLine = (cls) => `<svg class="${cls} ganesha" viewBox="0 0 120 120" role="img" aria-label="Shri Ganesh">`
    + '<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'
    + GANESHA_EAR + `<g transform="translate(120 0) scale(-1 1)">${GANESHA_EAR}</g>`
    + '<path d="M60 9C63.5 14 63.5 18.5 60 22C56.5 18.5 56.5 14 60 9Z"/>'
    + '<path d="M52 30Q60 21 68 30M46 38.5Q60 27 74 38.5M41.5 46Q60 33.5 78.5 46"/>'
    + '<path d="M41.5 46H78.5"/>'
    + '<path d="M42.5 50C41.5 62 46 72 53 77M77.5 50C78.5 62 74 72 67 77"/>'
    + '<path d="M50 61Q53 58.6 56 61M64 61Q67 58.6 70 61" stroke-width="2.2"/>'
    + '<path d="M60 64C59 77 59.5 88 64.5 96C69.5 103.5 80 102 81 94.5C82 88 74 85.5 70.6 90.2C68.4 93.4 70.6 97 74.4 96"/>'
    + '<path d="M54 76C49.6 79.6 49 84.4 51.2 88" stroke-width="2.4"/></g>'
    + '<path d="M57.6 49.6Q60 55.6 62.4 49.6" fill="none" stroke="#c8202c" stroke-width="2" stroke-linecap="round"/>'
    + '<circle cx="60" cy="53.6" r="1.6" fill="#c8202c"/></svg>';

  /* a kalash: gold pot with a red band, mango leaves and a coconut */
  const kalash = () => '<svg class="kalash" viewBox="0 0 80 96" aria-hidden="true">'
    + '<g class="acc-green-f"><path d="M40 40C30 35 18 37 7 46C18 48.5 30 46.5 40 40Z"/><path d="M40 40C50 35 62 37 73 46C62 48.5 50 46.5 40 40Z"/>'
    + '<path d="M40 38C33 29.5 22 25.5 11 27.5C18.5 35 30 39.5 40 38Z"/><path d="M40 38C47 29.5 58 25.5 69 27.5C61.5 35 50 39.5 40 38Z"/></g>'
    + '<path d="M40 40L9 46M40 40L71 46M40 38L13 28M40 38L67 28" fill="none" stroke="#e9d39a" stroke-width=".6" opacity=".7"/>'
    + '<ellipse cx="40" cy="26" rx="10.5" ry="13.5" fill="#94612c"/><ellipse cx="36.5" cy="21" rx="3" ry="6" fill="#b98146" opacity=".7"/>'
    + '<path d="M40 13C38.5 8 40 4 43.5 1.5M40 13C41.5 8.5 44.5 7 48 6.5M40 13C38 9.5 35 8 32 8" fill="none" stroke="#c98a3a" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path class="acc-red-f" d="M30 30.5C36 34 44 34 50 30.5L49.5 35C44 38.5 36 38.5 30.5 35Z"/>'
    + '<path d="M30 49C14 51 10 70 22 82C28 88 52 88 58 82C70 70 66 51 50 49Z" fill="url(#gP)"/>'
    + '<path d="M31 43H49L50.5 49.5H29.5Z" fill="url(#gP)"/><ellipse cx="40" cy="42.5" rx="15" ry="3.2" fill="url(#gP)"/>'
    + '<path class="acc-red-f" d="M15.6 61.5C26 66 54 66 64.4 61.5L65 68C54 72.5 26 72.5 15 68Z"/>'
    + '<g class="acc-marigold-f"><circle cx="22" cy="66.5" r="1.5"/><circle cx="31" cy="68" r="1.5"/><circle cx="40" cy="68.5" r="1.5"/><circle cx="49" cy="68" r="1.5"/><circle cx="58" cy="66.5" r="1.5"/></g>'
    + '<path d="M22 56C30 58.5 50 58.5 58 56" fill="none" stroke="#fff3cf" stroke-width=".8" opacity=".6"/>'
    + '<path d="M28 87.5H52L49 93.5H31Z" fill="url(#gP)"/></svg>';

  /* a small illustration for each function, gold line art with colour accents */
  const EVENT_ICONS = {
    mandap: '<path class="ev-acc" d="M6 16C10 5 38 5 42 16Z" opacity=".9"/><path d="M6 16C10 5 38 5 42 16" fill="none" stroke="currentColor" stroke-width="1.2"/>'
      + '<path d="M3 16.5H45M3 38.5H45" stroke="currentColor" stroke-width="1.4"/><path d="M8 17V38M40 17V38" stroke="currentColor" stroke-width="2"/><path d="M16 17V38M32 17V38" stroke="currentColor" stroke-width="1"/>'
      + '<path d="M8 19Q12 25.5 16 19Q24 27 32 19Q36 25.5 40 19" fill="none" stroke="#f0b13a" stroke-width="1.6" stroke-dasharray="1.6 1.1"/>'
      + '<circle cx="24" cy="3.6" r="2.4" fill="url(#gP)"/><path d="M24 6V8" stroke="currentColor"/>',
    haldi: '<g fill="#ec8a1a"><circle cx="15" cy="15" r="4.6"/><circle cx="25" cy="11.5" r="5"/><circle cx="34" cy="15.5" r="4.4"/></g>'
      + '<g fill="#f7c53b"><circle cx="15" cy="15" r="2.4"/><circle cx="25" cy="11.5" r="2.7"/><circle cx="34" cy="15.5" r="2.3"/></g>'
      + '<path class="acc-green-f" d="M20 18C17 21 12 21 9 19C12 16.5 17 16.5 20 18ZM29 18C32 21 37 21 40 19C37 16.5 32 16.5 29 18Z"/>'
      + '<path d="M7 22H41C40 32 33 37.5 24 37.5C15 37.5 8 32 7 22Z" fill="url(#gP)"/><ellipse cx="24" cy="22" rx="17" ry="3.6" fill="#f2b632"/>'
      + '<path class="ev-acc" d="M10 27.5C18 30 30 30 38 27.5L37 30C30 32.5 18 32.5 11 30Z"/>',
    sangeet: '<path d="M11 13C16 3 32 3 37 13" fill="none" stroke="currentColor" stroke-width="1.2"/>'
      + '<rect class="ev-acc" x="10" y="12" width="28" height="21" rx="2"/>'
      + '<path d="M10 12L17 33L24 12L31 33L38 12" fill="none" stroke="#f3d27a" stroke-width="1.1"/>'
      + '<ellipse cx="10" cy="22.5" rx="4" ry="10.5" fill="url(#gP)"/><ellipse cx="38" cy="22.5" rx="4" ry="10.5" fill="url(#gP)"/>'
      + '<path d="M43 5v9.5" stroke="currentColor" stroke-width="1.1"/><ellipse cx="41.3" cy="14.6" rx="2.2" ry="1.6" fill="currentColor"/><path d="M43 5c2 1 3.5 2 3.5 4" fill="none" stroke="currentColor"/>',
    wedding: '<circle cx="24" cy="18" r="15" fill="url(#flameGlow)"/>'
      + '<path class="d-flame" fill="url(#flame)" d="M24 3C28 9.5 31 14 31 19C31 23.5 28 26 24 26C20 26 17 23.5 17 19C17 14 20 9.5 24 3Z"/>'
      + '<path fill="url(#flame)" d="M16.5 12C18.5 15.5 20 18 20 21C20 23.5 18.5 25.5 16.5 25.5C14.5 25.5 13 23.5 13 21C13 18 14.5 15.5 16.5 12ZM31.5 12C33.5 15.5 35 18 35 21C35 23.5 33.5 25.5 31.5 25.5C29.5 25.5 28 23.5 28 21C28 18 29.5 15.5 31.5 12Z" opacity=".9"/>'
      + '<path class="ev-acc" d="M5 25H43V28.5H5Z"/><path d="M8 28.5H40L36 38H12Z" fill="url(#gP)"/>'
      + '<path d="M11 32H37M13.5 35H34.5" stroke="#fff3cf" stroke-width=".7" opacity=".7"/>',
  };
  const eventIcon = (id) => `<svg class="ev-icon" viewBox="0 0 48 40" aria-hidden="true">${EVENT_ICONS[id]
    || '<path class="ev-acc" d="M24 36C17 30 16 18 24 6C32 18 31 30 24 36ZM24 36C13 35 6 27 4 18C13 19 20 26 24 36ZM24 36C35 35 42 27 44 18C35 19 28 26 24 36Z"/>'}</svg>`;

  const finial = () => '<svg class="finial" viewBox="0 0 60 34" aria-hidden="true">'
    + '<path class="fn-fill" fill="url(#gP)" d="M30 32C25 25 25 15 30 6C35 15 35 25 30 32Z"/>'
    + '<path class="fn-line" d="M30 32C22 31 16 25 15 18C22 19 27 25 30 32ZM30 32C38 31 44 25 45 18C38 19 33 25 30 32ZM30 32C18 33 8 29 3 22M30 32C42 33 52 29 57 22"/>'
    + '<circle cx="30" cy="2.5" r="2" fill="currentColor"/></svg>';

  /* jhalar: a fine gold scalloped fringe with tiny drops, across the top edge */
  function jhalar() {
    const n = 12;
    const w = 400 / n;
    let swags = '';
    let inner = '';
    let drops = '';
    let joints = '';
    for (let i = 0; i < n; i += 1) {
      const x0 = i * w;
      const xm = x0 + w / 2;
      swags += `M${r1(x0)} 4Q${r1(xm)} 22 ${r1(x0 + w)} 4`;
      inner += `M${r1(x0 + 3)} 5Q${r1(xm)} 15 ${r1(x0 + w - 3)} 5`;
      drops += `M${r1(xm)} 14.5c-2.4 3.4-2.6 6.4 0 8.6c2.6-2.2 2.4-5.2 0-8.6Z`;
      joints += `M${r1(x0 - 2.2)} 4a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0`;
    }
    joints += 'M397.8 4a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0';
    return '<svg class="jhalar" viewBox="0 0 400 30" aria-hidden="true">'
      + '<path d="M0 1.5H400" stroke="currentColor" stroke-width=".8"/>'
      + `<path d="${swags}" fill="none" stroke="url(#gS)" stroke-width="1.3"/>`
      + `<path d="${inner}" fill="none" stroke="currentColor" stroke-width=".6" opacity=".7"/>`
      + `<path d="${drops}" fill="url(#gS)"/><path d="${joints}" fill="url(#gS)"/></svg>`;
  }

  /* fine gold chains with small temple bells, hanging from the jhalar */
  function chains() {
    const cols = [[33.3, 58], [66.7, 98], [333.3, 98], [366.7, 58]];
    return '<svg class="chains" viewBox="0 0 400 140" aria-hidden="true">' + cols.map(([x, len], i) => {
      let beads = '';
      for (let y = 6; y < len; y += 4.2) beads += `M${r1(x - 0.9)} ${r1(y)}a.9 .9 0 1 0 1.8 0a.9 .9 0 1 0 -1.8 0`;
      const y = len;
      return `<g class="sway" style="animation-delay:-${(i * 1.3).toFixed(1)}s"><path class="c-bead" d="${beads}"/>`
        + `<circle class="c-pearl" cx="${x}" cy="${y + 2.5}" r="2.6"/>`
        + `<path fill="url(#gS)" d="M${x - 7.5} ${y + 19}C${x - 7.5} ${y + 10} ${x - 4} ${y + 5.5} ${x} ${y + 5.5}C${x + 4} ${y + 5.5} ${x + 7.5} ${y + 10} ${x + 7.5} ${y + 19}Z"/>`
        + `<path class="c-rim" d="M${x - 9} ${y + 19.5}H${x + 9}M${x - 6.2} ${y + 13}H${x + 6.2}"/>`
        + `<circle class="c-bead" cx="${x}" cy="${y + 23}" r="1.7"/></g>`;
    }).join('') + '</svg>';
  }

  /* a jharokha (palace window) arch framing the first screen */
  const arch = () => '<div class="arch" aria-hidden="true">'
    + '<svg class="arch-top" viewBox="0 0 320 250">'
    + '<path class="a-line" d="M14 250V200C14 110 80 50 160 30C240 50 306 110 306 200V250"/>'
    + '<path class="a-thin" d="M24 250V204C24 120 88 64 160 46C232 64 296 120 296 204V250"/>'
    + '<path fill="url(#gS)" d="M160 28C156 22 156 14 160 6C164 14 164 22 160 28ZM160 28C153 27 148 22 147 16C154 17 158 22 160 28ZM160 28C167 27 172 22 173 16C166 17 162 22 160 28Z"/>'
    + '<circle cx="160" cy="2.6" r="1.8" fill="currentColor"/>'
    + '<path fill="currentColor" d="M19 200l3-3 3 3-3 3zM295 200l3-3 3 3-3 3z"/></svg>'
    + '<div class="arch-pillars"><svg class="arch-sides" viewBox="0 0 320 100" preserveAspectRatio="none">'
    + '<path class="a-line" d="M14 0V100M306 0V100"/><path class="a-thin" d="M24 0V100M296 0V100"/></svg>'
    + '<span class="pillar l"></span><span class="pillar r"></span></div></div>';

  /* a diya (oil lamp) with a softly flickering flame */
  const diya = (side) => `<svg class="diya ${side}" viewBox="0 0 40 46" aria-hidden="true">`
    + '<circle class="d-glow" cx="20" cy="15" r="15" fill="url(#flameGlow)"/>'
    + '<path class="d-flame" fill="url(#flame)" d="M20 3C23 9 25.5 13.5 25.5 18C25.5 22.5 23 25.5 20 25.5C17 25.5 14.5 22.5 14.5 18C14.5 13.5 17 9 20 3Z"/>'
    + '<path fill="#fff8dc" opacity=".8" d="M20 13C21.4 16 22 18 22 20C22 22 21.1 23.4 20 23.4C18.9 23.4 18 22 18 20C18 18 18.6 16 20 13Z"/>'
    + '<path fill="url(#gS)" d="M3 27C5 36.5 35 36.5 37 27Z"/>'
    + '<path d="M1.5 27H38.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'
    + '<path fill="url(#gS)" d="M15 35.5L13 42H27L25 35.5Z"/><path d="M10 43H30" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';

  /* ---------------- the KJ logo (Details → logo: crest, script or arch) ---------------- */

  const lotusMark = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 8C-4 3-4-2 0-8C4-2 4 3 0 8ZM0 8C-7 7-11 3-12-2C-6-2-2 2 0 8ZM0 8C7 7 11 3 12-2C6-2 2 2 0 8Z"/>`;

  function laurel(cx, cy, R, from, to, step) { // angles in degrees, 0 = top, clockwise
    const dir = to > from ? 1 : -1;
    const P = (a) => [cx + R * Math.sin((a * Math.PI) / 180), cy - R * Math.cos((a * Math.PI) / 180)];
    let leaves = '';
    let k = 0;
    for (let a = from; dir > 0 ? a <= to : a >= to; a += step * dir, k += 1) {
      const [x, y] = P(a);
      const along = dir > 0 ? a : a + 180;
      const len = 15 - (Math.abs(a - from) / Math.abs(to - from)) * 5;
      leaves += `<path d="M0 0C${r1(len * 0.3)} -5.5 ${r1(len * 0.7)} -5.5 ${r1(len)} 0C${r1(len * 0.7)} 5.5 ${r1(len * 0.3)} 5.5 0 0Z" `
        + `transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(along + (k % 2 ? 34 : -34))})"/>`;
    }
    const [x1, y1] = P(from);
    const [x2, y2] = P(to);
    return { leaves, stem: `M${r1(x1)} ${r1(y1)}A${R} ${R} 0 0 ${dir > 0 ? 1 : 0} ${r1(x2)} ${r1(y2)}` };
  }

  // the second letter is cut out of the first with a mask, so they interlock with a clean gap
  const pair = (id, cls, size, ax, ay, bx, by, A, B, gap) => `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-50" y="-50" width="400" height="440">`
    + `<rect x="-50" y="-50" width="400" height="440" fill="#fff"/><text class="${cls}" x="${bx}" y="${by}" font-size="${size}" text-anchor="middle" fill="#000" stroke="#000" stroke-width="${gap}" stroke-linejoin="round">${B}</text></mask></defs>`
    + `<text class="${cls} lg-letter" x="${ax}" y="${ay}" font-size="${size}" text-anchor="middle" fill="url(#gS)" mask="url(#${id})">${A}</text>`
    + `<text class="${cls} lg-letter" x="${bx}" y="${by}" font-size="${size}" text-anchor="middle" fill="url(#gS)">${B}</text>`;

  // typefaces for the crest's K and J (Details → logo_font). The letters are staggered:
  // K sits high on the left, J low on the right, interlocking on the diagonal.
  const CREST_FONTS = {
    bodoni: { cls: 'lg-bodoni', size: 134, ax: 114, ay: 158, bx: 184, by: 214, gap: 8 },
    cinzel: { cls: 'lg-cinzel', size: 116, ax: 118, ay: 154, bx: 181, by: 200, gap: 7 },
    imperial: { cls: 'lg-imperial', size: 128, ax: 120, ay: 154, bx: 180, by: 206, gap: 8, plain: true },
    garamond: { cls: 'lg-serif', size: 132, ax: 116, ay: 158, bx: 182, by: 214, gap: 8 },
    // a hand-drawn K–J ligature (falls back to Bodoni for other initials)
    monogram: { cls: 'lg-bodoni', size: 134, ax: 114, ay: 158, bx: 184, by: 214, gap: 8, drawn: true },
  };
  /* The drawn KJ: a high-contrast serif with thick stems and hairline serifs. The K's leg sweeps through
     the J's stem into a long thin swash, and the J's hook curls back under the K.
     One path, drawn at ~205 units tall around (452, 782), all parts wound the same way so overlaps stay filled. */
  const KJ_MONOGRAM = 'M330 626 345 626 345 830 330 830ZM320 626 358 626 358 629.6 320 629.6ZM320 826.4 358 826.4 358 830 320 830ZM342.7 748.9 446.7 626.7 449.3 628.9 345.3 751.1ZM431 626 463 626 463 629.6 431 629.6ZM379.4 706.4 381.7 710.3 385 714 388.8 717.7 392.5 721.7 395.4 726.2 397.8 731.2 400.5 736.4 403.2 741.6 406 747 409 752.5 412.1 758.2 415.3 763.9 418.6 769.7 421.9 775.5 425.4 781.5 429 787.4 432.7 793.4 436.5 799.5 440.3 805.5 444.2 811.6 448.2 817.6 452.3 823.7 456.4 829.7 460.6 835.6 464.9 841.6 469.1 847.3 472.2 851.1 475.3 855.1 478.3 859.2 481.4 863.3 484.4 867.5 487.5 871.6 490.5 875.8 493.6 880 496.8 884.1 500 888.1 503.2 892.1 506.6 896 510.1 899.8 513.6 903.4 517.3 906.9 521.2 910.2 525.1 913.3 529.3 916.1 533.5 918.7 537.9 921 542.4 923.1 546.9 925 551.6 926.6 556.3 928 561.2 929.2 566.1 930.1 568.4 930.3 570.6 930.5 572.7 930.7 574.8 930.9 576.8 931 578.8 931.1 580.7 931.1 582.6 931.1 584.4 931.1 586.2 931 587.9 931 589.6 930.9 591.2 930.7 592.8 930.6 594.3 930.4 595.8 930.1 597.3 929.9 598.7 929.6 600.1 929.3 601.4 929 602.8 928.7 604 928.3 605.3 927.9 606.5 927.5 607.7 927.1 608.9 926.6 609 926.6 609.2 926.6 609.3 926.7 609.4 926.9 609.4 927 609.4 927.2 609.3 927.3 609.1 927.4 608 927.8 606.8 928.3 605.5 928.7 604.3 929.1 603 929.5 601.7 929.8 600.3 930.2 598.9 930.5 597.5 930.8 596 931.1 594.5 931.3 592.9 931.6 591.3 931.8 589.7 932 588 932.1 586.2 932.2 584.4 932.3 582.6 932.4 580.7 932.5 578.8 932.5 576.8 932.5 574.7 932.4 572.6 932.3 570.4 932.2 568.2 932.1 565.9 931.9 560.8 931.1 555.8 930.1 550.9 928.7 546.1 927.1 541.4 925.2 536.9 923.1 532.4 920.7 527.9 918.3 523.5 915.7 519.1 913 514.8 910.2 510.5 907.3 506.2 904.2 501.9 901.1 497.7 897.8 493.6 894.4 489.5 891 485.5 887.4 481.5 883.8 477.7 880.1 473.9 876.3 470.3 872.5 466.8 868.6 463.4 864.7 460.1 860.7 456.9 856.7 452.4 850.6 448.1 844.6 443.8 838.5 439.6 832.3 435.4 826.2 431.3 820 427.3 813.8 423.4 807.7 419.6 801.5 415.9 795.4 412.2 789.3 408.7 783.3 405.2 777.3 401.8 771.4 398.6 765.6 395.5 759.9 392.4 754.3 389.5 748.8 386.7 743.4 384.1 738.1 381.5 733 379.7 727.8 378.9 722.3 378.5 717 377.9 712 376.6 707.6ZM490 626 505 626 505 872 490 872ZM481 626 512 626 512 629.6 481 629.6ZM505 862.2 504.8 867.6 504.4 873.1 503.6 878.4 502.6 883.6 501.3 888.6 499.7 893.4 497.9 898.1 495.8 902.6 493.4 906.9 490.9 910.9 488.1 914.8 485 918.4 481.8 921.8 478.4 924.9 474.8 927.8 470.9 930.4 467 932.8 462.8 934.9 458.5 936.8 454 938.4 449.4 939.7 444.6 940.8 439.7 941.6 434.6 942.2 429.4 942.5 424 942.5 419.3 942.4 414.7 942.1 410.1 941.6 405.6 940.9 401.2 940 396.9 939 392.7 937.7 388.6 936.3 384.6 934.6 380.8 932.8 377.1 930.8 373.5 928.6 370.1 926.3 366.9 923.7 363.8 921 360.9 918.1 358.2 915.1 355.7 911.9 353.3 908.5 351.2 905 349.3 901.3 347.7 897.4 346.2 893.4 345.1 889.2 344.2 884.8 343.6 880.3 343.6 879 343.5 877.8 343.5 876.7 343.4 875.6 343.4 874.5 343.3 873.4 343.3 872.4 343.3 871.3 343.2 870.3 343.2 869.2 343.2 868.2 343.2 867.2 343.2 866.2 343.1 865.2 343.1 864.1 343.1 863.1 343.1 862.1 343.1 861.1 343.1 860.1 343.1 859.1 343.1 858.1 343.1 857.1 343.1 856.1 343.1 855.1 343.1 854 343.1 853 350.1 853 350.1 854 350.1 855.1 350.1 856.1 350.1 857.1 350.1 858.1 350.1 859.1 350.1 860.1 350.1 861.1 350.1 862.1 350.1 863.1 350.1 864.1 350.1 865.1 350.1 866.1 350.2 867.1 350.2 868.1 350.2 869.1 350.2 870.1 350.2 871.2 350.2 872.2 350.2 873.3 350.3 874.3 350.3 875.4 350.3 876.5 350.3 877.6 350.3 878.7 350.4 879.7 350.7 883.8 351.4 887.8 352.2 891.6 353.3 895.4 354.7 898.9 356.2 902.4 358 905.6 360 908.8 362.2 911.8 364.7 914.7 367.3 917.4 370.1 919.9 373.1 922.2 376.3 924.4 379.6 926.5 383.1 928.3 386.7 930.1 390.4 931.6 394.3 933 398.2 934.1 402.3 935.2 406.5 936 410.8 936.7 415.1 937.1 419.5 937.4 424 937.5 429.1 937.2 434 936.7 438.7 935.9 443.2 934.8 447.5 933.4 451.6 931.8 455.4 930 459.1 928 462.5 925.7 465.8 923.2 468.8 920.6 471.6 917.8 474.2 914.7 476.6 911.6 478.8 908.2 480.7 904.8 482.5 901.1 484.1 897.3 485.5 893.4 486.7 889.3 487.7 885.1 488.6 880.8 489.2 876.3 489.6 871.7 489.9 866.9 490 861.8Z';
  // a paisley (kairi) with its tail curling up-right, balancing the empty corners of the diagonal
  const PAISLEY = 'M0 12C-11 12-16 2-12-6C-8-14 4-15 10-10C14-7 18-12 17-19C22-12 21-2 14 5C10 9 5 12 0 12Z';
  // (position on the outer group; the inner group animates, so its CSS transform can't override the position)
  const paisley = (x, y, deg, s = 1.15) => `<g transform="translate(${x} ${y}) rotate(${deg}) scale(${s})"><g class="bloom">`
    + `<path d="${PAISLEY}" fill="none" stroke="url(#gS)" stroke-width="1.1"/>`
    + `<path d="${PAISLEY}" transform="translate(-1.5 1.5) scale(.55)" fill="url(#gS)" opacity=".75"/>`
    + '<path d="M17-19c3-2 6.5 0 5.5 3.2c-.8 2.2-3.2 2.4-4.2 1" fill="none" stroke="currentColor" stroke-width=".9" stroke-linecap="round"/>'
    + '<g fill="currentColor"><circle cx="-3.5" cy="1.5" r="1.5"/><circle cx="-17.5" cy="0" r="1.1"/><circle cx="-14.5" cy="10" r="1.1"/><circle cx="-6" cy="17" r="1.1"/><circle cx="4" cy="17.5" r="1.1"/></g></g></g>';
  // the eye of a peacock feather, drawn along +x (rotate it to point the feather)
  const peacockEye = (rx, ry) => `<ellipse rx="${rx}" ry="${ry}" fill="url(#gS)" opacity=".28" stroke="currentColor" stroke-width=".7"/>`
    + `<ellipse rx="${r1(rx * 0.64)}" ry="${r1(ry * 0.66)}" fill="url(#gS)"/>`
    + `<ellipse class="eye-core" rx="${r1(rx * 0.34)}" ry="${r1(ry * 0.36)}"/>`
    + `<ellipse cx="${r1(-rx * 0.06)}" cy="${r1(-ry * 0.06)}" rx="${r1(rx * 0.13)}" ry="${r1(ry * 0.13)}" fill="#fff4d6"/>`;

  // a small peacock feather (quill, fanned barbs, eye) pointing up-right, for the diagonal corners
  function featherEye(x, y, deg) {
    const d = [Math.SQRT1_2, -Math.SQRT1_2]; // along the quill, towards the eye
    const p = [Math.SQRT1_2, Math.SQRT1_2]; // across the quill
    let barbs = '';
    for (let i = 0; i <= 8; i += 1) {
      const t = i / 8;
      const qx = -15 + 21 * t;
      const qy = 15 - 21 * t;
      const L = 2.5 + 6.5 * t;
      for (const s of [1, -1]) {
        barbs += `M${r1(qx)} ${r1(qy)}l${r1(L * (0.85 * s * p[0] + 0.5 * d[0]))} ${r1(L * (0.85 * s * p[1] + 0.5 * d[1]))}`;
      }
    }
    return `<g transform="translate(${x} ${y}) rotate(${deg}) scale(1.15)"><g class="bloom">`
      + '<path d="M-17 17Q-6 6 6-6" fill="none" stroke="currentColor" stroke-width="1"/>'
      + `<path d="${barbs}" fill="none" stroke="currentColor" stroke-width=".55" opacity=".85"/>`
      + `<g transform="translate(10 -10) rotate(-45)">${peacockEye(11, 7.5)}</g></g></g>`;
  }

  // a long peacock feather rising from the bottom lotus and curving up the left side of the ring
  function bigFeather() {
    const Rq = 151;
    const a0 = 198;
    const a1 = 290;
    const P = (R, deg) => [150 + R * Math.sin((deg * Math.PI) / 180), 150 - R * Math.cos((deg * Math.PI) / 180)];
    let barbs = '';
    for (let a = a0 + 22; a <= a1; a += 1.9) {
      const t = (a - a0 - 22) / (a1 - a0 - 22);
      const L = 3 + 14 * t;
      const lean = 3 + 4 * t;
      const [qx, qy] = P(Rq, a);
      const [ox, oy] = P(Rq + L, a + lean);
      const [ix, iy] = P(Rq - Math.min(L, 8), a + lean);
      barbs += `M${r1(qx)} ${r1(qy)}L${r1(ox)} ${r1(oy)}M${r1(qx)} ${r1(qy)}L${r1(ix)} ${r1(iy)}`;
    }
    const [sx, sy] = P(Rq, a0);
    const [ex, ey] = P(Rq, a1);
    const [cx, cy] = P(Rq + 2, a1 + 6);
    return '<g class="feather">'
      + `<path d="M${r1(sx)} ${r1(sy)}A${Rq} ${Rq} 0 0 1 ${r1(ex)} ${r1(ey)}" fill="none" stroke="currentColor" stroke-width="1.2"/>`
      + `<path d="${barbs}" fill="none" stroke="currentColor" stroke-width=".55" opacity=".85"/>`
      + `<g transform="translate(${r1(cx)} ${r1(cy)}) rotate(${a1 + 6})">${peacockEye(20, 13)}</g></g>`;
  }

  // gold sparkles that twinkle around the ring (strong animation)
  const sparkles = () => [[35, 146], [118, 150], [158, 128], [212, 150], [252, 128], [322, 146]].map(([deg, R], i) => {
    const x = r1(150 + R * Math.sin((deg * Math.PI) / 180));
    const y = r1(150 - R * Math.cos((deg * Math.PI) / 180));
    return `<g transform="translate(${x} ${y})"><path class="twinkle" style="animation-delay:${(i * 0.55).toFixed(2)}s" fill="#fff6d8" d="M0-6.5L1.5-1.5 6.5 0 1.5 1.5 0 6.5-1.5 1.5-6.5 0-1.5-1.5Z"/></g>`;
  }).join('');

  // a three-petal lotus crown sitting on top of the ring
  const crown = () => '<g fill="url(#gS)">'
    + '<path d="M150 10C145 2 145-8 150-18C155-8 155 2 150 10Z"/>'
    + '<path d="M146 11C138 8 132 0 130-10C137-6 143 2 146 11Z"/><path d="M154 11C162 8 168 0 170-10C163-6 157 2 154 11Z"/>'
    + '<path d="M141 12C134 12 127 8 122 2C129 3 136 6 141 12Z"/><path d="M159 12C166 12 173 8 178 2C171 3 164 6 159 12Z"/>'
    + '<circle cx="150" cy="-23" r="2.2"/><circle cx="129" cy="-14" r="1.6"/><circle cx="171" cy="-14" r="1.6"/></g>';

  function logo(style, couple, date, fontName, opts = {}) {
    const A = esc((couple.name1 || '').trim().charAt(0).toUpperCase());
    const B = esc((couple.name2 || '').trim().charAt(0).toUpperCase());
    const id = `lg${Math.random().toString(36).slice(2, 8)}`;
    const label = 'aria-hidden="true"';
    if (style === 'script') {
      const l = laurel(150, 156, 118, 203, 337, 8.4);
      const r = laurel(150, 156, 118, 157, 23, 8.4);
      return `<svg class="logo logo-script" viewBox="0 0 300 320" ${label}>`
        + `<path d="${l.stem}${r.stem}" fill="none" stroke="url(#gS)" stroke-width="1.2"/>`
        + `<g fill="url(#gS)">${l.leaves}${r.leaves}${lotusMark(150, 276, -1.1)}<path d="M150 30l4 5-4 5-4-5z"/></g>`
        + pair(id, 'lg-script', 132, 120, 188, 184, 196, A, B, 8)
        + '</svg>';
    }
    if (style === 'arch') {
      const l = laurel(150, 192, 104, 197, 229, 6.4);
      const r = laurel(150, 192, 104, 163, 131, 6.4);
      return `<svg class="logo logo-arch" viewBox="0 0 300 340" ${label}>`
        + '<g fill="none" stroke="url(#gS)"><path stroke-width="1.4" d="M40 326V156C40 98 94 60 150 44C206 60 260 98 260 156V326Z"/>'
        + '<path stroke-width=".7" d="M49 317V159C49 104 99 70 150 55C201 70 251 104 251 159V317Z"/>'
        + `<path d="${l.stem}${r.stem}" stroke-width="1.1"/></g>`
        + '<path d="M150 146V182M150 210V246" stroke="currentColor" stroke-width=".9"/>'
        + `<g fill="url(#gS)">${lotusMark(150, 32, 1.2)}<circle cx="150" cy="14" r="2.4"/><path d="M150 189l6 7-6 7-6-7z"/>`
        + `<path d="M40 326l4-4 4 4-4 4zM252 326l4-4 4 4-4 4z"/>${l.leaves}${r.leaves}</g>`
        + `<text class="lg-caps" x="99" y="236" font-size="112" text-anchor="middle" fill="url(#gS)">${A}</text>`
        + `<text class="lg-caps" x="201" y="236" font-size="112" text-anchor="middle" fill="url(#gS)">${B}</text>`
        + '</svg>';
    }
    // mehndi-style scalloped ring with tiny dots where the scallops meet
    const P = (R, deg) => [150 + R * Math.sin((deg * Math.PI) / 180), 150 - R * Math.cos((deg * Math.PI) / 180)];
    let scallops = '';
    let dots = '';
    const N = 40;
    const rr = r1(124 * Math.sin(Math.PI / N) * 1.12);
    for (let i = 0; i < N; i += 1) {
      const [x0, y0] = P(124, (i * 360) / N);
      const [x1, y1] = P(124, ((i + 1) * 360) / N);
      scallops += `M${r1(x0)} ${r1(y0)}A${rr} ${rr} 0 0 1 ${r1(x1)} ${r1(y1)}`;
      const [dx, dy] = P(119, (i * 360) / N);
      dots += `<circle cx="${r1(dx)}" cy="${r1(dy)}" r="1.1"/>`;
    }
    const f = CREST_FONTS[fontName] || CREST_FONTS.cinzel;
    const peacock = opts.motif === 'peacock';
    const strong = opts.anim === 'strong';
    const letterFill = reduceMotion ? 'url(#gS)' : strong ? 'url(#gLogoStrong)' : 'url(#gLogo)';
    const drawn = f.drawn && A === 'K' && B === 'J';
    // the drawn J hooks into the lower-left, so its corner ornament moves out a little
    const [lx, ly] = drawn ? [66, 218] : [peacock ? 80 : 84, peacock ? 208 : 206];
    const corners = f.plain ? '' : peacock ? featherEye(220, 94, 0) + featherEye(lx, ly, 180) : paisley(216, 96, 0) + paisley(lx, ly, 180);
    return `<svg class="logo logo-crest motif-${peacock ? 'peacock' : 'paisley'}${strong ? ' anim-strong' : ''}" viewBox="${peacock ? '-26 -28 352 328' : '0 -28 300 328'}" ${label}>`
      + (peacock ? `${bigFeather()}<g transform="translate(300 0) scale(-1 1)">${bigFeather()}</g>` : '')
      + (strong ? '<circle class="glow" cx="150" cy="150" r="112" fill="url(#logoGlow)"/>' : '')
      + '<g fill="none" stroke="url(#gS)"><circle class="draw" pathLength="1" cx="150" cy="150" r="140" stroke-width="1.4"/>'
      + '<circle class="draw" pathLength="1" cx="150" cy="150" r="133" stroke-width=".7"/></g>'
      + `<path class="bloom" d="${scallops}" fill="none" stroke="url(#gS)" stroke-width=".8"/><g class="bloom" fill="url(#gS)">${dots}</g>`
      + `${crown()}<g fill="url(#gS)">${lotusMark(150, 289, -1)}${peacock ? '' : '<path d="M8 150l5-5 5 5-5 5zM282 150l5-5 5 5-5 5z"/>'}</g>`
      + corners
      + (drawn
        ? `<path class="lg-letter lg-drawn" pathLength="900" transform="translate(150 152) scale(.53) translate(-452 -782)" d="${KJ_MONOGRAM}" fill="${letterFill}"/>`
        : pair(id, f.cls, f.size, f.ax, f.ay, f.bx, f.by, A, B, f.gap).replace(/fill="url\(#gS\)"/g, `fill="${letterFill}"`))
      + (strong && !reduceMotion ? sparkles() : '')
      + '</svg>';
  }

  const ICON = {
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="1"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    down: '<svg width="18" height="10" viewBox="0 0 18 10" aria-hidden="true"><path d="M1 1l8 8 8-8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
  };

  /* ---------------- loading & decrypting ---------------- */

  function getCode() {
    let raw = location.hash.slice(1) || params.get('g') || '';
    try { raw = decodeURIComponent(raw); } catch (_) { /* keep raw */ }
    return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  async function loadInvite(code) {
    if (window.INVITE_PREVIEW_DATA) return { invite: window.INVITE_PREVIEW_DATA };
    if (!code) return { error: 'nocode' };
    if (!window.crypto || !crypto.subtle) return { error: 'unsupported' };
    const res = await fetch(`guests.json?v=${encodeURIComponent(root.dataset.build || '')}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`guests.json: HTTP ${res.status}`);
    const data = await res.json();
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(data.salt), iterations: data.iter }, material, 384);
    const sealed = data.g[toHex(bits.slice(32))];
    if (!sealed) return { error: 'notfound' };
    const bytes = fromB64(sealed);
    const key = await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
    return { invite: JSON.parse(new TextDecoder().decode(plain)) };
  }

  /* ---------------- calendar & RSVP helpers ---------------- */

  function calendarText(ev, inv) {
    return {
      title: `${ev.name} · ${inv.couple.name1} & ${inv.couple.name2}`,
      where: [ev.venue, ev.address].filter(Boolean).join(', '),
      details: [ev.dress && `Dress code: ${ev.dress}`, ev.notes].filter(Boolean).join('\n'),
    };
  }

  function googleCalendarUrl(ev, inv) {
    const t = calendarText(ev, inv);
    const q = new URLSearchParams({
      action: 'TEMPLATE', text: t.title, dates: `${ev.startUtc}/${ev.endUtc}`, location: t.where, details: t.details,
    });
    return `https://calendar.google.com/calendar/render?${q}`;
  }

  function downloadIcs(ev, inv) {
    const t = calendarText(ev, inv);
    const icsText = (s) => String(s || '').replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const body = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wedding Invitation//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', `UID:${ev.id}-${ev.startUtc}@wedding-invite`, `DTSTAMP:${stamp}`,
      `DTSTART:${ev.startUtc}`, `DTEND:${ev.endUtc}`, `SUMMARY:${icsText(t.title)}`,
      `LOCATION:${icsText(t.where)}`, `DESCRIPTION:${icsText(t.details)}`, 'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
    link.download = `${ev.id}.ics`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1500);
  }

  function rsvpUrl(inv, code) {
    const url = safeUrl(inv.rsvp && inv.rsvp.url);
    if (!url || /DUMMY/i.test(url)) return '';
    return url.replace(/GUEST_NAME/g, encodeURIComponent(inv.guest.name))
      .replace(/GUEST_CODE/g, encodeURIComponent(code));
  }

  let toastTimer;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
  }

  /* ---------------- rendering ---------------- */

  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  /* invite_line can say {you}: "you", "both of you", "all four of you", "all of you" (max_guests ALL) */
  function fillInvite(template, n) {
    if (!template) return '';
    const you = n === 'all' ? 'all of you'
      : !n || n === 1 ? 'you'
        : n === 2 ? 'both of you'
          : `all ${WORDS[n] || n} of you`;
    return template.replace(/\{you\}/g, you).replace(/\{count\}/g, typeof n === 'number' ? (WORDS[n] || String(n)) : '');
  }

  const initialsOf = (c) => [c.name1, c.name2].map((n) => (n || '').trim().charAt(0).toUpperCase()).filter(Boolean).join(' & ');
  const emblemHtml = (emblem, initials, cls) => {
    const e = (emblem || '').trim().toLowerCase();
    if (e === 'ganesha' || e === 'ganesha-line') {
      const pick = (params.get('ganesha') || '').toLowerCase();   // ?ganesha=line|foil previews the other drawing
      return ((pick || (e === 'ganesha' ? 'foil' : 'line')) === 'line' ? ganeshaLine : ganeshaFoil)(cls);
    }
    return emblem
      ? `<span class="${cls} foil"${isDevanagari(emblem) ? ' lang="sa"' : ''}>${esc(emblem)}</span>`
      : `<span class="${cls} initials foil">${esc(initials)}</span>`;
  };

  function eventCard(ev, index, inv, look = {}) {
    const maps = safeUrl(ev.maps);
    const withProps = look.decor && ['mandap', 'haldi', 'sangeet', 'wedding'].includes(ev.id);
    const cls = `${look.pastel ? ' pastel' : ''}${look.decor ? ' decor' : ''}${withProps ? ' has-props' : ''}`;
    return `<div class="card reveal ev-${esc(ev.id)}${cls}">
      ${look.decor ? corner('bl') + corner('br') : ''}
      ${eventIcon(ev.id)}
      <h3 class="ev-name script foil">${esc(ev.name)}</h3>
      <p class="ev-day tiny">${esc(ev.weekday)}</p>
      <p><span class="ev-num foil">${esc(ev.dayNum)}</span></p>
      <p class="ev-month">${esc(ev.monthYear)}</p>
      ${divider('P')}
      <p class="ev-time">${esc(ev.time)}</p>
      ${ev.venue ? `<p class="ev-venue">${esc(ev.venue)}</p>` : ''}
      ${ev.address ? `<p class="ev-addr">${esc(ev.address)}</p>` : ''}
      ${ev.dress ? `<p class="ev-dress"><span class="tiny">Dress code</span>${esc(ev.dress)}</p>` : ''}
      ${ev.notes ? `<p class="ev-notes">${esc(ev.notes)}</p>` : ''}
      <div class="actions">
        ${maps ? `<a class="btn-line" href="${esc(maps)}" target="_blank" rel="noopener">${ICON.pin}Directions</a>` : ''}
        <details class="cal">
          <summary class="btn-line">${ICON.cal}Calendar</summary>
          <div class="cal-menu">
            <a href="${esc(googleCalendarUrl(ev, inv))}" target="_blank" rel="noopener">Google Calendar</a>
            <button type="button" data-ics="${index}">Apple / Outlook (.ics)</button>
          </div>
        </details>
      </div>
    </div>`;
  }

  function render(inv, code) {
    const c = inv.couple;
    const t = inv.text || {};
    const g = inv.guest;
    const lead = fillInvite(t.invite, g.seats);
    const heroTitle = t.heroTitle
      ? esc(t.heroTitle).replace(/\s+/, '<br>')
      : `${esc(c.name1)}<span class="hero-amp">${esc(c.joiner || '&')}</span>${esc(c.name2)}`;
    const rsvp = rsvpUrl(inv, code);
    const contacts = (inv.contacts || []).filter((x) => x.tel);
    const first = inv.events[0];
    const dev = isDevanagari(t.invocation);
    const LOGOS = ['crest', 'script', 'arch'];
    const logoParam = (params.get('logo') || '').toLowerCase();
    const logoStyle = LOGOS.includes(logoParam) ? logoParam : (LOGOS.includes(t.logo) ? t.logo : '');
    const fontParam = (params.get('logofont') || '').toLowerCase();
    const logoFont = CREST_FONTS[fontParam] ? fontParam : (CREST_FONTS[t.logoFont] ? t.logoFont : 'cinzel');
    const pick = (param, setting, allowed, fallback) => {
      const p = (params.get(param) || '').toLowerCase();
      return allowed.includes(p) ? p : (allowed.includes(setting) ? setting : fallback);
    };
    const logoOpts = {
      motif: pick('motif', t.logoMotif, ['paisley', 'peacock'], 'paisley'),
      anim: pick('anim', t.logoAnim, ['subtle', 'strong'], 'subtle'),
    };
    const cardLook = {
      pastel: pick('cards', t.cardBg, ['ivory', 'pastel'], 'ivory') === 'pastel',
      decor: pick('border', t.cardBorder, ['plain', 'decorated'], 'plain') === 'decorated',
    };

    $('#invite').innerHTML = `
      <section class="hero silk${logoStyle ? ' has-logo' : ''}">
        <div class="hero-lace">${mandala('S', false)}</div>
        ${arch()}
        ${chains()}
        ${jhalar()}
        <div class="hero-inner">
          <div class="halo reveal" style="--d:.1s">${mandala('S', true)}${emblemHtml(t.emblem, initialsOf(c), 'emblem')}</div>
          ${t.invocation ? `<p class="invocation reveal${dev ? '' : ' latin'}" style="--d:.4s"${dev ? ' lang="sa"' : ''}>${esc(t.invocation)}</p>` : ''}
          ${logoStyle
            ? `<h1 class="hero-logo reveal" style="--d:.8s"><span class="sr-only">${esc(c.name1)} &amp; ${esc(c.name2)}</span>${logo(logoStyle, c, inv.logoDate || '', logoFont, logoOpts)}</h1>`
            : `<h1 class="hero-title script foil write" style="--d:.8s">${heroTitle}</h1>`}
          <div class="reveal" style="--d:1.3s">${divider('S')}</div>
          <p class="hero-date reveal" style="--d:1.5s">${esc(inv.dates)}</p>
          <button class="cue tiny reveal" style="--d:1.9s" type="button" id="cue">Scroll${ICON.down}</button>
        </div>
        ${diya('l')}${diya('r')}
      </section>

      <section class="couple paper" id="welcome">
        <div class="paper-lace">${mandala('P', false)}</div>
        <div class="framed">
          ${corner('tl')}${corner('tr')}${corner('bl')}${corner('br')}
          <div class="kalash-wrap reveal">${kalash()}</div>
          <p class="dear reveal">Dear ${esc(g.name)},</p>
          ${lead ? `<p class="lead reveal">${esc(lead)}</p>` : ''}
          <h2 class="person script foil write">${esc(c.name1)}</h2>
          ${t.parents1 ? `<p class="parents reveal">${esc(t.parents1)}</p>` : ''}
          <p class="and script foil reveal">${esc(c.joiner || '&')}</p>
          <h2 class="person script foil write">${esc(c.name2)}</h2>
          ${t.parents2 ? `<p class="parents reveal">${esc(t.parents2)}</p>` : ''}
          <div class="reveal">${divider('P')}</div>
          <p class="when reveal">${esc(inv.dates)}</p>
          ${t.location ? `<p class="place reveal">${esc(t.location)}</p>` : ''}
        </div>
      </section>

      <section class="events silk">
        <div class="patola top"></div>
        <div class="lace l1">${mandala('S', false)}</div>
        <div class="lace l2">${mandala('S', false)}</div>
        <p class="kicker reveal">You are warmly invited to</p>
        <h2 class="title foil reveal">${inv.events.length > 1 ? 'Functions &amp; Ceremonies' : 'The Ceremony'}</h2>
        <div class="reveal">${divider('S')}</div>
        <div class="cards">${inv.events.map((ev, i) => eventCard(ev, i, inv, cardLook)).join('')}</div>
        <div class="patola bottom"></div>
      </section>

      <section class="info paper">
        <div class="paper-lace">${mandala('P', false)}</div>
        <div class="framed">
          ${corner('tl')}${corner('tr')}${corner('bl')}${corner('br')}
          <div id="countdown">
            <h2 class="title foil reveal">Counting the Days</h2>
            <p class="sub reveal">until the ${esc(first.name)}</p>
            <div class="clock reveal">
              ${[['Days', 'Days'], ['Hours', 'Hours'], ['Minutes', 'Mins'], ['Seconds', 'Secs']].map(([u, label]) => `<div><b class="foil" data-unit="${u}">00</b><span class="tiny">${label}</span></div>`).join('')}
            </div>
          </div>
          ${divider('P')}
          <h2 class="title foil reveal">Kindly Respond</h2>
          <p class="lead rsvp-lead reveal">${inv.rsvp && inv.rsvp.deadline ? `We would be grateful for your reply by ${esc(inv.rsvp.deadline)}` : 'We would be grateful for your reply'}</p>
          <div class="reveal">${rsvp
            ? `<a class="btn-solid" href="${esc(rsvp)}" target="_blank" rel="noopener">RSVP</a>`
            : '<button class="btn-solid" type="button" id="rsvp-soon">RSVP</button>'}</div>
          ${t.invitedBy ? `${divider('P')}<h2 class="title foil reveal">Invited By</h2><p class="who reveal">${esc(t.invitedBy)}</p>` : ''}
          ${contacts.length ? `${divider('P')}<h2 class="title foil reveal">Contact</h2>
            <div class="phones">${contacts.map((x) => `<a class="btn-line reveal" href="tel:${esc(x.tel)}">${x.name ? `<small>${esc(x.name)}</small>` : ''}${esc(x.phone)}</a>`).join('')}</div>` : ''}
        </div>
      </section>

      <section class="foot silk">
        <div class="patola top"></div>
        <div class="lace">${mandala('S', false)}</div>
        ${logoStyle ? `<div class="foot-crest hero-logo reveal">${logo(logoStyle, c, inv.logoDate || '', logoFont, { motif: logoOpts.motif, anim: 'subtle' })}</div>` : ''}
        ${t.closing ? `<p class="closing reveal">${esc(t.closing)}</p>` : ''}
        ${t.hashtag ? `<div class="tag reveal"><span class="title foil">${esc(t.hashtag)}</span></div>` : ''}
        ${t.signoff ? `<p class="signoff script foil reveal">${esc(t.signoff)}</p>` : ''}
        <div class="reveal">${divider('S')}</div>
      </section>`;

    document.title = `${c.name1} ${c.joiner || '&'} ${c.name2}`;

    document.querySelectorAll('[data-ics]').forEach((btn) => {
      btn.addEventListener('click', () => downloadIcs(inv.events[Number(btn.dataset.ics)], inv));
    });
    const soon = $('#rsvp-soon');
    if (soon) soon.addEventListener('click', () => toast('The RSVP form will be available here soon.'));
    // scroll without touching the address: the part after # is the guest's code
    $('#cue').addEventListener('click', () => {
      $('#welcome').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
    startCountdown(first.start);
  }

  function startCountdown(iso) {
    const target = new Date(iso).getTime();
    const box = $('#countdown');
    const cells = {};
    box.querySelectorAll('[data-unit]').forEach((el) => { cells[el.dataset.unit] = el; });
    let timer;
    const tick = () => {
      const s = Math.floor((target - Date.now()) / 1000);
      if (!(s > 0)) {
        box.querySelector('.clock').outerHTML = '<p class="clock-done">The celebrations have begun!</p>';
        clearInterval(timer);
        return;
      }
      cells.Days.textContent = String(Math.floor(s / 86400)).padStart(2, '0');
      cells.Hours.textContent = String(Math.floor(s / 3600) % 24).padStart(2, '0');
      cells.Minutes.textContent = String(Math.floor(s / 60) % 60).padStart(2, '0');
      cells.Seconds.textContent = String(s % 60).padStart(2, '0');
    };
    tick();
    timer = setInterval(tick, 1000);
  }

  function startReveal() {
    const items = document.querySelectorAll('.reveal, .write');
    if (root.classList.contains('static') || reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((n) => n.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    items.forEach((n) => io.observe(n));
  }

  function goldDust() {
    if (reduceMotion || root.classList.contains('static')) return;
    for (let k = 0; k < 18; k += 1) {
      const d = document.createElement('span');
      d.className = 'dust';
      d.setAttribute('aria-hidden', 'true');
      d.style.setProperty('--x', `${(Math.random() * 100).toFixed(1)}vw`);
      d.style.setProperty('--s', `${(2 + Math.random() * 3.5).toFixed(1)}px`);
      d.style.setProperty('--dx', `${Math.round(Math.random() * 80 - 40)}px`);
      d.style.setProperty('--t', `${(14 + Math.random() * 12).toFixed(1)}s`);
      d.style.setProperty('--d', `${(-Math.random() * 24).toFixed(1)}s`);
      d.style.animationDelay = `${(-Math.random() * 24).toFixed(1)}s, ${(-Math.random() * 3).toFixed(1)}s`;
      document.body.appendChild(d);
    }
  }

  /* ---------------- soft background music (a song in the repo's music/ folder) ---------------- */

  const music = (() => {
    const src = root.dataset.music;
    if (!src || src.includes('{{')) return null;
    const VOLUME = 0.3;
    const audio = new Audio();
    audio.src = src;
    audio.loop = true;
    audio.preload = 'none';
    let ctx = null;
    let gain = null;
    let wanted = false;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'music-btn';
    btn.hidden = true;
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/>'
      + '<circle cx="17" cy="16" r="3"/><path class="mute" d="M3 3l18 18"/></svg>';
    document.body.appendChild(btn);

    const setUi = () => {
      const on = wanted && !audio.paused;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
    };
    // a gain node gives smooth fades everywhere (iPhones ignore audio.volume)
    const ensureGraph = () => {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (ctx || !AC) return;
      try {
        ctx = new AC();
        gain = ctx.createGain();
        gain.gain.value = 0;
        ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination);
      } catch (_) { ctx = null; gain = null; }
    };
    const fadeTo = (v, secs) => {
      if (!gain) { audio.volume = v; return; }
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(v, t + secs);
    };
    const play = () => {
      wanted = true;
      ensureGraph();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      const p = audio.play();
      if (p && p.then) p.then(() => { fadeTo(VOLUME, 3); setUi(); }).catch(() => { wanted = false; setUi(); });
    };
    const pause = () => {
      wanted = false;
      fadeTo(0, 0.5);
      setTimeout(() => { if (!wanted) audio.pause(); setUi(); }, 550);
    };

    btn.addEventListener('click', () => { if (wanted && !audio.paused) pause(); else play(); });
    audio.addEventListener('playing', setUi);
    audio.addEventListener('pause', setUi);
    // stop when the guest switches apps; carry on when they come back
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) audio.pause();
      else if (wanted) audio.play().catch(() => {});
    });
    return { start() { btn.hidden = false; play(); } };
  })();

  /* ---------------- the cover ---------------- */

  const MESSAGES = {
    nocode: 'This invitation is personal. Please open the link that was sent to you.',
    notfound: "We couldn't find this invitation. Please check the link, or ask the family to send it again.",
    unsupported: 'Please open this link in Chrome or Safari to see your invitation.',
    failed: 'Something went wrong while opening your invitation. Please check your connection and try again.',
  };

  function showCoverMessage(kind) {
    $('#cover-title').textContent = 'Shubh Vivah';
    const when = $('#cover-when');
    when.classList.add('msg');
    when.textContent = MESSAGES[kind] || MESSAGES.failed;
  }

  function armCover(inv) {
    const t = inv.text || {};
    $('#cover-emblem').outerHTML = emblemHtml(t.emblem, initialsOf(inv.couple), 'cover-emblem');
    $('#cover-dear').textContent = `Dear ${inv.guest.name},`;
    $('#cover-title').textContent = t.coverTitle || 'Wedding Invitation';
    $('#cover-when').textContent = inv.dates;
    $('#cover-place').textContent = t.location || '';
    $('#open-btn').hidden = false;
    const open = () => {
      const cover = $('#cover');
      if (!cover || cover.classList.contains('gone')) return;
      cover.classList.add('gone');
      document.body.classList.remove('locked');
      if (music) music.start(); // inside the tap, so phones allow sound
      startReveal();
      setTimeout(() => cover.remove(), 1200);
    };
    $('#cover').addEventListener('click', open);
    if (root.classList.contains('static')) open();
  }

  /* ---------------- temporary theme buttons (Details → theme_buttons) ---------------- */

  function themeBar() {
    if (root.dataset.switcher !== '1' && params.get('themes') !== '1') return;
    const labels = { marigold: 'Ivory', red: 'Royal Red' };
    const swatch = { marigold: '#efdfb9', red: '#8e1b1f' };
    const bar = document.createElement('div');
    bar.className = 'theme-bar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Try a theme');
    bar.innerHTML = THEMES.map((t) => `<button type="button" data-pick="${t}" aria-pressed="${root.dataset.theme === t}">`
      + `<span class="sw" style="background:${swatch[t]}"></span>${labels[t]}</button>`).join('');
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pick]');
      if (!btn) return;
      applyTheme(btn.dataset.pick);
      bar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      const url = new URL(location.href);
      url.searchParams.set('theme', btn.dataset.pick);
      history.replaceState(null, '', url);
    });
    document.body.appendChild(bar);
  }

  /* ---------------- start ---------------- */

  async function main() {
    themeBar();
    $('#cover-lace').innerHTML = mandala('S', false);
    $('#cover-chains').innerHTML = jhalar() + chains();
    $('#cover-div').innerHTML = divider('S');
    const code = getCode();
    let result;
    try {
      result = await loadInvite(code);
    } catch (err) {
      console.error(err);
      result = { error: 'failed' };
    }
    if (!result.invite) { showCoverMessage(result.error); return; }
    render(result.invite, code);
    armCover(result.invite);
    goldDust();
  }

  // someone pasted a different invite code into the address: load that one
  const startCode = getCode();
  window.addEventListener('hashchange', () => {
    const next = getCode();
    if (next !== startCode && /^[a-z0-9]{8,32}$/.test(next)) location.reload();
  });
  main();
})();

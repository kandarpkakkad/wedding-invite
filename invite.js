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
    + '<path class="cn-fill" d="M14 7L21 14 14 21 7 14Z"/>'
    + '<path class="cn-curl" d="M24 6C35 6 41 13 37 19C34 23 28 22 29 17M6 24C6 35 13 41 19 37C23 34 22 28 17 29M37 19C44 12 51 10 58 11M19 37C12 44 10 51 11 58"/>'
    + '<circle class="cn-fill" cx="43" cy="5.5" r="1.3"/><circle class="cn-fill" cx="5.5" cy="43" r="1.3"/><circle class="cn-fill" cx="27" cy="27" r="1.6"/></svg>';

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
    + `<text class="${cls}" x="${ax}" y="${ay}" font-size="${size}" text-anchor="middle" fill="url(#gS)" mask="url(#${id})">${A}</text>`
    + `<text class="${cls}" x="${bx}" y="${by}" font-size="${size}" text-anchor="middle" fill="url(#gS)">${B}</text>`;

  // typefaces for the crest's K and J (Details → logo_font), with each one's size and placement
  const CREST_FONTS = {
    bodoni: { cls: 'lg-bodoni', size: 150, ax: 117, ay: 184, bx: 183, by: 192, gap: 8 },
    cinzel: { cls: 'lg-cinzel', size: 128, ax: 110, ay: 190, bx: 190, by: 190, gap: 7 },
    imperial: { cls: 'lg-imperial', size: 140, ax: 124, ay: 178, bx: 178, by: 182, gap: 8 },
    garamond: { cls: 'lg-serif', size: 146, ax: 122, ay: 180, bx: 178, by: 192, gap: 8 },
  };

  function logo(style, couple, date, fontName) {
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
        + `<text class="lg-date" x="150" y="312" text-anchor="middle">${esc(date)}</text></svg>`;
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
        + `<text class="lg-date" x="150" y="310" text-anchor="middle">${esc(date)}</text></svg>`;
    }
    let dots = '';
    for (let i = 0; i < 48; i += 1) {
      const a = (i * 7.5 * Math.PI) / 180;
      dots += `<circle cx="${r1(150 + 126 * Math.sin(a))}" cy="${r1(150 - 126 * Math.cos(a))}" r="1.2"/>`;
    }
    return `<svg class="logo logo-crest" viewBox="0 0 300 300" ${label}>`
      + '<g fill="none" stroke="url(#gS)"><circle cx="150" cy="150" r="140" stroke-width="1.4"/><circle cx="150" cy="150" r="133" stroke-width=".7"/></g>'
      + `<g fill="url(#gS)">${dots}${lotusMark(150, 11, 1)}${lotusMark(150, 289, -1)}<path d="M8 150l5-5 5 5-5 5zM282 150l5-5 5 5-5 5z"/></g>`
      + (() => { const f = CREST_FONTS[fontName] || CREST_FONTS.bodoni; return pair(id, f.cls, f.size, f.ax, f.ay, f.bx, f.by, A, B, f.gap); })()
      + `<text class="lg-date" x="150" y="244" text-anchor="middle">${esc(date)}</text></svg>`;
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
  const emblemHtml = (emblem, initials, cls) => (emblem
    ? `<span class="${cls} foil"${isDevanagari(emblem) ? ' lang="sa"' : ''}>${esc(emblem)}</span>`
    : `<span class="${cls} initials foil">${esc(initials)}</span>`);

  function eventCard(ev, index, inv) {
    const maps = safeUrl(ev.maps);
    return `<div class="card reveal">
      ${finial()}
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
    const logoFont = CREST_FONTS[fontParam] ? fontParam : (CREST_FONTS[t.logoFont] ? t.logoFont : 'bodoni');

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
            ? `<h1 class="hero-logo reveal" style="--d:.8s"><span class="sr-only">${esc(c.name1)} &amp; ${esc(c.name2)}</span>${logo(logoStyle, c, inv.logoDate || '', logoFont)}</h1>`
            : `<h1 class="hero-title script foil write" style="--d:.8s">${heroTitle}</h1>`}
          <div class="reveal" style="--d:1.3s">${divider('S')}</div>
          <p class="hero-date reveal" style="--d:1.5s">${esc(inv.dates)}</p>
          <button class="cue tiny reveal" style="--d:1.9s" type="button" id="cue">Scroll${ICON.down}</button>
        </div>
        ${diya('l')}${diya('r')}
      </section>

      <section class="couple paper" id="welcome">
        <div class="framed">
          ${corner('tl')}${corner('tr')}${corner('bl')}${corner('br')}
          <div class="mini reveal">${mandala('P', false)}</div>
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
        <div class="lace l1">${mandala('S', false)}</div>
        <div class="lace l2">${mandala('S', false)}</div>
        <p class="kicker reveal">You are warmly invited to</p>
        <h2 class="title foil reveal">${inv.events.length > 1 ? 'Functions &amp; Ceremonies' : 'The Ceremony'}</h2>
        <div class="reveal">${divider('S')}</div>
        <div class="cards">${inv.events.map((ev, i) => eventCard(ev, i, inv)).join('')}</div>
      </section>

      <section class="info paper">
        <div class="framed">
          ${corner('tl')}${corner('tr')}${corner('bl')}${corner('br')}
          <div id="countdown">
            <h2 class="title foil reveal">Counting the Days</h2>
            <p class="sub reveal">until the ${esc(first.name)}</p>
            <div class="clock reveal">
              ${['Days', 'Hours', 'Minutes', 'Seconds'].map((u) => `<div><b class="foil" data-unit="${u}">00</b><span class="tiny">${u}</span></div>`).join('')}
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
        <div class="lace">${mandala('S', false)}</div>
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

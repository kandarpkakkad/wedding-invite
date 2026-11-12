/*
 * Wedding invitation page.
 * Reads the guest's code from the link (#code), decrypts that guest's
 * invitation from guests.json and renders it. Nothing readable is public.
 */
(() => {
  'use strict';

  const THEMES = ['peacock', 'marigold', 'rani', 'midnight'];
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const $ = (sel) => document.querySelector(sel);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const themeParam = (params.get('theme') || '').toLowerCase();
  if (THEMES.includes(themeParam)) root.dataset.theme = themeParam;
  if (!THEMES.includes(root.dataset.theme)) root.dataset.theme = THEMES[0];
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = getComputedStyle(root).getPropertyValue('--band-b').trim() || themeColor.content;
  if (params.get('open') === '1') root.classList.add('static');

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
  const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const toHex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  const repeat = (n, step, offset, fn) => Array.from({ length: n }, (_, i) => fn(offset + i * step)).join('');
  const isDevanagari = (s) => /[ऀ-ॿ]/.test(s || '');

  /* ---------------- ornaments (inline SVG, coloured by the theme) ---------------- */

  function mandala() {
    const rot = (a) => `transform="rotate(${a} 100 100)"`;
    return '<svg class="mandala" viewBox="0 0 200 200" aria-hidden="true">'
      + repeat(32, 11.25, 0, (a) => `<circle class="m-dot" cx="100" cy="5" r="2" ${rot(a)}/>`)
      + repeat(16, 22.5, 0, (a) => `<path class="m-petal" d="M100 44C90 32 91 20 100 10C109 20 110 32 100 44Z" ${rot(a)}/>`)
      + repeat(16, 22.5, 11.25, (a) => `<path class="m-petal2" d="M100 44C96 37 96 31 100 24C104 31 104 37 100 44Z" ${rot(a)}/>`)
      + '<circle class="m-ring" cx="100" cy="100" r="54"/>'
      + repeat(16, 22.5, 11.25, (a) => `<path class="m-in" d="M100 66C95 60 95 54 100 48C105 54 105 60 100 66Z" ${rot(a)}/>`)
      + '<circle class="m-core" cx="100" cy="100" r="34"/>'
      + repeat(8, 45, 0, (a) => `<path class="m-tiny" d="M100 88C97 84 97 80 100 76C103 80 103 84 100 88Z" ${rot(a)}/>`)
      + '</svg>';
  }

  function toran() {
    const W = 400;
    const sag = (x) => 6 + 26 * (x / W) * (1 - x / W);
    let drops = '';
    for (let i = 0; i < 16; i += 1) {
      const x = 12.5 + i * 25;
      const y = (sag(x) + 3).toFixed(1);
      drops += i % 2 === 0
        ? `<g transform="translate(${x} ${y})"><path class="t-leaf" d="M0 0C-8 10-8 26 0 38C8 26 8 10 0 0Z"/><path class="t-vein" d="M0 3V34"/></g>`
        : `<g transform="translate(${x} ${y})"><path class="t-thread" d="M0 0V40"/>`
          + '<circle class="t-f1" cy="12" r="5.5"/><circle class="t-f2" cy="12" r="2.8"/>'
          + '<circle class="t-f1" cy="25" r="5"/><circle class="t-f2" cy="25" r="2.5"/>'
          + '<circle class="t-f1" cy="37" r="4.2"/><path class="t-tassel" d="M-3 41L0 48L3 41Z"/></g>';
    }
    let beads = '';
    for (let i = 0; i <= 44; i += 1) {
      const x = 4 + i * 8.9;
      beads += `<circle class="t-bead ${i % 2 ? 'a' : 'b'}" cx="${x.toFixed(1)}" cy="${sag(x).toFixed(1)}" r="4.4"/>`;
    }
    return `<svg class="toran" viewBox="0 0 400 70" aria-hidden="true">${drops}${beads}</svg>`;
  }

  /* hanging strings of marigolds ending in a temple bell, swaying gently */
  function strings() {
    const flower = (x, y) => `<circle class="s-out" cx="${x}" cy="${y}" r="7.5"/><circle class="s-in" cx="${x}" cy="${y}" r="4.6"/><circle class="s-core" cx="${x}" cy="${y}" r="1.6"/>`;
    const bell = (x, y) => `<path class="s-bell" d="M${x - 7} ${y + 12}C${x - 7} ${y + 2} ${x - 4} ${y} ${x} ${y}C${x + 4} ${y} ${x + 7} ${y + 2} ${x + 7} ${y + 12}L${x + 9} ${y + 15}H${x - 9}Z"/><circle class="s-clapper" cx="${x}" cy="${y + 17.5}" r="2"/>`;
    const columns = [[26, 3], [66, 2], [334, 2], [374, 3]];
    return '<svg class="strings" viewBox="0 0 400 200" aria-hidden="true">' + columns.map(([x, n], i) => {
      let g = '';
      let y = 34;
      for (let k = 0; k < n; k += 1) {
        for (let b = y - 22; b < y - 8; b += 5) g += `<circle class="s-bead" cx="${x}" cy="${b}" r="1.6"/>`;
        g += flower(x, y);
        y += 32;
      }
      for (let b = y - 22; b < y - 10; b += 5) g += `<circle class="s-bead" cx="${x}" cy="${b}" r="1.6"/>`;
      g += bell(x, y - 8);
      return `<g class="sway" style="animation-delay:-${(i * 0.9).toFixed(1)}s">${g}</g>`;
    }).join('') + '</svg>';
  }

  const swirl = () => '<svg class="swirl" viewBox="0 0 170 16" aria-hidden="true">'
    + '<path d="M2 8H66M104 8H168"/>'
    + '<path d="M66 8C72 8 74 2 79 3C84 4 82 11 78 10C75 9 77 5 80 6M104 8C98 8 96 2 91 3C86 4 88 11 92 10C95 9 93 5 90 6"/>'
    + '<circle cx="85" cy="8" r="2.2"/><circle cx="2" cy="8" r="1.4"/><circle cx="168" cy="8" r="1.4"/></svg>';

  const ICON = {
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    down: '<svg width="18" height="10" viewBox="0 0 18 10" aria-hidden="true"><path d="M1 1l8 8 8-8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
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

  const emblemHtml = (emblem, initials, cls) => (emblem
    ? `<span class="${cls}"${isDevanagari(emblem) ? ' lang="sa"' : ''}>${esc(emblem)}</span>`
    : `<span class="${cls} initials">${esc(initials)}</span>`);

  function eventCard(ev, index, inv) {
    const maps = safeUrl(ev.maps);
    return `<div class="card reveal">
      <h3 class="ev-name script">${esc(ev.name)}</h3>
      <p class="caps day">${esc(ev.weekday)}</p>
      <p class="num">${esc(ev.dayNum)}</p>
      <p class="month">${esc(ev.monthYear)}</p>
      <p class="time">${esc(ev.time)}</p>
      ${ev.venue ? `<p class="venue">${esc(ev.venue)}</p>` : ''}
      ${ev.address ? `<p class="address">${esc(ev.address)}</p>` : ''}
      ${ev.dress ? `<p class="dress"><span class="caps">Dress code</span>${esc(ev.dress)}</p>` : ''}
      ${ev.notes ? `<p class="notes">${esc(ev.notes)}</p>` : ''}
      <div class="actions">
        ${maps ? `<a class="pill" href="${esc(maps)}" target="_blank" rel="noopener">${ICON.pin}View on map</a>` : ''}
        <details class="cal">
          <summary class="pill">${ICON.cal}Add to calendar</summary>
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
    const initials = [c.name1, c.name2].map((n) => (n || '').trim().charAt(0).toUpperCase()).filter(Boolean).join(' & ');
    const seats = !g.seats ? ''
      : g.seats === 1 ? 'One seat is reserved in your honour'
        : `${g.seats} seats are reserved in your honour`;
    const rsvp = rsvpUrl(inv, code);
    const contacts = (inv.contacts || []).filter((x) => x.tel);
    const first = inv.events[0];

    $('#invite').innerHTML = `
      <section class="hero">
        ${toran()}
        ${strings()}
        <div class="halo reveal" style="--d:.1s">${mandala()}${emblemHtml(t.emblem, initials, 'emblem')}</div>
        ${t.invocation ? `<p class="invocation write${isDevanagari(t.invocation) ? '' : ' latin'}" style="--d:.5s"${isDevanagari(t.invocation) ? ' lang="sa"' : ''}>${esc(t.invocation)}</p>` : ''}
        <h1 class="hero-title script write" style="--d:.9s">${esc(t.heroTitle || 'Wedding Invitation').replace(/\s+/, '<br>')}</h1>
        <p class="hero-date reveal" style="--d:1.4s">${esc(inv.dates)}</p>
        <a class="cue reveal" style="--d:1.8s" href="#welcome">Scroll${ICON.down}</a>
      </section>

      <section class="invite" id="welcome">
        <div class="mini reveal">${mandala()}</div>
        <p class="dear reveal">Dear ${esc(g.name)},</p>
        ${t.invite ? `<p class="lead reveal">${esc(t.invite)}</p>` : ''}
        <h2 class="person script write">${esc(c.name1)}</h2>
        ${t.parents1 ? `<p class="parents reveal">${esc(t.parents1)}</p>` : ''}
        <p class="and script reveal">${esc(c.joiner || '&')}</p>
        <h2 class="person script write">${esc(c.name2)}</h2>
        ${t.parents2 ? `<p class="parents reveal">${esc(t.parents2)}</p>` : ''}
        <div class="date-orn reveal">${swirl()}<p class="when">${esc(inv.dates)}</p>${swirl()}</div>
        ${t.location ? `<p class="place reveal">${esc(t.location)}</p>` : ''}
        ${seats ? `<p class="seats reveal">${esc(seats)}</p>` : ''}
      </section>

      <section class="events band">
        <div class="lace">${mandala()}</div>
        <div class="lace">${mandala()}</div>
        <h2 class="script reveal">${inv.events.length > 1 ? 'Functions &amp; Ceremonies' : 'The Ceremony'}</h2>
        <div class="cards">${inv.events.map((ev, i) => eventCard(ev, i, inv)).join('')}</div>
      </section>

      <section class="count" id="countdown">
        <h2 class="script reveal">Counting the Days</h2>
        <p class="of reveal">until the ${esc(first.name)}</p>
        <div class="clock reveal">
          ${['Days', 'Hours', 'Mins', 'Secs'].map((u) => `<div><b data-unit="${u}">00</b><span>${u}</span></div>`).join('')}
        </div>
      </section>

      <section class="rsvp">
        <h2 class="script reveal">Kindly Respond</h2>
        ${inv.rsvp && inv.rsvp.deadline ? `<p class="lead reveal">Please let us know if you can join us, by ${esc(inv.rsvp.deadline)}</p>` : ''}
        <div class="reveal">${rsvp
          ? `<a class="pill primary" href="${esc(rsvp)}" target="_blank" rel="noopener">RSVP now</a>`
          : '<button class="pill primary" type="button" id="rsvp-soon">RSVP now</button>'}</div>
      </section>

      ${t.invitedBy || contacts.length ? `<section class="hosts">
        ${t.invitedBy ? `<h2 class="script reveal">Invited By</h2><p class="who reveal">${esc(t.invitedBy)}</p>` : ''}
        ${t.invitedBy && contacts.length ? `<div class="reveal">${swirl()}</div>` : ''}
        ${contacts.length ? `<h2 class="script reveal">Contact</h2>
          <div class="phones">${contacts.map((x) => `<a class="pill reveal" href="tel:${esc(x.tel)}">${x.name ? `<small>${esc(x.name)}</small>` : ''}${esc(x.phone)}</a>`).join('')}</div>` : ''}
      </section>` : '<div style="height:56px"></div>'}

      <section class="foot band">
        <div class="lace">${mandala()}</div>
        ${t.closing ? `<p class="reveal">${esc(t.closing)}</p>` : ''}
        ${t.hashtag ? `<div class="tag reveal">${esc(t.hashtag)}</div>` : ''}
        ${t.signoff ? `<p class="signoff script reveal">${esc(t.signoff)}</p>` : ''}
      </section>`;

    document.title = `${c.name1} ${c.joiner || '&'} ${c.name2}`;

    document.querySelectorAll('[data-ics]').forEach((btn) => {
      btn.addEventListener('click', () => downloadIcs(inv.events[Number(btn.dataset.ics)], inv));
    });
    const soon = $('#rsvp-soon');
    if (soon) soon.addEventListener('click', () => toast('The RSVP form will be available here soon.'));
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
      cells.Mins.textContent = String(Math.floor(s / 60) % 60).padStart(2, '0');
      cells.Secs.textContent = String(s % 60).padStart(2, '0');
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

  function startPetals() {
    if (reduceMotion || root.classList.contains('static')) return;
    for (let k = 0; k < 16; k += 1) {
      const p = document.createElement('span');
      p.className = k % 3 ? 'petal' : 'petal alt';
      p.setAttribute('aria-hidden', 'true');
      p.style.left = `${(Math.random() * 100).toFixed(1)}vw`;
      p.style.setProperty('--dx', `${Math.round(Math.random() * 160 - 80)}px`);
      p.style.animationDuration = `${(9 + Math.random() * 8).toFixed(1)}s`;
      p.style.animationDelay = `${(-Math.random() * 15).toFixed(1)}s`;
      document.body.appendChild(p);
    }
  }

  /* ---------------- the cover ---------------- */

  const MESSAGES = {
    nocode: 'This invitation is personal. Please open the link that was sent to you.',
    notfound: "We couldn't find this invitation. Please check the link, or ask the family to send it again.",
    unsupported: 'Please open this link in Chrome or Safari to see your invitation.',
    failed: 'Something went wrong while opening your invitation. Please check your connection and try again.',
  };

  function showCoverMessage(kind) {
    $('#cover-title').textContent = 'Shubh Vivah';
    $('#cover-when').textContent = MESSAGES[kind] || MESSAGES.failed;
  }

  function armCover(inv) {
    const t = inv.text || {};
    const initials = [inv.couple.name1, inv.couple.name2].map((n) => (n || '').trim().charAt(0).toUpperCase()).filter(Boolean).join(' & ');
    $('#cover-emblem').outerHTML = emblemHtml(t.emblem, initials, 'cover-emblem');
    $('#cover-dear').textContent = `Dear ${inv.guest.name},`;
    $('#cover-when').textContent = [inv.dates, t.location].filter(Boolean).join(' · ');
    const btn = $('#open-btn');
    btn.hidden = false;
    const open = () => {
      const cover = $('#cover');
      if (cover.classList.contains('gone')) return;
      cover.classList.add('gone');
      document.body.classList.remove('locked');
      startReveal();
      setTimeout(() => cover.remove(), 900);
    };
    $('#cover').addEventListener('click', open);
    if (root.classList.contains('static')) open();
  }

  /* ---------------- temporary theme buttons (Details → theme_buttons) ---------------- */

  function themeBar() {
    if (root.dataset.switcher !== '1' && params.get('themes') !== '1') return;
    const labels = { peacock: 'Peacock', marigold: 'Marigold', rani: 'Rani', midnight: 'Midnight' };
    const swatch = { peacock: '#138089', marigold: '#2f7d39', rani: '#c2185b', midnight: '#26387a' };
    const bar = document.createElement('div');
    bar.className = 'theme-bar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Try a theme');
    bar.innerHTML = THEMES.map((t) => `<button type="button" data-pick="${t}" aria-pressed="${root.dataset.theme === t}">`
      + `<span class="sw" style="background:${swatch[t]}"></span>${labels[t]}</button>`).join('');
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pick]');
      if (!btn) return;
      root.dataset.theme = btn.dataset.pick;
      bar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      const url = new URL(location.href);
      url.searchParams.set('theme', btn.dataset.pick);
      history.replaceState(null, '', url);
      if (themeColor) themeColor.content = getComputedStyle(root).getPropertyValue('--band-b').trim();
    });
    document.body.appendChild(bar);
  }

  /* ---------------- start ---------------- */

  async function main() {
    themeBar();
    $('#cover-toran').innerHTML = toran();
    $('#cover-lace').innerHTML = mandala();
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
    startPetals();
  }

  window.addEventListener('hashchange', () => location.reload());
  main();
})();

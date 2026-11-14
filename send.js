/*
 * Private sending page: send.html#ADMIN_KEY
 * Decrypts the guest list with the admin key and gives a one-tap WhatsApp
 * button per invitation. "Sent" ticks are remembered on this device.
 */
(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const root = document.documentElement;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    set(key, on) {
      try { if (on) localStorage.setItem(key, '1'); else localStorage.removeItem(key); } catch (_) { /* private mode */ }
    },
  };

  let toastTimer;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  const notice = (message) => { $('#app').innerHTML = `<p class="notice">${esc(message)}</p>`; };

  // the Pichhwai border, as on the invitation: Details → page_border = pichhwai (in <html data-frame>) and
  // pichhwai_style (in <html data-pichhwai>); ?frame=classic and ?pichhwai=<style> preview the others
  const params = new URLSearchParams(location.search);
  const FRAMES = { classic: 'classic', pichhwai: 'pichhwai', pichwai: 'pichhwai', pichhvai: 'pichhwai', pichvai: 'pichhwai' };
  root.dataset.frame = FRAMES[(params.get('frame') || '').toLowerCase()] || FRAMES[(root.dataset.frame || '').toLowerCase()] || '';
  const withPichhwai = root.dataset.frame === 'pichhwai' && Boolean(window.Pichhwai);
  if (withPichhwai) Pichhwai.choose(params.get('pichhwai'), root.dataset.pichhwai);
  function pichhwaiBands() {
    if (!withPichhwai) return;
    const bands = document.querySelectorAll('.sp-patola');
    bands.forEach((band) => { band.classList.add('pw-band'); band.innerHTML = Pichhwai.SVG; });
    Pichhwai.draw(bands);
  }

  async function decryptList(secret) {
    const res = await fetch(`send.json?v=${encodeURIComponent(root.dataset.build || '')}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`send.json: HTTP ${res.status}`);
    const data = await res.json();
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(data.salt), iterations: data.iter }, material, 384);
    const key = await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['decrypt']);
    const bytes = fromB64(data.data);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
    return JSON.parse(new TextDecoder().decode(plain));
  }

  async function copy(textToCopy) {
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch (_) {
      const area = document.createElement('textarea');
      area.value = textToCopy;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    toast('Message copied');
  }

  const metaOf = (g) => {
    const seats = g.seats === 'all' ? 'All of the family' : g.seats ? `${g.seats} seat${g.seats > 1 ? 's' : ''}` : '';
    return [seats, g.events.join(', ')].filter(Boolean).join(' · ');
  };

  // "Invitation sent to …" notification: bottom-left (bottom on a phone), closes itself
  const NOTE_MS = 4500;
  let noteTimer;
  let noteOut;
  function hideSent() {
    const note = $('#sent-note');
    clearTimeout(noteTimer);
    if (!note || note.hidden) return;
    note.classList.add('is-out');
    clearTimeout(noteOut);
    noteOut = setTimeout(() => { note.hidden = true; note.classList.remove('is-out'); }, 250);
  }
  function showSent(g) {
    const note = $('#sent-note');
    if (!note) { toast(`Invitation sent to ${g.name}`); return; }
    clearTimeout(noteTimer);
    clearTimeout(noteOut);
    note.classList.remove('is-out');
    note.hidden = true;
    void note.offsetWidth; // restart the slide-in and the timer bar
    note.style.setProperty('--sn-time', `${NOTE_MS}ms`);
    $('#sn-name').textContent = g.name;
    $('#sn-meta').textContent = metaOf(g);
    note.hidden = false;
    noteTimer = setTimeout(hideSent, NOTE_MS);
  }

  // small line icons (stroke = currentColor)
  const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    send: icon('<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>'),
    copy: icon('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
    eye: icon('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'),
    phone: icon('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
    people: icon('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
    search: icon('<circle cx="11" cy="11" r="7.5"/><path d="M21 21l-4.6-4.6"/>'),
  };
  // gold rule with a lotus-bud diamond in the middle
  const DIVIDER = `<svg class="sp-divider" viewBox="0 0 220 16" aria-hidden="true"><g fill="currentColor">
    <path d="M0 8h86" stroke="currentColor" stroke-width=".8" opacity=".7"/><path d="M134 8h86" stroke="currentColor" stroke-width=".8" opacity=".7"/>
    <circle cx="92" cy="8" r="1.6"/><circle cx="128" cy="8" r="1.6"/>
    <path d="M110 1l6 7-6 7-6-7z"/><path d="M110 4.6l2.9 3.4-2.9 3.4-2.9-3.4z" fill="#fff4d6" opacity=".55"/>
    <path d="M98 8c3-3.2 6-3.2 8 0-2 3.2-5 3.2-8 0zM122 8c-3-3.2-6-3.2-8 0 2 3.2 5 3.2 8 0z" opacity=".85"/></g></svg>`;

  function render(list) {
    const isSent = (g) => Boolean(g.sent) || store.get(`sent:${g.code}`) === '1';
    const seatsOf = (g) => (g.seats === 'all' ? 'All of the family' : g.seats ? `${g.seats} seat${g.seats > 1 ? 's' : ''}` : '');
    $('#app').innerHTML = `
      <header class="sp-head">
        <img class="sp-crest" src="crest.svg?v=${esc(root.dataset.build || '')}" alt="" width="148" height="139">
        <h1 class="sp-title script foil">Send Invitations</h1>
        <p class="sp-sub">Private guest list</p>
        ${DIVIDER}
        <div class="sp-stats" id="summary" aria-live="polite">
          <div class="sp-stat"><b class="foil" id="st-total">0</b><span>Invitations</span></div>
          <div class="sp-stat"><b class="foil" id="st-sent">0</b><span>Sent</span></div>
          <div class="sp-stat"><b class="foil" id="st-left">0</b><span>To send</span></div>
        </div>
        <div class="sp-progress" aria-hidden="true"><i id="st-bar"></i></div>
      </header>
      <div class="tools">
        <div class="search">${ICONS.search}<input type="search" id="search" placeholder="Search names" aria-label="Search names" autocomplete="off"></div>
        <label><input type="checkbox" id="hide-sent"> Hide sent</label>
      </div>
      <div id="rows">${list.map((g, i) => {
        const whatsapp = `https://wa.me/${g.phone}?text=${encodeURIComponent(g.message)}`;
        const seats = seatsOf(g);
        return `<article class="guest-row${withPichhwai ? ' pw-img' : ''}${isSent(g) ? ' is-sent' : ''}" data-i="${i}">
          <div class="row-head">
            <div>
              <div class="row-name">${esc(g.name)}</div>
              ${seats ? `<div class="row-seats">${ICONS.people}${esc(seats)}</div>` : ''}
            </div>
            <label class="sent-toggle"><input type="checkbox" data-sent="${i}"${isSent(g) ? ' checked' : ''}${g.sent ? ' disabled title="Marked Yes in the workbook"' : ''}> Sent</label>
          </div>
          ${g.events.length ? `<div class="row-events">${g.events.map((e) => `<span class="ev-chip">${esc(e)}</span>`).join('')}</div>` : ''}
          <div class="row-phone">${ICONS.phone}${g.phone ? `+${esc(g.phone)}` : 'No number: pick the contact in WhatsApp'}</div>
          <div class="row-actions">
            <a class="btn btn-wa" href="${esc(whatsapp)}" target="_blank" rel="noopener">${ICONS.send}Send on WhatsApp</a>
            <button class="btn" type="button" data-copy="${i}">${ICONS.copy}<span>Copy<span class="wide"> message</span></span></button>
            <a class="btn btn-preview" href="${esc(g.link)}" target="_blank" rel="noopener">${ICONS.eye}Preview</a>
          </div>
        </article>`;
      }).join('')}</div>
      ${DIVIDER}
      <p class="hint">Sent invitations move to the end and their WhatsApp button is switched off. Untick Sent to send again.<br>Ticks are saved on this device only. Also set Sent to Yes in the workbook to keep a permanent record.</p>`;

    const rows = Array.from(document.querySelectorAll('.guest-row'));
    if (withPichhwai) Pichhwai.draw(rows);
    const box = $('#rows');
    const update = () => {
      const q = $('#search').value.trim().toLowerCase();
      const hideSent = $('#hide-sent').checked;
      let sent = 0;
      rows.forEach((row) => {
        const g = list[Number(row.dataset.i)];
        const done = isSent(g);
        if (done) sent += 1;
        row.classList.toggle('is-sent', done);
        row.hidden = (q && !g.name.toLowerCase().includes(q)) || (hideSent && done);
        // a sent invitation's WhatsApp button stops working until Sent is unticked (Copy and Preview stay on)
        const wa = row.querySelector('.btn-wa');
        if (done) { wa.setAttribute('aria-disabled', 'true'); wa.setAttribute('tabindex', '-1'); }
        else { wa.removeAttribute('aria-disabled'); wa.removeAttribute('tabindex'); }
      });
      // not-yet-sent first, sent ones at the end; each group keeps the workbook order
      const order = rows.slice().sort((a, b) => (
        (isSent(list[Number(a.dataset.i)]) - isSent(list[Number(b.dataset.i)])) || (a.dataset.i - b.dataset.i)));
      if (order.some((row, k) => box.children[k] !== row)) order.forEach((row) => box.appendChild(row));
      $('#st-total').textContent = list.length;
      $('#st-sent').textContent = sent;
      $('#st-left').textContent = list.length - sent;
      $('#st-bar').style.width = `${list.length ? Math.round((sent / list.length) * 100) : 0}%`;
    };

    $('#rows').addEventListener('change', (e) => {
      const i = e.target.dataset.sent;
      if (i === undefined) return;
      const g = list[Number(i)];
      store.set(`sent:${g.code}`, e.target.checked);
      update();
      if (e.target.checked) showSent(g);
      else { hideSent(); toast(`${g.name} is back in the list to send`); }
    });
    $('#rows').addEventListener('click', (e) => {
      const off = e.target.closest('.row-actions [aria-disabled="true"]');
      if (off) { e.preventDefault(); return; }
      const btn = e.target.closest('[data-copy]');
      if (btn) copy(list[Number(btn.dataset.copy)].message);
    });
    const close = document.querySelector('#sent-note .sn-close');
    if (close) close.addEventListener('click', hideSent);
    $('#search').addEventListener('input', update);
    $('#hide-sent').addEventListener('change', update);
    update();
  }

  async function main() {
    pichhwaiBands();
    const secret = decodeURIComponent(location.hash.slice(1)).trim();
    if (!secret) { notice('Open this page with your private sending link (Details → send_page in the workbook).'); return; }
    if (!window.crypto || !crypto.subtle) { notice('Please open this page in Chrome or Safari.'); return; }
    try {
      render(await decryptList(secret));
    } catch (err) {
      console.error(err);
      notice("This sending link isn't valid. Copy it again from Details → send_page in the workbook.");
    }
  }

  window.addEventListener('hashchange', () => location.reload());
  main();
})();

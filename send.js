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

  // "Invitation sent to …" confirmation, shown when a guest is ticked as sent
  function showSent(g) {
    const box = $('#sent-dialog');
    $('#sd-name').textContent = g.name;
    $('#sd-meta').textContent = metaOf(g);
    if (box && typeof box.showModal === 'function') {
      if (!box.open) box.showModal();
      box.querySelector('button').focus();
    } else {
      window.alert(`Invitation sent to ${g.name}`);
    }
  }

  function render(list) {
    const isSent = (g) => Boolean(g.sent) || store.get(`sent:${g.code}`) === '1';
    $('#app').innerHTML = `
      <h1>Send invitations</h1>
      <p class="summary" id="summary"></p>
      <div class="tools">
        <input type="search" id="search" placeholder="Search names" aria-label="Search names" autocomplete="off">
        <label><input type="checkbox" id="hide-sent"> Hide sent</label>
      </div>
      <div id="rows">${list.map((g, i) => {
        const whatsapp = `https://wa.me/${g.phone}?text=${encodeURIComponent(g.message)}`;
        return `<article class="guest-row${isSent(g) ? ' is-sent' : ''}" data-i="${i}">
          <div class="row-head">
            <div>
              <div class="row-name">${esc(g.name)}</div>
              <div class="row-meta">${esc(metaOf(g))}</div>
              <div class="row-meta">${g.phone ? `+${esc(g.phone)}` : 'No number: pick the contact in WhatsApp'}</div>
            </div>
            <label class="sent-toggle"><input type="checkbox" data-sent="${i}"${isSent(g) ? ' checked' : ''}${g.sent ? ' disabled title="Marked Yes in the workbook"' : ''}> Sent</label>
          </div>
          <div class="row-actions">
            <a class="btn btn-wa" href="${esc(whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>
            <button class="btn" type="button" data-copy="${i}">Copy</button>
            <a class="btn" href="${esc(g.link)}" target="_blank" rel="noopener">Preview</a>
          </div>
        </article>`;
      }).join('')}</div>
      <p class="hint">Sent invitations move to the end and their buttons are switched off. Untick Sent to use them again.<br>Ticks are saved on this device only. Also set Sent to Yes in the workbook to keep a permanent record.</p>`;

    const rows = Array.from(document.querySelectorAll('.guest-row'));
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
        // a sent invitation's buttons stop working until Sent is unticked
        row.querySelectorAll('.row-actions .btn').forEach((b) => {
          if (b.tagName === 'BUTTON') b.disabled = done;
          else if (done) { b.setAttribute('aria-disabled', 'true'); b.setAttribute('tabindex', '-1'); }
          else { b.removeAttribute('aria-disabled'); b.removeAttribute('tabindex'); }
        });
      });
      // not-yet-sent first, sent ones at the end; each group keeps the workbook order
      const order = rows.slice().sort((a, b) => (
        (isSent(list[Number(a.dataset.i)]) - isSent(list[Number(b.dataset.i)])) || (a.dataset.i - b.dataset.i)));
      if (order.some((row, k) => box.children[k] !== row)) order.forEach((row) => box.appendChild(row));
      const left = list.length - sent;
      $('#summary').textContent = `${list.length} invitation${list.length === 1 ? '' : 's'} · ${sent} sent · ${left} to send`;
    };

    $('#rows').addEventListener('change', (e) => {
      const i = e.target.dataset.sent;
      if (i === undefined) return;
      const g = list[Number(i)];
      store.set(`sent:${g.code}`, e.target.checked);
      update();
      if (e.target.checked) showSent(g);
      else toast(`${g.name} is back in the list to send`);
    });
    $('#rows').addEventListener('click', (e) => {
      const off = e.target.closest('.row-actions [aria-disabled="true"], .row-actions [disabled]');
      if (off) { e.preventDefault(); return; }
      const btn = e.target.closest('[data-copy]');
      if (btn) copy(list[Number(btn.dataset.copy)].message);
    });
    const dlg = $('#sent-dialog');
    if (dlg) dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    $('#search').addEventListener('input', update);
    $('#hide-sent').addEventListener('change', update);
    update();
  }

  async function main() {
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

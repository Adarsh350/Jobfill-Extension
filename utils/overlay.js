// JobFill — utils/overlay.js
// Fill status overlay (Shadow DOM) — Phase 6
window.JobFill = window.JobFill || {};

window.JobFill.overlay = (function () {
  'use strict';

  // --- Private state ---
  let _host = null;       // div#jobfill-overlay-host appended to document.body
  let _shadow = null;     // ShadowRoot (mode: 'open')
  let _container = null;  // div.jf-root inside shadow — only this gets innerHTML-cleared
  let _obs = null;        // MutationObserver reference for disconnect on dismiss

  // --- Status colour mapping ---
  const STATUS_COLORS = {
    filled:       '#22c55e',
    skipped:      '#eab308',
    failed:       '#ef4444',
    needs_review: '#f97316',
  };

  // --- CSS injected once into the shadow root ---
  const OVERLAY_CSS = `
*, *::before, *::after { box-sizing: border-box; }
.jf-panel { background:#fff; border:1px solid #e5e7eb; border-radius:8px;
            box-shadow:0 4px 12px rgba(0,0,0,.15); min-width:280px; max-width:360px; overflow:hidden; }
.jf-header { display:flex; justify-content:space-between; align-items:center;
             padding:8px 12px; background:#6366f1; color:#fff; border-radius:8px 8px 0 0;
             cursor:move; user-select:none; font-size:13px; font-weight:600; }
.jf-close { background:none; border:none; color:#fff; cursor:pointer; font-size:18px;
            padding:0 0 0 8px; line-height:1; }
.jf-body { padding:4px 0; max-height:300px; overflow-y:auto; }
.jf-row { display:flex; gap:8px; padding:6px 12px; border-bottom:1px solid #f3f4f6;
          font-size:12px; align-items:flex-start; }
.jf-row:last-child { border-bottom:none; }
.jf-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:3px; }
.jf-field { font-weight:600; flex-shrink:0; min-width:80px; }
.jf-value { color:#6b7280; word-break:break-word; }
.jf-row-clickable { cursor:pointer; }
.jf-row-clickable:hover { background:#fff7ed; }
.jf-btn { display:block; width:calc(100% - 24px); margin:10px 12px;
          padding:9px 0; background:#6366f1; color:#fff; border:none; border-radius:6px;
          font-size:14px; font-weight:600; cursor:pointer; text-align:center; }
.jf-btn:hover { background:#4f46e5; }
.jf-banner { padding:8px 12px; background:#fef3c7; color:#92400e; font-size:12px;
             border-radius:8px; }
`;

  // --- _ensureHost() — idempotent Shadow DOM setup ---
  function _ensureHost() {
    if (_host !== null) return; // already mounted

    _host = document.createElement('div');
    _host.id = 'jobfill-overlay-host';
    _host.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483647;font-family:system-ui,sans-serif;';
    document.body.appendChild(_host);

    _shadow = _host.attachShadow({ mode: 'open' });

    // Style tag goes directly into shadow root — never cleared
    var styleEl = document.createElement('style');
    styleEl.textContent = OVERLAY_CSS;
    _shadow.appendChild(styleEl);

    // Container is the only element whose innerHTML gets cleared
    _container = document.createElement('div');
    _container.className = 'jf-root';
    _shadow.appendChild(_container);
  }

  // --- _loadPosition() — restore saved position asynchronously ---
  function _loadPosition() {
    window.JobFill.storage.getSettings().then(function (s) {
      if (!_host) return; // dismissed before load completed
      if (s && s.overlayRight)  _host.style.right  = s.overlayRight;
      if (s && s.overlayBottom) _host.style.bottom = s.overlayBottom;
    }).catch(function () {});
  }

  // --- _makeDraggable(headerEl) ---
  function _makeDraggable(headerEl) {
    headerEl.addEventListener('mousedown', function (e) {
      e.preventDefault();
      var startX = e.clientX, startY = e.clientY;
      var origRight  = parseInt(_host.style.right)  || 16;
      var origBottom = parseInt(_host.style.bottom) || 16;

      function onMove(ev) {
        _host.style.right  = Math.max(0, origRight  - (ev.clientX - startX)) + 'px';
        _host.style.bottom = Math.max(0, origBottom + (ev.clientY - startY)) + 'px';
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        // Persist position
        window.JobFill.storage.getSettings().then(function (s) {
          s = s || {};
          s.overlayRight  = _host.style.right;
          s.overlayBottom = _host.style.bottom;
          return window.JobFill.storage.saveSettings(s);
        }).catch(function (err) { console.warn('[JobFill overlay]', err.message); });
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // --- showButton(onFill) ---
  function showButton(onFill) {
    _ensureHost();

    // If results panel already showing, do nothing — let user dismiss first
    if (_container.querySelector('.jf-panel')) return;

    _container.innerHTML = '';

    var panel = document.createElement('div');
    panel.className = 'jf-panel';

    var header = document.createElement('div');
    header.className = 'jf-header';
    header.textContent = '\u2728 Fill Form';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'jf-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.setAttribute('aria-label', 'Dismiss');
    closeBtn.addEventListener('click', function () { dismiss(); });
    header.appendChild(closeBtn);

    _makeDraggable(header);

    var btn = document.createElement('button');
    btn.className = 'jf-btn';
    btn.textContent = '\u2728 Fill Form';
    btn.addEventListener('click', function () { onFill(); });

    panel.appendChild(header);
    panel.appendChild(btn);
    _container.appendChild(panel);

    _loadPosition();
  }

  // --- showResults(results) ---
  function showResults(results) {
    _ensureHost();
    _container.innerHTML = '';

    // Build count summary string
    var counts = {};
    (results || []).forEach(function (r) {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    var summaryParts = [];
    ['filled', 'skipped', 'failed', 'needs_review'].forEach(function (s) {
      if (counts[s]) summaryParts.push(counts[s] + ' ' + s.replace('_', ' '));
    });
    var summaryText = summaryParts.join(' \u00B7 ');

    var panel = document.createElement('div');
    panel.className = 'jf-panel';

    // Header
    var header = document.createElement('div');
    header.className = 'jf-header';

    var titleSpan = document.createElement('span');
    titleSpan.textContent = '\u2728 JobFill Results';

    var countSpan = document.createElement('span');
    countSpan.style.cssText = 'font-size:11px;font-weight:400;opacity:0.9;margin:0 6px;';
    countSpan.textContent = summaryText;

    var closeBtn = document.createElement('button');
    closeBtn.className = 'jf-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.setAttribute('aria-label', 'Dismiss');
    closeBtn.addEventListener('click', function () { dismiss(); });

    header.appendChild(titleSpan);
    header.appendChild(countSpan);
    header.appendChild(closeBtn);
    _makeDraggable(header);

    // Body with rows
    var body = document.createElement('div');
    body.className = 'jf-body';

    (results || []).forEach(function (entry) {
      var row = document.createElement('div');
      row.className = 'jf-row';

      var dot = document.createElement('span');
      dot.className = 'jf-dot';
      dot.style.background = STATUS_COLORS[entry.status] || '#9ca3af';

      var field = document.createElement('span');
      field.className = 'jf-field';
      field.textContent = entry.field || '';

      var value = document.createElement('span');
      value.className = 'jf-value';
      var valueText;
      if (entry.value) {
        valueText = entry.value.length > 40 ? entry.value.slice(0, 40) + '\u2026' : entry.value;
      } else if (entry.reason) {
        valueText = entry.reason;
      } else {
        valueText = entry.status;
      }
      value.textContent = valueText;

      if (entry.status === 'needs_review') {
        row.className += ' jf-row-clickable';
        row.addEventListener('click', function () {
          try {
            chrome.runtime.sendMessage({ type: 'OPEN_ANSWER_BANK', id: entry.id || entry.field });
          } catch (err) {
            console.warn('[JobFill overlay]', err.message);
          }
        });
      }

      row.appendChild(dot);
      row.appendChild(field);
      row.appendChild(value);
      body.appendChild(row);
    });

    panel.appendChild(header);
    panel.appendChild(body);
    _container.appendChild(panel);

    _loadPosition();
  }

  // --- showBanner(message) ---
  function showBanner(message) {
    _ensureHost();
    _container.innerHTML = '';

    var banner = document.createElement('div');
    banner.className = 'jf-banner';
    banner.textContent = message;
    _container.appendChild(banner);
  }

  // --- setObserverRef(obs) ---
  function setObserverRef(obs) {
    _obs = obs;
  }

  // --- dismiss() ---
  function dismiss() {
    if (_obs) { _obs.disconnect(); _obs = null; }
    if (_host) { _host.remove(); _host = null; _shadow = null; _container = null; }
  }

  // --- Public API ---
  return { showButton, showResults, showBanner, dismiss, setObserverRef };

})();

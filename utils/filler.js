// JobFill — utils/filler.js
// Fill dispatcher, DOM utilities, fill lock — window.JobFill.filler
// Phase 4: Depends on utils/events.js being loaded first
// Requires: window.JobFill.events
window.JobFill = window.JobFill || {};

window.JobFill.filler = (function () {
  'use strict';

  const _state = { filling: false };

  function isFilling() { return _state.filling; }

  function startFill() {
    if (_state.filling) return false;
    _state.filling = true;
    return true;
  }

  function endFill() {
    _state.filling = false;
  }

  function fillField(el, value) {
    const tag  = el.tagName.toLowerCase();
    const type = (el.type || '').toLowerCase();
    const ev   = window.JobFill.events;

    if (tag === 'textarea')                     return ev.fillTextarea(el, value);
    if (tag === 'select')                       return ev.fillSelect(el, value);
    if (tag === 'input' && type === 'checkbox') return ev.fillCheckbox(el, value);
    if (tag === 'input' && type === 'radio')    return ev.fillRadio(el);
    // Phase 11: callers that need the result must await this branch (returns a Promise)
    if (tag === 'input' && type === 'file')     return attachResume(el);
    if (tag === 'input')                        return ev.fillInput(el, value);
    if (el.isContentEditable) {
      el.textContent = value;
      ev.dispatchInputChange(el);
      return true;
    }
    return false;
  }

  // --- Resume Upload Primitives (Phase 11) ---

  function dataUrlToFile(dataUrl, filename, mimeType) {
    var parts = dataUrl.split(',');
    var b64 = parts[1];
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([bytes], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  }

  function getUniqueSelector(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    if (el.name) return 'input[name="' + el.name + '"]';
    var all = Array.from(document.querySelectorAll('input[type="file"]'));
    var idx = all.indexOf(el);
    return 'input[type="file"]:nth-of-type(' + (idx + 1) + ')';
  }

  function findResumeFileInput(root) {
    root = root || document;
    var inputs = Array.from(root.querySelectorAll('input[type="file"]'));
    if (inputs.length === 0) return null;
    if (inputs.length === 1) return inputs[0];
    var RESUME_KEYWORDS = ['resume', 'cv', 'curriculum', 'upload', 'document'];
    function scoreInput(el) {
      var label = el.closest ? el.closest('label') : null;
      var text = [
        el.name || '',
        el.id || '',
        el.getAttribute('aria-label') || '',
        el.accept || '',
        label ? (label.textContent || '') : '',
      ].join(' ').toLowerCase();
      var score = 0;
      for (var k = 0; k < RESUME_KEYWORDS.length; k++) {
        if (text.indexOf(RESUME_KEYWORDS[k]) !== -1) score++;
      }
      return score;
    }
    var scored = inputs.map(function (el) { return { el: el, score: scoreInput(el) }; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored[0].el;
  }

  async function attachResume(inputEl) {
    var resume = await window.JobFill.storage.getResume();
    if (!resume) return { status: 'skipped', reason: 'no_resume_stored' };
    if (resume.size > 5 * 1024 * 1024) return { status: 'failed', reason: 'resume_too_large' };
    var file = dataUrlToFile(resume.dataUrl, resume.name, resume.mimeType);
    var dt = new DataTransfer();
    dt.items.add(file);
    inputEl.files = dt.files;
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    if (inputEl.files.length > 0) {
      return { status: 'filled', field: inputEl.name || inputEl.id || 'file' };
    }
    // files.length === 0: React cross-world isolation — caller must send RESUME_UPLOAD_FALLBACK
    // Background handler returns { status: 'filled_via_main_world' } on success via MAIN world injection
    return null;
  }

  function shadowQuery(root, selector) {
    const direct = root.querySelector(selector);
    if (direct) return direct;
    const all = root.querySelectorAll('*');
    for (const el of all) {
      if (el.shadowRoot) {
        const found = shadowQuery(el.shadowRoot, selector);
        if (found) return found;
      }
    }
    return null;
  }

  function shadowQueryAll(root, selector) {
    const results = Array.from(root.querySelectorAll(selector));
    const all = root.querySelectorAll('*');
    for (const el of all) {
      if (el.shadowRoot) {
        results.push(...shadowQueryAll(el.shadowRoot, selector));
      }
    }
    return results;
  }

  function waitForElement(selector, timeout, root) {
    if (timeout === undefined) timeout = 3000;
    if (root === undefined)    root = document;
    return new Promise(function (resolve, reject) {
      const immediate = root.querySelector(selector);
      if (immediate) { resolve(immediate); return; }

      const deadline = Date.now() + timeout;
      const observer = new MutationObserver(function () {
        const found = root.querySelector(selector);
        if (found) {
          observer.disconnect();
          resolve(found);
          return;
        }
        if (Date.now() > deadline) {
          observer.disconnect();
          reject(new Error('waitForElement: "' + selector + '" not found within ' + timeout + 'ms'));
        }
      });
      observer.observe(root, { childList: true, subtree: true });
      setTimeout(function () {
        observer.disconnect();
        reject(new Error('waitForElement: "' + selector + '" timed out after ' + timeout + 'ms'));
      }, timeout);
    });
  }

  return {
    fillField,
    waitForElement,
    shadowQuery,
    shadowQueryAll,
    isFilling,
    startFill,
    endFill,
    attachResume,
    findResumeFileInput,
    dataUrlToFile,
    getUniqueSelector,
  };
})();

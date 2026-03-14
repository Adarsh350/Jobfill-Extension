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
    if (tag === 'input' && type === 'file')     return false; // Phase 11 scope
    if (tag === 'input')                        return ev.fillInput(el, value);
    if (el.isContentEditable) {
      el.textContent = value;
      ev.dispatchInputChange(el);
      return true;
    }
    return false;
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
  };
})();

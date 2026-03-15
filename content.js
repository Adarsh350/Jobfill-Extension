// JobFill — content.js
// Content script coordinator — IIFE boots platform detection, message listener,
// MutationObserver, fill lock, and initial overlay render.
// Phase 6: Depends on utils/storage.js, utils/filler.js, utils/overlay.js being injected first.

(function () {
  'use strict';

  window.JobFill = window.JobFill || {};

  // --- 1. Platform detection (at init time) ---
  var hostname  = window.location.hostname;
  var platforms = window.JobFill.platforms || {};
  var _platform = Object.values(platforms).find(function (p) {
    return p.matches(hostname);
  }) || null;

  // --- 2. safeRuntimeCall helper ---
  // Wraps any chrome.runtime call in try/catch.
  // On "Extension context invalidated": shows reload banner.
  // On other errors: console.warn.
  function safeRuntimeCall(fn) {
    try {
      return fn();
    } catch (err) {
      if (err.message && err.message.includes('Extension context invalidated')) {
        window.JobFill.overlay.showBanner('JobFill was updated — please reload this tab.');
      } else {
        console.warn('[JobFill]', err.message);
      }
      return null;
    }
  }

  // --- 3. runFill (async) ---
  async function runFill() {
    // Fill lock — startFill() returns false if already filling
    if (!window.JobFill.filler.startFill()) {
      return { error: 'fill_in_progress' };
    }
    var results;
    try {
      var profile = await window.JobFill.storage.getProfile();
      if (!profile) {
        return { error: 'no_profile' };
      }
      if (_platform) {
        var answerBank = await window.JobFill.storage.getAnswerBank();
        results = await _platform.fill(profile, answerBank);
      } else {
        results = [{
          field: 'Platform',
          status: 'skipped',
          reason: 'No platform module loaded for ' + hostname,
        }];
      }
      await window.JobFill.storage.saveFillStatus(window._jobfillTabId || null, results);
      window.JobFill.overlay.showResults(results);
      return { ok: true, count: results.length };
    } catch (err) {
      return { error: err.message };
    } finally {
      window.JobFill.filler.endFill();
    }
  }

  // --- 4. onMessage listener (NON-ASYNC — mandatory, must return true synchronously) ---
  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    try {
      if (msg.type === 'DO_FILL') {
        // Capture tabId from message for use in saveFillStatus
        if (msg.tabId) window._jobfillTabId = msg.tabId;
        if (window.JobFill.filler.isFilling()) {
          sendResponse({ error: 'fill_in_progress' });
          return true;
        }
        runFill().then(sendResponse).catch(function (err) {
          sendResponse({ error: err.message });
        });
        return true; // MANDATORY — keeps async response channel open
      }
    } catch (err) {
      if (err.message && err.message.includes('Extension context invalidated')) {
        window.JobFill.overlay.showBanner('JobFill was updated — please reload this tab.');
      } else {
        console.warn('[JobFill content]', err.message);
      }
    }
  });

  // --- 5. MutationObserver for SPA navigation ---
  // NFR-3.1: NO chrome.storage.* or window.JobFill.storage.* calls inside callback.
  // Guard: ignore mutations caused by own overlay DOM (#jobfill-overlay-host).
  var _observer = new MutationObserver(function (mutations) {
    var hasNewInputs = mutations.some(function (m) {
      return Array.from(m.addedNodes).some(function (n) {
        if (n.nodeType !== 1) return false;
        // Infinite loop guard — skip own overlay DOM changes
        if (n.closest && n.closest('#jobfill-overlay-host')) return false;
        return n.matches('input,select,textarea') ||
          !!n.querySelector('input,select,textarea');
      });
    });
    // Only show button if overlay host is not already mounted
    if (hasNewInputs && !document.getElementById('jobfill-overlay-host')) {
      window.JobFill.overlay.showButton(runFill);
    }
  });
  _observer.observe(document.body, { childList: true, subtree: true });
  window.JobFill.overlay.setObserverRef(_observer);

  // --- 6. Initial render ---
  window.JobFill.overlay.showButton(runFill);

})();

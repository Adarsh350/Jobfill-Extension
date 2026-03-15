// JobFill — platforms/linkedin.js
// Phase 09-03 — LinkedIn Easy Apply platform module
// Registers: window.JobFill.platforms.linkedin

window.JobFill = window.JobFill || {};
window.JobFill.platforms = window.JobFill.platforms || {};

window.JobFill.platforms.linkedin = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Modal scope prefix — ALL field selectors are scoped inside the modal
  // ---------------------------------------------------------------------------
  var MODAL_SCOPE = '.jobs-easy-apply-modal ';

  // ---------------------------------------------------------------------------
  // Field descriptor table
  // ---------------------------------------------------------------------------
  var FIELDS = [
    {
      label: 'Phone',
      profileKey: 'phone',
      selectors: [
        MODAL_SCOPE + 'input[id*="phoneNumber"]',
        MODAL_SCOPE + 'input[type="tel"]',
      ],
    },
    {
      label: 'Email',
      profileKey: 'email',
      selectors: [
        MODAL_SCOPE + 'input[id*="email"]',
        MODAL_SCOPE + 'input[type="email"]',
      ],
    },
    {
      label: 'First Name',
      profileKey: 'firstName',
      selectors: [
        MODAL_SCOPE + 'input[id*="firstName"]',
        MODAL_SCOPE + 'input[autocomplete="given-name"]',
      ],
    },
    {
      label: 'Last Name',
      profileKey: 'lastName',
      selectors: [
        MODAL_SCOPE + 'input[id*="lastName"]',
        MODAL_SCOPE + 'input[autocomplete="family-name"]',
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // matches(hostname) — returns true for LinkedIn hostnames
  // ---------------------------------------------------------------------------
  function matches(hostname) {
    return hostname.indexOf('linkedin.com') !== -1;
  }

  // ---------------------------------------------------------------------------
  // resolveSelector(selectors) — tries each selector, returns first found el
  // ---------------------------------------------------------------------------
  function resolveSelector(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      try {
        var el = document.querySelector(selectors[i]);
        if (el) return el;
      } catch (e) { /* invalid selector in this context */ }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // hasValue(el) — true if the element already has user-supplied content
  // ---------------------------------------------------------------------------
  function hasValue(el) {
    if (!el) return false;
    if (el.tagName === 'SELECT') {
      return el.value !== '' && el.selectedIndex > 0;
    }
    return !!(el.value && el.value.trim() !== '');
  }

  // ---------------------------------------------------------------------------
  // sleep(ms) — per-field async delay to avoid bot detection
  // ---------------------------------------------------------------------------
  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  // ---------------------------------------------------------------------------
  // isEasyApplyContext() — true only when LinkedIn Easy Apply modal is present
  // ---------------------------------------------------------------------------
  function isEasyApplyContext() {
    return !!document.querySelector('.jobs-easy-apply-modal');
  }

  // ---------------------------------------------------------------------------
  // getJobDetails() — parse LinkedIn title: "Job Title at Company | LinkedIn"
  // ---------------------------------------------------------------------------
  function getJobDetails() {
    var companyName = '';
    var jobTitle = '';

    try {
      var title = document.title || '';
      var m = title.match(/^(.+?)\s+at\s+(.+?)\s*\|/i);
      if (m) {
        jobTitle    = m[1].trim();
        companyName = m[2].trim();
      } else {
        var parts = title.split(' | ');
        if (parts.length >= 1) {
          jobTitle = parts[0].trim();
        }
      }
    } catch (e) { /* skip */ }

    return { companyName: companyName, jobTitle: jobTitle };
  }

  // ---------------------------------------------------------------------------
  // fillStandardFields — async loop with per-field delay between fills
  // ---------------------------------------------------------------------------
  async function fillStandardFields(profile, results, handledEls) {
    for (var i = 0; i < FIELDS.length; i++) {
      var field = FIELDS[i];
      var el = resolveSelector(field.selectors);

      if (!el) {
        results.push({
          field: field.label,
          status: 'skipped',
          reason: 'element not found',
        });
        await sleep(50 + Math.random() * 150);
        continue;
      }

      handledEls.add(el);

      if (hasValue(el)) {
        results.push({
          field: field.label,
          status: 'skipped',
          reason: 'already has value',
        });
        await sleep(50 + Math.random() * 150);
        continue;
      }

      var value = field.profileKey && profile[field.profileKey];
      if (!value) {
        results.push({
          field: field.label,
          status: 'skipped',
          reason: 'no profile value',
        });
        await sleep(50 + Math.random() * 150);
        continue;
      }

      var filled = window.JobFill.filler.fillField(el, value);
      if (filled) {
        results.push({ field: field.label, status: 'filled', value: value });
      } else {
        results.push({ field: field.label, status: 'failed', reason: 'fillField returned false' });
      }

      await sleep(50 + Math.random() * 150);
    }
  }

  // ---------------------------------------------------------------------------
  // fill(profile, answerBank) — main entry point
  // CRITICAL: zero .click() calls — no button interactions of any kind.
  // ---------------------------------------------------------------------------
  async function fill(profile, answerBank) {
    if (!isEasyApplyContext()) {
      return [];
    }

    var results = [];
    var handledEls = new Set();

    await fillStandardFields(profile, results, handledEls);

    var modal = document.querySelector('.jobs-easy-apply-modal');
    if (modal) {
      var observer = new MutationObserver(function () {
        fillStandardFields(profile, [], new Set());
      });
      observer.observe(modal, { childList: true, subtree: true });
      window._jobfillLinkedInObserver = observer;
    }

    return results;
  }

  return { matches: matches, fill: fill, getJobDetails: getJobDetails };

})();

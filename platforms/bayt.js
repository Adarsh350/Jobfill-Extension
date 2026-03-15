// JobFill — platforms/bayt.js
// Phase 09-04 — Bayt platform module
// Registers: window.JobFill.platforms.bayt
//
// RTL CONSTRAINT (FR-7.5): ALL field identification uses ONLY name/id/type/autocomplete
// attribute selectors. No label text, no placeholder text, no ARIA attributes — Arabic
// labels in the DOM must never be used for matching. getAdjacentLabel() is intentionally
// omitted from this file; its absence makes the constraint self-enforcing.

window.JobFill = window.JobFill || {};
window.JobFill.platforms = window.JobFill.platforms || {};

window.JobFill.platforms.bayt = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Field descriptor table — attribute-only selectors (RTL-safe)
  // CRITICAL: No selector may contain label text, placeholder text, or ARIA attributes.
  // All selectors use: [name=], [id*=], [type=], [autocomplete=] ONLY.
  // ---------------------------------------------------------------------------
  var FIELDS = [
    {
      label: 'First Name',
      profileKey: 'firstName',
      selectors: [
        'input[name="FirstName"]',
        'input[name="first_name"]',
        'input[id*="FirstName"]',
        'input[autocomplete="given-name"]',
      ],
    },
    {
      label: 'Last Name',
      profileKey: 'lastName',
      selectors: [
        'input[name="LastName"]',
        'input[name="last_name"]',
        'input[id*="LastName"]',
        'input[autocomplete="family-name"]',
      ],
    },
    {
      label: 'Email',
      profileKey: 'email',
      selectors: [
        'input[type="email"]',
        'input[name="Email"]',
        'input[name="email"]',
      ],
    },
    {
      label: 'Phone',
      profileKey: 'phone',
      selectors: [
        'input[type="tel"]',
        'input[name="Phone"]',
        'input[name="mobile"]',
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // matches(hostname) — returns true for Bayt hostnames
  // ---------------------------------------------------------------------------
  function matches(hostname) {
    return hostname.indexOf('bayt.com') !== -1;
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
  // isNativeBaytForm() — returns false if Bayt redirected to a third-party ATS
  // ---------------------------------------------------------------------------
  function isNativeBaytForm() {
    return !!document.querySelector('form[action*="bayt.com"], form[id*="apply"], #applyForm');
  }

  // ---------------------------------------------------------------------------
  // getJobDetails() — Bayt title format: "Job Title - Company | Bayt.com"
  // ---------------------------------------------------------------------------
  function getJobDetails() {
    var companyName = '';
    var jobTitle = '';

    try {
      var title = document.title || '';
      // Split on ' - ' first: ["Job Title", "Company | Bayt.com"]
      var dashParts = title.split(' - ');
      if (dashParts.length >= 2) {
        jobTitle = dashParts[0].trim();
        // Remove trailing " | Bayt.com" from company portion
        var pipeParts = dashParts[1].split(' | ');
        companyName = pipeParts[0].trim();
      } else {
        // Fallback: split on ' | '
        var pipeFallback = title.split(' | ');
        if (pipeFallback.length >= 2) {
          jobTitle = pipeFallback[0].trim();
          companyName = pipeFallback[1].trim();
        } else {
          jobTitle = title.trim();
        }
      }
    } catch (e) { /* skip */ }

    return { companyName: companyName, jobTitle: jobTitle };
  }

  // ---------------------------------------------------------------------------
  // fillStandardFields — fill FIELDS table entries using attribute selectors
  // ---------------------------------------------------------------------------
  function fillStandardFields(profile, results, handledEls) {
    for (var i = 0; i < FIELDS.length; i++) {
      var field = FIELDS[i];
      var el = resolveSelector(field.selectors);

      // No element found in DOM
      if (!el) {
        results.push({
          field: field.label,
          status: 'skipped',
          reason: 'element not found',
        });
        continue;
      }

      handledEls.add(el);

      // Skip if already filled
      if (hasValue(el)) {
        results.push({
          field: field.label,
          status: 'skipped',
          reason: 'already has value',
        });
        continue;
      }

      // No profile value for this key
      var value = field.profileKey && profile[field.profileKey];
      if (!value) {
        results.push({
          field: field.label,
          status: 'skipped',
          reason: 'no profile value',
        });
        continue;
      }

      // Fill the element
      var filled = window.JobFill.filler.fillField(el, value);
      if (filled) {
        results.push({ field: field.label, status: 'filled', value: value });
      } else {
        results.push({ field: field.label, status: 'failed', reason: 'fillField returned false' });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // fillCustomQuestions — Bayt RTL: push textarea elements as needs_review only.
  // Do NOT call findBestAnswer — Arabic question text makes label matching
  // unreliable (FR-7.5). All textareas require manual review.
  // ---------------------------------------------------------------------------
  function fillCustomQuestions(results, handledEls) {
    var candidates;
    try {
      candidates = Array.from(document.querySelectorAll('textarea'));
    } catch (e) {
      candidates = [];
    }

    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (handledEls.has(el)) continue;
      handledEls.add(el);

      results.push({
        field: el.name || el.id || 'Custom Question',
        status: 'needs_review',
        reason: 'Bayt RTL — manual review required',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // fill(profile, answerBank) — main entry point
  // ---------------------------------------------------------------------------
  async function fill(profile, answerBank) {
    // Guard: if not a native Bayt form (ATS redirect), bail immediately
    if (!isNativeBaytForm()) {
      return [];
    }

    var results = [];
    var handledEls = new Set();

    // Pass 1: standard fields (attribute-selector based)
    fillStandardFields(profile, results, handledEls);

    // Pass 2: custom questions (RTL-safe — needs_review only, no label matching)
    fillCustomQuestions(results, handledEls);

    return results;
  }

  return { matches: matches, fill: fill, getJobDetails: getJobDetails };

})();

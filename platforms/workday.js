// JobFill — platforms/workday.js
// Phase 8-02 — Workday platform module
// Registers: window.JobFill.platforms.workday

window.JobFill = window.JobFill || {};
window.JobFill.platforms = window.JobFill.platforms || {};

window.JobFill.platforms.workday = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Field descriptor table
  // Each entry: { label, profileKey, selectors[] }
  // All resolution via shadowQuery — NOT document.querySelector
  // ---------------------------------------------------------------------------
  var FIELDS = [
    {
      label: 'First Name',
      profileKey: 'firstName',
      selectors: [
        '[data-automation-id="legalNameSection_firstName"]',
        'input[data-automation-id*="firstName"]',
      ],
    },
    {
      label: 'Last Name',
      profileKey: 'lastName',
      selectors: [
        '[data-automation-id="legalNameSection_lastName"]',
        'input[data-automation-id*="lastName"]',
      ],
    },
    {
      label: 'Email',
      profileKey: 'email',
      selectors: [
        '[data-automation-id="email"]',
        'input[type="email"]',
      ],
    },
    {
      label: 'Phone',
      profileKey: 'phone',
      selectors: [
        '[data-automation-id="phone-number"]',
        'input[type="tel"]',
      ],
    },
    {
      label: 'City',
      profileKey: 'city',
      selectors: [
        '[data-automation-id="addressSection_city"]',
        'input[data-automation-id*="city"]',
      ],
    },
    {
      label: 'Country',
      profileKey: 'country',
      selectors: [
        '[data-automation-id="country"]',
        'select[data-automation-id*="country"]',
      ],
    },
    {
      label: 'LinkedIn',
      profileKey: 'linkedinUrl',
      selectors: [
        'input[data-automation-id*="linkedIn"]',
        'input[placeholder*="linkedin" i]',
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // matches(hostname) — returns true for Workday hostnames
  // ---------------------------------------------------------------------------
  function matches(hostname) {
    return /myworkdayjobs\.com/i.test(hostname);
  }

  // ---------------------------------------------------------------------------
  // resolveField(selectors) — tries each selector via shadowQuery
  // Uses window.JobFill.filler.shadowQuery — NOT document.querySelector
  // ---------------------------------------------------------------------------
  function resolveField(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      try {
        var el = window.JobFill.filler.shadowQuery(document.body, selectors[i]);
        if (el) return el;
      } catch (e) { /* invalid selector or shadowQuery error */ }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // isVisible(el) — false if element is hidden (offsetParent === null)
  // Used to skip next-step fields not yet in the visible DOM
  // ---------------------------------------------------------------------------
  function isVisible(el) {
    return el.offsetParent !== null;
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
  // getJobDetails() — extracts jobTitle via shadowQuery + companyName from subdomain
  // ---------------------------------------------------------------------------
  function getJobDetails() {
    var jobTitle = '';
    var companyName = '';

    try {
      var h2 = window.JobFill.filler.shadowQuery(
        document.body,
        'h2[data-automation-id="jobPostingHeader"]'
      );
      if (h2) jobTitle = h2.textContent.trim();
    } catch (e) { /* skip */ }

    try {
      var hostname = window.location.hostname;
      // e.g. "acme.myworkdayjobs.com" -> "acme"
      companyName = hostname.split('.')[0].replace(/-/g, ' ');
    } catch (e) { /* skip */ }

    return { jobTitle: jobTitle, companyName: companyName };
  }

  // ---------------------------------------------------------------------------
  // fillStandardFields — iterate FIELDS, apply isVisible + hasValue guards,
  // fill via filler.fillField, dispatch blur after each successful fill
  // ---------------------------------------------------------------------------
  function fillStandardFields(profile, results) {
    for (var i = 0; i < FIELDS.length; i++) {
      var field = FIELDS[i];
      var el = resolveField(field.selectors);

      // No element found
      if (!el) {
        results.push({
          field: field.label,
          status: 'skipped',
          reason: 'element not found',
        });
        continue;
      }

      // isVisible guard — skip hidden next-step fields
      if (!isVisible(el)) {
        results.push({
          field: field.label,
          status: 'skipped',
          reason: 'not visible',
        });
        continue;
      }

      // hasValue guard — skip pre-filled fields
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

      // Fill and dispatch blur (Workday onBlur validation)
      var filled = window.JobFill.filler.fillField(el, value);
      if (filled) {
        window.JobFill.events.dispatchBlur(el);
        results.push({ field: field.label, status: 'filled', value: value });
      } else {
        results.push({
          field: field.label,
          status: 'failed',
          reason: 'fillField returned false',
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // fill(profile, answerBank) — main entry point
  // Note: fillCustomQuestions deferred — Workday custom questions require UAT
  // ---------------------------------------------------------------------------
  async function fill(profile, answerBank) {
    var results = [];
    fillStandardFields(profile, results);

    // Pass: resume upload — Workday: shadow DOM traversal required for file inputs
    // Try findResumeFileInput first; shadow scan as fallback for shadow-root inputs
    var fileInput = window.JobFill.filler.findResumeFileInput(document);
    if (!fileInput) {
      var fileInputs = window.JobFill.filler.shadowQueryAll(document, 'input[type="file"]');
      if (fileInputs.length === 1) {
        fileInput = fileInputs[0];
      } else if (fileInputs.length > 1) {
        // Score each shadow input; pick highest scored resume candidate
        var best = null;
        var bestScore = -1;
        var resumeKws = ['resume', 'cv', 'curriculum'];
        for (var fi = 0; fi < fileInputs.length; fi++) {
          var inp = fileInputs[fi];
          var combined = ((inp.name || '') + ' ' + (inp.id || '')).toLowerCase();
          var score = 0;
          for (var ki = 0; ki < resumeKws.length; ki++) {
            if (combined.indexOf(resumeKws[ki]) !== -1) score += 1;
          }
          if (score > bestScore) { bestScore = score; best = inp; }
        }
        fileInput = best || fileInputs[0];
      }
    }

    if (fileInput) {
      var uploadResult = await window.JobFill.filler.attachResume(fileInput);
      if (uploadResult === null) {
        var sel = window.JobFill.filler.getUniqueSelector(fileInput);
        uploadResult = await new Promise(function(resolve) {
          chrome.runtime.sendMessage({
            type: 'RESUME_UPLOAD_FALLBACK',
            tabId: window._jobfillTabId,
            frameId: window._jobfillFrameId != null ? window._jobfillFrameId : 0,
            selector: sel,
          }, resolve);
        });
      }
      if (uploadResult && (uploadResult.status === 'filled' || uploadResult.status === 'filled_via_main_world')) {
        results.push({ field: 'Resume', status: 'filled' });
      } else if (uploadResult && uploadResult.status === 'skipped') {
        results.push({ field: 'Resume', status: 'skipped', reason: uploadResult.reason });
      } else {
        results.push({ field: 'Resume', status: 'failed', reason: (uploadResult && uploadResult.reason) || 'upload failed' });
      }
    }

    return results;
  }

  return { matches: matches, fill: fill, getJobDetails: getJobDetails };

})();

// JobFill — platforms/icims.js
// Phase 9-02 — iCIMS platform module
// Registers: window.JobFill.platforms.icims
// Note: all_frames: true — this script runs inside iframes.
//       Cross-origin iframe guard is applied first in fill().

window.JobFill = window.JobFill || {};
window.JobFill.platforms = window.JobFill.platforms || {};

window.JobFill.platforms.icims = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Field descriptor table
  // ---------------------------------------------------------------------------
  // iCIMS uses both camelCase and lowercase field name variants (pitfall 3).
  var FIELDS = [
    {
      label: 'First Name',
      profileKey: 'firstName',
      selectors: [
        'input[name="firstname"]',
        'input[name="firstName"]',
        'input[id*="FirstName"]',
        'input[autocomplete="given-name"]',
      ],
    },
    {
      label: 'Last Name',
      profileKey: 'lastName',
      selectors: [
        'input[name="lastname"]',
        'input[name="lastName"]',
        'input[id*="LastName"]',
        'input[autocomplete="family-name"]',
      ],
    },
    {
      label: 'Email',
      profileKey: 'email',
      selectors: [
        'input[type="email"]',
        'input[name="email"]',
      ],
    },
    {
      label: 'Phone',
      profileKey: 'phone',
      selectors: [
        'input[type="tel"]',
        'input[name="phone"]',
        'input[name="phoneNumber"]',
      ],
    },
    {
      label: 'Resume',
      profileKey: null,
      isFile: true,
      selectors: [
        'input[type="file"]',
        'input[name*="resume" i]',
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // matches(hostname) — returns true for iCIMS hostnames
  // ---------------------------------------------------------------------------
  function matches(hostname) {
    return hostname.indexOf('icims.com') !== -1;
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
  // hasValue(el) — true if element already has user-supplied content
  // ---------------------------------------------------------------------------
  function hasValue(el) {
    if (!el) return false;
    if (el.tagName === 'SELECT') {
      return el.value !== '' && el.selectedIndex > 0;
    }
    return !!(el.value && el.value.trim() !== '');
  }

  // ---------------------------------------------------------------------------
  // getAdjacentLabel(el) — 4-method label extraction
  // ---------------------------------------------------------------------------
  function getAdjacentLabel(el) {
    if (!el) return '';

    // Method 1: label[for=id]
    if (el.id) {
      try {
        var labelEl = document.querySelector('label[for="' + el.id + '"]');
        if (labelEl && labelEl.textContent) return labelEl.textContent.trim();
      } catch (e) { /* skip */ }
    }

    // Method 2: closest('label')
    if (el.closest) {
      var parent = el.closest('label');
      if (parent && parent.textContent) return parent.textContent.trim();
    }

    // Method 3: previousElementSibling LABEL
    if (el._prevSiblingLabel && el._prevSiblingLabel.textContent) {
      return el._prevSiblingLabel.textContent.trim();
    }

    // Method 4: aria-label or placeholder
    var ariaLabel = el.getAttribute && el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();
    if (el.placeholder) return el.placeholder.trim();

    return '';
  }

  // ---------------------------------------------------------------------------
  // detectCrossOrigin() — two-step cross-origin iframe check
  // ---------------------------------------------------------------------------
  // Step 1: if window === window.top, we are not in an iframe at all → false
  // Step 2: try to read window.top.location.href — SecurityError means cross-origin
  function detectCrossOrigin() {
    // Step 1: not inside any iframe
    try {
      if (window === window.top) return false;
    } catch (e) {
      // If even this throws, we are definitely cross-origin
      return true;
    }

    // Step 2: inside an iframe — check if same-origin
    try {
      // This throws SecurityError if cross-origin
      void window.top.location.href;
      return false;
    } catch (e) {
      return true;
    }
  }

  // ---------------------------------------------------------------------------
  // getJobDetails() — extracts job title and company from iCIMS DOM
  // ---------------------------------------------------------------------------
  function getJobDetails() {
    var jobTitle = '';
    var companyName = '';

    // Primary: iCIMS job title element
    try {
      var titleEl = document.querySelector('.iCIMS_JobTitle, h1.iCIMS_Header');
      if (titleEl) {
        jobTitle = titleEl.textContent.trim();
      }
    } catch (e) { /* skip */ }

    // Company: try parent frame document title (same-origin parent only)
    if (!companyName) {
      try {
        var parentTitle = window.parent.document.title;
        if (parentTitle) {
          var parentParts = parentTitle.split(/[|\-\u2013]/);
          if (parentParts.length >= 2) {
            companyName = parentParts[1].trim();
          }
        }
      } catch (e) { /* cross-origin parent — skip */ }
    }

    // Fallback: parse document.title on | or - or en-dash
    if (!jobTitle || !companyName) {
      try {
        var title = document.title || '';
        var parts = title.split(/[|\-\u2013]/);
        if (parts.length >= 2) {
          if (!jobTitle)    jobTitle    = parts[0].trim();
          if (!companyName) companyName = parts[1].trim();
        } else if (parts.length === 1 && !jobTitle) {
          jobTitle = parts[0].trim();
        }
      } catch (e) { /* skip */ }
    }

    return { jobTitle: jobTitle, companyName: companyName };
  }

  // ---------------------------------------------------------------------------
  // fillStandardFields — fill FIELDS table entries
  // ---------------------------------------------------------------------------
  async function fillStandardFields(profile, results, handledEls) {
    for (var i = 0; i < FIELDS.length; i++) {
      var field = FIELDS[i];
      var el = resolveSelector(field.selectors);

      // File input — attempt resume upload via filler.attachResume
      // iCIMS runs in iframe — frameId forwarded for executeScript target
      if (field.isFile) {
        if (!el) {
          results.push({ field: field.label, status: 'skipped', reason: 'element not found' });
          continue;
        }
        handledEls.add(el);
        var uploadResult = await window.JobFill.filler.attachResume(el);
        if (uploadResult === null) {
          var sel = window.JobFill.filler.getUniqueSelector(el);
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
          results.push({ field: field.label, status: 'filled' });
        } else if (uploadResult && uploadResult.status === 'skipped') {
          results.push({ field: field.label, status: 'skipped', reason: uploadResult.reason });
        } else {
          results.push({ field: field.label, status: 'failed', reason: (uploadResult && uploadResult.reason) || 'upload failed' });
        }
        continue;
      }

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
  // fillCustomQuestions — fill open-text / textarea questions via answer bank
  // ---------------------------------------------------------------------------
  function fillCustomQuestions(answerBank, jobDetails, results, handledEls) {
    var candidates;
    try {
      candidates = Array.from(
        document.querySelectorAll('textarea, input[type="text"]')
      );
    } catch (e) {
      candidates = [];
    }

    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (handledEls.has(el)) continue;
      handledEls.add(el);

      var label = getAdjacentLabel(el);
      if (!label) continue;

      var match = window.JobFill.matcher.findBestAnswer(label, answerBank);
      if (!match) {
        results.push({ field: label, status: 'skipped', reason: 'no matching answer' });
        continue;
      }

      var rawAnswer = match.entry.answer;
      var vars = {
        company_name:     jobDetails.companyName,
        job_title:        jobDetails.jobTitle,
        my_name:          undefined,
        years_experience: undefined,
        current_company:  undefined,
        target_role:      undefined,
      };

      var resolved = window.JobFill.matcher.substituteVariables(rawAnswer, vars);

      if (resolved.indexOf('{{') !== -1) {
        window.JobFill.filler.fillField(el, resolved);
        results.push({ field: label, status: 'needs_review', value: resolved,
          reason: 'answer contains unresolved variables' });
      } else {
        window.JobFill.filler.fillField(el, resolved);
        results.push({ field: label, status: 'filled', value: resolved });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // fill(profile, answerBank) — main entry point
  // ---------------------------------------------------------------------------
  async function fill(profile, answerBank) {
    var results = [];

    // Cross-origin iframe guard — must be first
    if (detectCrossOrigin()) {
      results.push({
        field: 'iCIMS Form',
        status: 'failed',
        reason: 'cross-origin iframe — manual fill required',
      });
      // Notify background service worker
      try {
        chrome.runtime.sendMessage({ type: 'ICIMS_CROSS_ORIGIN' });
      } catch (e) { /* chrome not available in test env */ }
      return results;
    }

    var handledEls = new Set();
    var jobDetails = getJobDetails();

    // Pass 1: standard fields
    await fillStandardFields(profile, results, handledEls);

    // Pass 2: custom questions via answer bank
    fillCustomQuestions(answerBank, jobDetails, results, handledEls);

    return results;
  }

  return { matches: matches, fill: fill, getJobDetails: getJobDetails };

})();

// JobFill — platforms/ashby.js
// Phase 8-03 — Ashby platform module
// Registers: window.JobFill.platforms.ashby

window.JobFill = window.JobFill || {};
window.JobFill.platforms = window.JobFill.platforms || {};

window.JobFill.platforms.ashby = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Field descriptor table (standard React selectors — no shadow DOM)
  // ---------------------------------------------------------------------------
  var FIELDS = [
    {
      label: 'First Name',
      profileKey: 'firstName',
      selectors: [
        'input[name="firstName"]',
        'input[autocomplete="given-name"]',
      ],
    },
    {
      label: 'Last Name',
      profileKey: 'lastName',
      selectors: [
        'input[name="lastName"]',
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
      ],
    },
    {
      label: 'LinkedIn',
      profileKey: 'linkedinUrl',
      selectors: [
        'input[name="linkedin"]',
        'input[placeholder*="linkedin" i]',
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // matches(hostname) — returns true for Ashby hostnames
  // ---------------------------------------------------------------------------
  function matches(hostname) {
    return hostname.indexOf('ashbyhq.com') !== -1;
  }

  // ---------------------------------------------------------------------------
  // resolveSelector(selectors) — tries each selector, returns first found el
  // Uses standard document.querySelector (Ashby is NOT shadow DOM)
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
  // getJobDetails() — parses company from "at X" title pattern, job from h1
  // Tiered: (1) "at X" regex, (2) pipe/dash split, (3) empty fallback
  // ---------------------------------------------------------------------------
  function getJobDetails() {
    var jobTitle = '';
    var companyName = '';

    try {
      var h1 = document.querySelector('h1');
      if (h1) jobTitle = h1.textContent.trim();
    } catch (e) { /* skip */ }

    try {
      var title = document.title || '';
      var atMatch = title.match(/\bat\s+(.+?)(?:\s*[|\-\u2013]|$)/i);
      if (atMatch) {
        companyName = atMatch[1].trim();
      } else {
        var pipeParts = title.split(/[|\u2013\-]/);
        if (pipeParts.length >= 2) companyName = pipeParts[1].trim();
      }
    } catch (e) { /* skip */ }

    return { companyName: companyName, jobTitle: jobTitle };
  }

  // ---------------------------------------------------------------------------
  // fillStandardFields — fill FIELDS table entries
  // ---------------------------------------------------------------------------
  function fillStandardFields(profile, results, handledEls) {
    for (var i = 0; i < FIELDS.length; i++) {
      var field = FIELDS[i];
      var el = resolveSelector(field.selectors);

      if (!el) {
        results.push({ field: field.label, status: 'skipped', reason: 'element not found' });
        continue;
      }

      handledEls.add(el);

      if (hasValue(el)) {
        results.push({ field: field.label, status: 'skipped', reason: 'already has value' });
        continue;
      }

      var value = field.profileKey && profile[field.profileKey];
      if (!value) {
        results.push({ field: field.label, status: 'skipped', reason: 'no profile value' });
        continue;
      }

      var filled = window.JobFill.filler.fillField(el, value);
      if (filled) {
        results.push({ field: field.label, status: 'filled', value: value });
      } else {
        results.push({ field: field.label, status: 'failed', reason: 'fillField returned false' });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // fillCustomQuestions — scan [data-field-type] wrappers for custom questions
  // Fallback: bare textarea elements for self-hosted Ashby (no data-field-type)
  // ---------------------------------------------------------------------------
  function fillCustomQuestions(answerBank, jobDetails, results, handledEls) {
    var candidates;

    // Primary: [data-field-type] textarea and input[type="text"]
    try {
      candidates = Array.from(
        document.querySelectorAll('[data-field-type] textarea, [data-field-type] input[type="text"]')
      );
    } catch (e) {
      candidates = [];
    }

    // Fallback: bare textarea (self-hosted Ashby may omit data-field-type)
    var bareTextareas;
    try {
      bareTextareas = Array.from(document.querySelectorAll('textarea'));
    } catch (e) {
      bareTextareas = [];
    }
    for (var b = 0; b < bareTextareas.length; b++) {
      var bt = bareTextareas[b];
      if (candidates.indexOf(bt) === -1) candidates.push(bt);
    }

    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (handledEls.has(el)) continue;
      handledEls.add(el);

      // Extract label: (1) closest [data-field-type] label, (2) data-field-type attr, (3) placeholder
      var label = '';
      try {
        var wrapper = el.closest && el.closest('[data-field-type]');
        if (wrapper) {
          var labelEl = wrapper.querySelector('label');
          if (labelEl && labelEl.textContent) {
            label = labelEl.textContent.trim();
          }
          if (!label) {
            var attr = wrapper.getAttribute && wrapper.getAttribute('data-field-type');
            if (attr) label = attr;
          }
        }
      } catch (e) { /* skip */ }

      if (!label && el.placeholder) label = el.placeholder;
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
    var handledEls = new Set();

    var jobDetails = getJobDetails();

    fillStandardFields(profile, results, handledEls);
    fillCustomQuestions(answerBank, jobDetails, results, handledEls);

    // Pass: resume upload
    var fileInput = window.JobFill.filler.findResumeFileInput(document);
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

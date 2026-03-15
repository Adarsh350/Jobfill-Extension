// JobFill — platforms/greenhouse.js
// Phase 7-02 — Greenhouse platform module
// Registers: window.JobFill.platforms.greenhouse

window.JobFill = window.JobFill || {};
window.JobFill.platforms = window.JobFill.platforms || {};

window.JobFill.platforms.greenhouse = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Field descriptor table
  // ---------------------------------------------------------------------------
  // Each entry: { label, profileKey, selectors[], isFile? }
  var FIELDS = [
    {
      label: 'First Name',
      profileKey: 'firstName',
      selectors: [
        'input#first_name',
        'input[name="first_name"]',
        'input[autocomplete="given-name"]',
      ],
    },
    {
      label: 'Last Name',
      profileKey: 'lastName',
      selectors: [
        'input#last_name',
        'input[name="last_name"]',
        'input[autocomplete="family-name"]',
      ],
    },
    {
      label: 'Email',
      profileKey: 'email',
      selectors: [
        'input#email',
        'input[name="email"]',
        'input[type="email"]',
      ],
    },
    {
      label: 'Phone',
      profileKey: 'phone',
      selectors: [
        'input#phone',
        'input[name="phone"]',
        'input[type="tel"]',
      ],
    },
    {
      label: 'LinkedIn',
      profileKey: 'linkedinUrl',
      selectors: [
        'input#job_application_linkedin_profile',
        'input[name*="linkedin" i]',
        'input[id*="linkedin" i]',
        'input[autocomplete*="linkedin" i]',
        'input[placeholder*="linkedin" i]',
      ],
    },
    {
      label: 'Resume',
      profileKey: null,
      isFile: true,
      selectors: [
        'input#resume',
        'input[name="resume"]',
        'input[type="file"][id*="resume"]',
      ],
    },
    {
      label: 'Cover Letter',
      profileKey: 'summary',
      selectors: [
        'textarea#cover_letter',
        'textarea[name="cover_letter"]',
        'textarea[name*="cover" i]',
        'textarea[id*="cover" i]',
      ],
    },
    {
      label: 'Location',
      profileKey: 'city',
      selectors: [
        'select#job_application_location',
        'input[name*="city" i]',
        'input[id*="location" i]',
        'input[name*="location" i]',
        'input[id*="city" i]',
        'input[placeholder*="location" i]',
      ],
    },
    {
      label: 'Work Authorization',
      profileKey: 'workAuthorization',
      selectors: [
        'select[name*="work_auth"]',
        'select[name*="work" i]',
        'select[id*="work" i]',
        'select[name*="authorization"]',
        'input[name*="work_auth" i]',
        'input[type="radio"][name*="auth"]',
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // matches(hostname) — returns true for Greenhouse hostnames
  // ---------------------------------------------------------------------------
  function matches(hostname) {
    return /greenhouse\.io/i.test(hostname);
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
  // getJobDetails() — extracts company + job title from DOM
  // ---------------------------------------------------------------------------
  function getJobDetails() {
    var companyName = '';
    var jobTitle = '';

    try {
      var companyEl = document.querySelector('h1.company-name');
      if (companyEl) {
        companyName = companyEl.textContent.trim();
      }
    } catch (e) { /* skip */ }

    try {
      var titleEl = document.querySelector('h1.app-title');
      if (!titleEl) titleEl = document.querySelector('h1');
      if (titleEl) {
        jobTitle = titleEl.textContent.trim();
      }
    } catch (e) { /* skip */ }

    // Fallback: parse document.title on '–' or '|'
    if (!companyName || !jobTitle) {
      try {
        var title = document.title || '';
        var parts = title.split(/[–|]/);
        if (parts.length >= 2) {
          if (!jobTitle)    jobTitle    = parts[0].trim();
          if (!companyName) companyName = parts[1].trim();
        }
      } catch (e) { /* skip */ }
    }

    return { companyName: companyName, jobTitle: jobTitle };
  }

  // ---------------------------------------------------------------------------
  // fillStandardFields — fill FIELDS table entries
  // ---------------------------------------------------------------------------
  async function fillStandardFields(profile, results, handledEls) {
    for (var i = 0; i < FIELDS.length; i++) {
      var field = FIELDS[i];
      var el = resolveSelector(field.selectors);

      // File input — attempt resume upload via filler.attachResume
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
      // fillField may return undefined for inputs whose event helpers don't
      // explicitly return true (e.g. older builds of events.js).  If the
      // native value was set successfully we treat that as filled regardless.
      var filled = window.JobFill.filler.fillField(el, value);
      var valueSet = (el.value === value);
      if (filled || valueSet) {
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

      // Try to find a matching answer
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
        // Unresolved variables — needs human review
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

    // Get job details for variable substitution
    var jobDetails = getJobDetails();

    // Pass 1: standard fields
    await fillStandardFields(profile, results, handledEls);

    // Pass 2: custom questions
    fillCustomQuestions(answerBank, jobDetails, results, handledEls);

    return results;
  }

  return { matches: matches, fill: fill, getJobDetails: getJobDetails };

})();

// JobFill — platforms/lever.js
// Lever platform module — implemented in Phase 7
window.JobFill = window.JobFill || {};
window.JobFill.platforms = window.JobFill.platforms || {};

window.JobFill.platforms.lever = (function () {
  'use strict';

  // Field descriptors — label, profile key, selectors, flags
  var FIELDS = [
    {
      key: 'fullName',
      label: 'Full Name',
      selectors: ['input[name="name"]', 'input[placeholder*="name" i]', 'input[autocomplete="name"]']
    },
    {
      key: 'email',
      label: 'Email',
      selectors: ['input[name="email"]', 'input[type="email"]', 'input[placeholder*="email" i]']
    },
    {
      key: 'phone',
      label: 'Phone',
      selectors: ['input[name="phone"]', 'input[type="tel"]', 'input[placeholder*="phone" i]']
    },
    {
      key: 'linkedinUrl',
      label: 'LinkedIn',
      selectors: ['input[name="urls[LinkedIn]"]', 'input[name*="linkedin" i]', 'input[placeholder*="linkedin" i]'],
      linkedinFallback: true
    },
    {
      key: 'portfolioUrl',
      label: 'Portfolio',
      selectors: ['input[name="urls[Portfolio]"]', 'input[name*="portfolio" i]']
    },
    {
      key: null,
      label: 'Resume',
      selectors: ['input[name="resume"]', 'input[type="file"]'],
      isFile: true
    },
    {
      key: 'coverLetter',
      label: 'Cover Letter',
      selectors: [
        'textarea[name="comments"]',
        'textarea[placeholder*="cover" i]',
        'textarea[placeholder*="message" i]'
      ]
    }
  ];

  function matches(hostname) {
    return hostname.includes('lever.co');
  }

  // Try each selector; return first matching element.
  // linkedinFallback iterates all inputs checking .name directly (handles bracket edge cases).
  function resolveSelector(selectors, linkedinFallback) {
    for (var i = 0; i < selectors.length; i++) {
      try {
        var el = document.querySelector(selectors[i]);
        if (el) return el;
      } catch (e) { /* invalid selector — skip */ }
    }
    if (linkedinFallback) {
      var inputs = document.querySelectorAll('input');
      for (var j = 0; j < inputs.length; j++) {
        if (inputs[j].name === 'urls[LinkedIn]') return inputs[j];
      }
    }
    return null;
  }

  function hasValue(el) {
    return el.value !== undefined && el.value !== null && String(el.value).trim() !== '';
  }

  function getAdjacentLabel(el) {
    var parent = el.parentElement;
    if (parent) {
      var lbl = parent.querySelector('label');
      if (lbl) return lbl.textContent.trim();
    }
    if (el.getAttribute && el.getAttribute('aria-label')) {
      return el.getAttribute('aria-label').trim();
    }
    if (el.placeholder) return el.placeholder.trim();
    return '';
  }

  function getJobDetails() {
    var companyName = '';
    var logoImg = document.querySelector('.main-header-logo img');
    if (logoImg && logoImg.alt) {
      companyName = logoImg.alt.trim();
    } else {
      var title = document.title || '';
      var sep = title.match(/\s[–\-|]\s(.+)$/) || title.match(/\sat\s(.+)$/i);
      if (sep) companyName = sep[1].trim();
    }

    var jobTitle = '';
    var h2 = document.querySelector('h2');
    if (h2 && h2.textContent) {
      jobTitle = h2.textContent.trim();
    } else {
      var h1 = document.querySelector('h1');
      if (h1 && h1.textContent) jobTitle = h1.textContent.trim();
    }

    return { companyName: companyName, jobTitle: jobTitle };
  }

  async function fillStandardFields(profile, results, handledEls) {
    var filler = window.JobFill.filler;

    for (var i = 0; i < FIELDS.length; i++) {
      var field = FIELDS[i];
      var el = resolveSelector(field.selectors, field.linkedinFallback);
      if (!el) continue;

      // File input — attempt resume upload via filler.attachResume
      if (field.isFile || el.type === 'file') {
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

      // Already has value — skip
      if (hasValue(el)) {
        results.push({ field: field.label, status: 'skipped', reason: 'already has value' });
        handledEls.add(el);
        continue;
      }

      // No profile key or value — track element but produce no result entry
      if (!field.key || !profile[field.key]) {
        handledEls.add(el);
        continue;
      }

      var value = profile[field.key];
      var ok = filler.fillField(el, value);
      if (ok) {
        results.push({ field: field.label, status: 'filled', value: value });
      } else {
        results.push({ field: field.label, status: 'skipped', reason: 'fillField returned false' });
      }
      handledEls.add(el);
    }
  }

  function fillCustomQuestions(answerBank, jobDetails, results, handledEls) {
    if (!answerBank || !answerBank.length) return;

    var matcher = window.JobFill.matcher;
    var filler = window.JobFill.filler;

    // Lever custom questions live inside [data-qa] containers
    var qaEls = Array.from(
      document.querySelectorAll('[data-qa] textarea, [data-qa] input[type="text"]')
    ).filter(function (el) { return !handledEls.has(el); });

    for (var i = 0; i < qaEls.length; i++) {
      var el = qaEls[i];
      var container = el.closest ? el.closest('[data-qa]') : null;
      var labelEl = container && container.querySelector('label');
      var question = (labelEl && labelEl.textContent.trim()) ||
                     (container && container.getAttribute('data-qa')) ||
                     getAdjacentLabel(el) ||
                     '';

      if (!question) {
        handledEls.add(el);
        continue;
      }

      var vars = {
        company: jobDetails.companyName,
        jobTitle: jobDetails.jobTitle
      };

      var match = matcher.findBestAnswer(question, answerBank);
      if (!match || match.confidence < 0.75) {
        results.push({ field: question, status: 'skipped', reason: 'no confident answer' });
        handledEls.add(el);
        continue;
      }

      var answer = matcher.substituteVariables(match.entry.answer, vars);
      var hasUnresolved = /\{\{[^}]+\}\}/.test(answer);

      var ok = filler.fillField(el, answer);
      if (ok) {
        results.push({ field: question, status: hasUnresolved ? 'needs_review' : 'filled', value: answer });
      } else {
        results.push({ field: question, status: 'skipped', reason: 'fillField returned false' });
      }
      handledEls.add(el);
    }
  }

  async function fill(profile, answerBank) {
    var results = [];
    var handledEls = new Set();

    // getJobDetails called inside fill() — not at load time (SPA timing)
    var jobDetails = getJobDetails();

    await fillStandardFields(profile, results, handledEls);
    fillCustomQuestions(answerBank, jobDetails, results, handledEls);

    return results;
  }

  return { matches: matches, fill: fill, getJobDetails: getJobDetails };
})();

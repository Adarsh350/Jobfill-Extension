// JobFill — platforms/generic.js
// Phase 10-02 — Generic heuristic fallback platform module
// Registers: window.JobFill.platforms.generic

window.JobFill = window.JobFill || {};
window.JobFill.platforms = window.JobFill.platforms || {};

window.JobFill.platforms.generic = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // KEYWORD_MAP — 14 profile keys mapped to heuristic keyword lists
  // ---------------------------------------------------------------------------
  var KEYWORD_MAP = {
    firstName:         ['first', 'fname', 'given', 'forename'],
    lastName:          ['last', 'lname', 'surname', 'family'],
    fullName:          ['fullname', 'full_name', 'full-name', 'yourname', 'your_name'],
    email:             ['email', 'e-mail', 'mail'],
    phone:             ['phone', 'tel', 'mobile', 'cell', 'contact'],
    city:              ['city', 'location', 'town', 'locale'],
    country:           ['country', 'nation', 'region'],
    linkedinUrl:       ['linkedin', 'linked-in', 'profile'],
    portfolioUrl:      ['portfolio', 'website', 'personal', 'site', 'url'],
    currentTitle:      ['title', 'position', 'role', 'job', 'designation'],
    yearsExperience:   ['years', 'experience', 'exp'],
    workAuthorization: ['work', 'auth', 'visa', 'permit', 'eligible', 'sponsor'],
    nationality:       ['nationality', 'citizenship', 'citizen'],
    summary:           ['cover', 'letter', 'summary', 'about', 'message', 'motivation'],
  };

  // ---------------------------------------------------------------------------
  // EXCLUDED_TYPES — input types to never fill
  // ---------------------------------------------------------------------------
  var EXCLUDED_TYPES = ['hidden', 'submit', 'button', 'reset', 'image', 'password', 'file', 'checkbox', 'radio'];

  // ---------------------------------------------------------------------------
  // CAPTCHA_PATTERNS — element name/id patterns indicating CAPTCHA fields
  // ---------------------------------------------------------------------------
  var CAPTCHA_PATTERNS = /captcha|recaptcha|g-recaptcha|hcaptcha/i;

  // ---------------------------------------------------------------------------
  // AUTOCOMPLETE_BONUS — exact autocomplete values that earn +3 score
  // ---------------------------------------------------------------------------
  var AUTOCOMPLETE_BONUS = { 'given-name': true, 'email': true, 'tel': true };

  // ---------------------------------------------------------------------------
  // matches(hostname) — always returns true (generic is last in load order)
  // ---------------------------------------------------------------------------
  function matches() {
    return true;
  }

  // ---------------------------------------------------------------------------
  // shouldSkip(el) — true if element must never be filled
  // ---------------------------------------------------------------------------
  function shouldSkip(el) {
    if (!el) return true;
    var t = (el.type || '').toLowerCase();
    for (var i = 0; i < EXCLUDED_TYPES.length; i++) {
      if (t === EXCLUDED_TYPES[i]) return true;
    }
    var nameId = (el.name || '') + ' ' + (el.id || '');
    if (CAPTCHA_PATTERNS.test(nameId)) return true;
    return false;
  }

  // ---------------------------------------------------------------------------
  // scoreField(el, keywords) — returns keyword match score for an element
  // Checks: name, id, placeholder, aria-label, autocomplete attributes
  // Bonus +3 for exact autocomplete match
  // ---------------------------------------------------------------------------
  function scoreField(el, keywords) {
    var score = 0;
    var name        = (el.name || '').toLowerCase();
    var id          = (el.id || '').toLowerCase();
    var placeholder = (el.placeholder || '').toLowerCase();
    var ariaLabel   = (el.getAttribute ? (el.getAttribute('aria-label') || '') : '').toLowerCase();
    var autocomplete = (el.getAttribute ? (el.getAttribute('autocomplete') || '') : '').toLowerCase();
    var combined = name + ' ' + id + ' ' + placeholder + ' ' + ariaLabel;

    for (var i = 0; i < keywords.length; i++) {
      var kw = keywords[i].toLowerCase();
      if (combined.indexOf(kw) !== -1) {
        score += 1;
      }
    }

    if (autocomplete && AUTOCOMPLETE_BONUS[autocomplete]) {
      score += 3;
    }

    // type-based bonus for email and tel
    var t = (el.type || '').toLowerCase();
    if (t === 'email') score += 2;
    if (t === 'tel')   score += 2;

    return score;
  }

  // ---------------------------------------------------------------------------
  // discoverFields(profile) — assigns each valid input to at most one profile key
  // Returns a Map of profileKey -> element
  // ---------------------------------------------------------------------------
  function discoverFields(profile) {
    // Use broad selector then filter via shouldSkip() — avoids complex :not() chains
    // that may not be supported in all environments (e.g. test DOM shims).
    var elements;
    try {
      elements = Array.from(document.querySelectorAll('input, select, textarea'));
    } catch (e) {
      elements = [];
    }

    // Filter to profile keys that have values
    var activeKeys = Object.keys(KEYWORD_MAP).filter(function (k) {
      if (k === 'fullName') {
        return !!(profile.firstName || profile.lastName);
      }
      return !!profile[k];
    });

    // For each element, find best-scoring profile key
    // element -> { key, score }
    var elBest = [];
    for (var ei = 0; ei < elements.length; ei++) {
      var el = elements[ei];
      if (shouldSkip(el)) continue;

      var bestKey = null;
      var bestScore = 0;
      for (var ki = 0; ki < activeKeys.length; ki++) {
        var key = activeKeys[ki];
        var keywords = KEYWORD_MAP[key];
        var s = scoreField(el, keywords);
        if (s > bestScore) {
          bestScore = s;
          bestKey = key;
        }
      }

      if (bestKey && bestScore >= 1) {
        elBest.push({ el: el, key: bestKey, score: bestScore });
      }
    }

    // Assign each element to at most one key (highest score wins across all els for a key)
    // Also each key gets at most one element (first/highest scoring)
    var usedEls = new Set();
    var result = {};

    // Sort by score descending so highest-confidence assignments win
    elBest.sort(function (a, b) { return b.score - a.score; });

    for (var i = 0; i < elBest.length; i++) {
      var item = elBest[i];
      if (usedEls.has(item.el)) continue;
      if (result[item.key]) continue; // key already assigned
      result[item.key] = item.el;
      usedEls.add(item.el);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // hasValue(el) — true if element already has user-supplied content
  // ---------------------------------------------------------------------------
  function hasValue(el) {
    if (!el) return false;
    if (el.tagName === 'SELECT') {
      return el.value !== '' && el.selectedIndex > 0;
    }
    // Check both el.value (live DOM) and el._attrs.value (test mock attribute)
    var v = el.value !== undefined ? el.value
          : (el._attrs && el._attrs.value) ? el._attrs.value
          : '';
    return !!(v && String(v).trim() !== '');
  }

  // ---------------------------------------------------------------------------
  // getAdjacentLabel(el) — 4-method label text extraction
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
  // getJobDetails() — extracts jobTitle and companyName from the page
  // Priority: title pipe/dash split -> h1 -> meta description
  // ---------------------------------------------------------------------------
  function getJobDetails() {
    var companyName = '';
    var jobTitle = '';

    // 1. Parse document.title on common separators
    try {
      var title = document.title || '';
      if (title) {
        var parts = title.split(/\s*[|\-\u2013\/]\s*/);
        if (parts.length >= 2) {
          jobTitle    = parts[0].trim();
          companyName = parts[1].trim();
        } else if (parts.length === 1 && parts[0].trim()) {
          jobTitle = parts[0].trim();
        }
      }
    } catch (e) { /* skip */ }

    // 2. h1 fallback for jobTitle
    if (!jobTitle) {
      try {
        var h1 = document.querySelector('h1');
        if (h1 && h1.textContent) {
          jobTitle = h1.textContent.trim();
        }
      } catch (e) { /* skip */ }
    }

    // 3. meta description for companyName fallback
    if (!companyName) {
      try {
        var meta = document.querySelector('meta[name="description"]');
        if (meta) {
          var content = meta.getAttribute('content') || '';
          var match = content.match(/at\s+([A-Z][a-zA-Z\s]+?)(?:\s+today|\s+now|$)/);
          if (!match) match = content.match(/at\s+([A-Z][a-zA-Z\s]+)/);
          if (match) companyName = match[1].trim();
        }
      } catch (e) { /* skip */ }
    }

    return { jobTitle: jobTitle, companyName: companyName };
  }

  // ---------------------------------------------------------------------------
  // fillStandardFields — uses heuristic discovery, fills each discovered field
  // All successful fills are status 'needs_review' (never 'filled')
  // ---------------------------------------------------------------------------
  function fillStandardFields(profile, results, handledEls) {
    var fieldMap = discoverFields(profile);
    var keys = Object.keys(fieldMap);

    for (var i = 0; i < keys.length; i++) {
      var profileKey = keys[i];
      var el = fieldMap[profileKey];

      handledEls.add(el);

      // Skip if already has value
      if (hasValue(el)) {
        results.push({
          field: profileKey,
          status: 'skipped',
          reason: 'already has value',
        });
        continue;
      }

      // Determine value — fullName gets firstName + lastName
      var value;
      if (profileKey === 'fullName') {
        value = ((profile.firstName || '') + ' ' + (profile.lastName || '')).trim();
      } else {
        value = profile[profileKey];
      }

      if (!value) {
        results.push({
          field: profileKey,
          status: 'skipped',
          reason: 'no profile value',
        });
        continue;
      }

      var filled = window.JobFill.filler.fillField(el, value);
      if (filled) {
        results.push({
          field: profileKey,
          status: 'needs_review',
          value: value,
          reason: 'generic heuristic — verify field mapping',
        });
      } else {
        results.push({
          field: profileKey,
          status: 'failed',
          reason: 'fillField returned false',
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // fillCustomQuestions — fills textarea/text inputs not already handled
  // Uses matcher.findBestAnswer with 0.75 confidence threshold
  // All fills are status 'needs_review' per generic policy
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
      if (shouldSkip(el)) continue;
      handledEls.add(el);

      var label = getAdjacentLabel(el);
      if (!label) continue;

      var match = window.JobFill.matcher.findBestAnswer(label, answerBank);
      if (!match || match.confidence < 0.75) {
        results.push({ field: label, status: 'skipped', reason: 'no matching answer' });
        continue;
      }

      var rawAnswer = match.entry.answer;
      var vars = {
        company_name:     jobDetails.companyName,
        job_title:        jobDetails.jobTitle,
      };
      var resolved = window.JobFill.matcher.substituteVariables(rawAnswer, vars);

      window.JobFill.filler.fillField(el, resolved);
      results.push({
        field: label,
        status: 'needs_review',
        value: resolved,
        reason: 'generic heuristic — verify field mapping',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // fill(profile, answerBank) — main entry point (two-pass orchestrator)
  // ---------------------------------------------------------------------------
  async function fill(profile, answerBank) {
    var results = [];
    var handledEls = new Set();

    var jobDetails = getJobDetails();

    // Pass 1: standard fields via heuristic discovery
    fillStandardFields(profile, results, handledEls);

    // Pass 2: custom questions via answer bank
    fillCustomQuestions(answerBank, jobDetails, results, handledEls);

    // Pass 3: resume upload — always marked needs_review per generic policy
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
        results.push({ field: 'Resume', status: 'needs_review', value: 'resume attached — verify upload' });
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

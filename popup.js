// JobFill — popup.js
// Phase 12 Plan 02: Profile tab wiring, tab switching, Fill Form button
// Phase 12 Plans 03–05 will append additional init functions below.

(function () {
  'use strict';

  // --- Constants ---

  const PROFILE_FIELDS = [
    'firstName', 'lastName', 'email', 'phone',
    'linkedinUrl', 'portfolioUrl', 'githubUrl', 'websiteUrl',
    'currentTitle', 'currentCompany', 'yearsExperience',
    'city', 'country',
    'workAuthorization', 'noticePeriod', 'salaryExpectation', 'currency', 'remotePreference',
    'summary', 'coverLetterDefault',
    'skills', 'languages',
    'university', 'degree', 'graduationYear'
  ];

  // --- Utility ---

  function debounce(fn, ms) {
    var timer;
    return function () {
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  }

  // --- Tab Switching ---

  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.tab-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        document.querySelectorAll('.tab-panel').forEach(function (p) {
          p.classList.remove('active');
        });
        btn.classList.add('active');
        var panel = document.getElementById('tab-' + btn.dataset.tab);
        if (panel) panel.classList.add('active');
      });
    });
  }

  // --- Profile Tab ---

  function collectProfile() {
    var profile = {};
    PROFILE_FIELDS.forEach(function (key) {
      var el = document.getElementById('profile-' + key);
      if (!el) return;
      if (el.type === 'checkbox') {
        profile[key] = el.checked;
      } else {
        profile[key] = el.value;
      }
    });
    return profile;
  }

  async function updateProfileQuota() {
    var bar = document.getElementById('profile-quota-bar');
    if (!bar) return;
    try {
      var q = await window.JobFill.storage.getBytesInUse('profile');
      bar.style.width = q.percentFull + '%';
      if (q.nearLimit) {
        bar.style.background = '#f59e0b'; // amber warning
      } else {
        bar.style.background = '';
      }
    } catch (e) {
      // storage not available (e.g. dev environment without extension context)
    }
  }

  async function initProfileTab() {
    try {
      var profile = await window.JobFill.storage.getProfile() || {};
      PROFILE_FIELDS.forEach(function (key) {
        var el = document.getElementById('profile-' + key);
        if (!el) return;
        if (el.type === 'checkbox') {
          el.checked = !!profile[key];
        } else {
          el.value = profile[key] != null ? profile[key] : '';
        }
      });
      await updateProfileQuota();
    } catch (e) {
      // storage unavailable — fields remain empty
    }

    // Auto-save each field on input with 300ms debounce
    PROFILE_FIELDS.forEach(function (key) {
      var el = document.getElementById('profile-' + key);
      if (!el) return;
      var save = debounce(async function () {
        try {
          var profileData = collectProfile();
          await window.JobFill.storage.saveProfile(profileData);
          await updateProfileQuota();
        } catch (e) {
          // storage unavailable — silently skip
        }
      }, 300);
      el.addEventListener('input', save);
      el.addEventListener('change', save); // covers select and checkbox
    });
  }

  // --- Fill Form Button ---

  function initFillButton() {
    var btn = document.getElementById('btn-fill-form');
    if (!btn) return;
    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.textContent = 'Filling...';
      chrome.runtime.sendMessage({ type: 'TRIGGER_FILL' }, function (response) {
        btn.disabled = false;
        btn.textContent = 'Fill Form';
        var statusEl = document.getElementById('header-status');
        if (!statusEl) return;
        if (response && response.error) {
          statusEl.textContent = response.error;
        } else if (response && response.results) {
          var filled = response.results.filter(function (r) { return r.status === 'filled'; }).length;
          statusEl.textContent = filled + ' field(s) filled';
        }
      });
    });
  }

  // --- Init ---

  document.addEventListener('DOMContentLoaded', async function () {
    initTabs();
    initFillButton();
    await initProfileTab();
    // Wave 2b will add: initResumeTab()
    // Wave 3 will add: initAnswerBankTab(), initSettingsTab()
  });

})();

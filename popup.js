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

  // --- Resume Tab ---

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function showResumeInfo(resumeObj) {
    document.getElementById('resume-info').style.display = 'flex';
    document.getElementById('resume-empty').style.display = 'none';
    document.getElementById('resume-filename').textContent = resumeObj.name;
    document.getElementById('resume-size').textContent = formatBytes(resumeObj.size);
  }

  function clearResumeUI() {
    document.getElementById('resume-info').style.display = 'none';
    document.getElementById('resume-empty').style.display = 'block';
    document.getElementById('resume-input').value = '';
  }

  async function loadResume() {
    const resume = await window.JobFill.storage.getResume();
    if (resume) {
      showResumeInfo(resume);
    } else {
      clearResumeUI();
    }
  }

  function bindResumeTab() {
    document.getElementById('resume-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Size guard: reject files over 5 MB
      if (file.size > 5 * 1024 * 1024) {
        const errEl = document.getElementById('resume-empty');
        if (errEl) errEl.textContent = 'File too large (max 5 MB). Please choose a smaller file.';
        e.target.value = '';
        return;
      }

      // FileReader is callback-based — do NOT use async/await here
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const resumeObj = {
          name: file.name,
          dataUrl: evt.target.result,  // base64 data URL
          mimeType: file.type,
          size: file.size,
        };
        await window.JobFill.storage.saveResume(resumeObj);
        showResumeInfo(resumeObj);
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('resume-clear').addEventListener('click', async () => {
      await window.JobFill.storage.clearResume();
      clearResumeUI();
    });
  }

  // --- Answer Bank — Default Templates ---

  const DEFAULT_TEMPLATES = [
    {
      id: crypto.randomUUID(),
      question: 'Why do you want to work in marketing?',
      keywords: ['motivation', 'career', 'passion', 'why marketing'],
      category: 'motivation',
      answer: 'I am drawn to marketing because it sits at the intersection of creativity and data. I enjoy building campaigns that connect with real people and measuring what actually works. My background in digital and lifecycle marketing has reinforced that the best marketing is both empathetic and analytical.',
    },
    {
      id: crypto.randomUUID(),
      question: 'Describe your CRM experience.',
      keywords: ['crm', 'salesforce', 'hubspot', 'klaviyo', 'tools'],
      category: 'skills',
      answer: 'I have hands-on experience with Salesforce, HubSpot, and Klaviyo. I have built automated nurture sequences, managed segmentation logic, and maintained data hygiene across contact databases of 50,000+ records. I am comfortable writing workflows, setting up lead scoring, and reporting on pipeline attribution.',
    },
    {
      id: crypto.randomUUID(),
      question: 'What email marketing metrics do you track and what results have you achieved?',
      keywords: ['email', 'metrics', 'open rate', 'click rate', 'conversion', 'results'],
      category: 'skills',
      answer: 'I track open rate, click-to-open rate, conversion rate, unsubscribe rate, and revenue per email. In my most recent role I improved open rates from 18% to 31% through subject line testing and send-time optimisation, and drove a 22% increase in trial-to-paid conversions via a 6-step onboarding sequence.',
    },
    {
      id: crypto.randomUUID(),
      question: 'Tell me about a product launch you have led or contributed to.',
      keywords: ['product launch', 'go-to-market', 'campaign', 'launch'],
      category: 'experience',
      answer: 'I led the go-to-market for a B2B SaaS feature release targeting SME finance teams. I coordinated positioning with product, wrote the launch email sequence and landing page copy, briefed the paid team on audience targeting, and created sales enablement assets. The launch drove 400 trial sign-ups in the first week against a target of 250.',
    },
    {
      id: crypto.randomUUID(),
      question: 'Why do you want to work at {{company_name}}?',
      keywords: ['why company', 'motivation', 'fit', 'culture'],
      category: 'motivation',
      answer: 'I am excited about {{company_name}} because of the clear ambition to grow in the region and the emphasis on product-led growth. My experience in lifecycle and CRM marketing maps directly to the stage {{company_name}} is at, and I am motivated by the opportunity to build scalable systems rather than just run one-off campaigns.',
    },
    {
      id: crypto.randomUUID(),
      question: 'What is your work authorization status?',
      keywords: ['visa', 'work authorization', 'golden visa', 'sponsorship', 'right to work'],
      category: 'work_auth',
      answer: 'I hold a UAE Golden Visa and have full right to work in the UAE without employer sponsorship. I am based in Abu Dhabi and available for roles in Abu Dhabi or Dubai.',
    },
    {
      id: crypto.randomUUID(),
      question: 'What is your notice period or availability?',
      keywords: ['notice period', 'availability', 'start date', 'when can you start'],
      category: 'availability',
      answer: 'I am available to start within one month. If the role is urgent, I am open to discussing an earlier start date.',
    },
    {
      id: crypto.randomUUID(),
      question: 'What are your salary expectations?',
      keywords: ['salary', 'compensation', 'package', 'expectations', 'ctc'],
      category: 'salary',
      answer: 'I am targeting AED 22,000–28,000 per month depending on the full benefits package, including health insurance and leave entitlements. I am open to discussing the total package and am flexible for the right opportunity.',
    },
    {
      id: crypto.randomUUID(),
      question: 'Do you have remote work experience?',
      keywords: ['remote', 'work from home', 'distributed', 'async'],
      category: 'experience',
      answer: 'Yes, I have worked in fully remote and hybrid settings for the past three years. I use project management tools like Notion and Linear, communicate proactively via Slack and async video, and am comfortable collaborating across time zones. I have found I am highly productive in remote environments.',
    },
    {
      id: crypto.randomUUID(),
      question: 'What is your biggest professional achievement?',
      keywords: ['achievement', 'accomplishment', 'proud', 'impact', 'result'],
      category: 'experience',
      answer: 'My most significant achievement was rebuilding the email onboarding programme for a SaaS product from scratch. By replacing a single welcome email with a behaviour-triggered 8-step sequence, I increased 30-day activation from 34% to 57% within three months. This directly contributed to a measurable reduction in churn in that cohort.',
    },
  ];

  // --- Answer Bank Tab ---

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function updateAnswersQuota() {
    const q = await window.JobFill.storage.getBytesInUse('answerBank');
    const bar = document.getElementById('answers-quota-bar');
    if (bar) {
      bar.style.width = q.percentFull + '%';
      if (q.nearLimit) bar.style.background = '#f59e0b';
    }
  }

  async function maybeLoadDefaultTemplates() {
    const existing = await window.JobFill.storage.getAnswerBank();
    if (existing.length > 0) return;
    await window.JobFill.storage.saveAnswerBank(DEFAULT_TEMPLATES);
  }

  function renderAnswerCard(entry) {
    const li = document.createElement('li');
    li.className = 'answer-card';
    li.dataset.id = entry.id;
    li.innerHTML = `
      <div class="answer-card-header">
        <span class="answer-card-question">${escapeHtml(entry.question)}</span>
        <div class="answer-card-actions">
          <button class="btn-edit-answer" data-id="${escapeHtml(entry.id)}" title="Edit">Edit</button>
          <button class="btn-delete-answer btn-danger-sm" data-id="${escapeHtml(entry.id)}" title="Delete">Delete</button>
        </div>
      </div>
      <div class="answer-card-meta">
        <span class="category-badge">${escapeHtml(entry.category)}</span>
      </div>
    `;
    return li;
  }

  async function renderAnswerBank() {
    const entries = await window.JobFill.storage.getAnswerBank();
    const list = document.getElementById('answers-list');
    const emptyMsg = document.getElementById('answers-empty');
    list.innerHTML = '';
    if (entries.length === 0) {
      emptyMsg.style.display = 'block';
    } else {
      emptyMsg.style.display = 'none';
      entries.forEach(entry => list.appendChild(renderAnswerCard(entry)));
    }
    await updateAnswersQuota();
  }

  function openModal(entry) {
    const modal = document.getElementById('answer-modal');
    document.getElementById('modal-title').textContent = entry ? 'Edit Entry' : 'Add Entry';
    document.getElementById('modal-entry-id').value = entry ? entry.id : '';
    document.getElementById('modal-question').value = entry ? entry.question : '';
    document.getElementById('modal-keywords').value = entry ? (entry.keywords || []).join(', ') : '';
    document.getElementById('modal-category').value = entry ? entry.category : 'general';
    document.getElementById('modal-answer').value = entry ? entry.answer : '';
    modal.style.display = 'flex';
  }

  function closeModal() {
    document.getElementById('answer-modal').style.display = 'none';
  }

  async function saveModalEntry() {
    const id = document.getElementById('modal-entry-id').value;
    const question = document.getElementById('modal-question').value.trim();
    const keywordsRaw = document.getElementById('modal-keywords').value;
    const category = document.getElementById('modal-category').value;
    const answer = document.getElementById('modal-answer').value.trim();

    if (!question || !answer) return; // silent guard — both required

    const keywords = keywordsRaw
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(Boolean);

    const entries = await window.JobFill.storage.getAnswerBank();

    if (id) {
      // Edit existing
      const idx = entries.findIndex(e => e.id === id);
      if (idx !== -1) {
        entries[idx] = { id, question, keywords, category, answer };
      }
    } else {
      // Add new
      entries.push({ id: crypto.randomUUID(), question, keywords, category, answer });
    }

    await window.JobFill.storage.saveAnswerBank(entries);
    closeModal();
    await renderAnswerBank();
  }

  async function deleteEntry(id) {
    const entries = await window.JobFill.storage.getAnswerBank();
    const updated = entries.filter(e => e.id !== id);
    await window.JobFill.storage.saveAnswerBank(updated);
    await renderAnswerBank();
  }

  function bindAnswerBank() {
    // Add button
    document.getElementById('btn-add-answer').addEventListener('click', () => openModal(null));

    // Modal save / cancel
    document.getElementById('modal-save').addEventListener('click', saveModalEntry);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);

    // Close modal on overlay click (outside modal-box)
    document.getElementById('answer-modal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('answer-modal')) closeModal();
    });

    // Edit and delete — event delegation on the list
    document.getElementById('answers-list').addEventListener('click', async (e) => {
      const editBtn = e.target.closest('.btn-edit-answer');
      const deleteBtn = e.target.closest('.btn-delete-answer');
      if (editBtn) {
        const id = editBtn.dataset.id;
        const entries = await window.JobFill.storage.getAnswerBank();
        const entry = entries.find(e => e.id === id);
        if (entry) openModal(entry);
      }
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        await deleteEntry(id);
      }
    });
  }

  // --- Init ---

  document.addEventListener('DOMContentLoaded', async function () {
    initTabs();
    initFillButton();
    await initProfileTab();
    await loadResume();
    bindResumeTab();
    await maybeLoadDefaultTemplates();   // seeds 10 templates if bank is empty
    await renderAnswerBank();
    bindAnswerBank();
    // Plan 05 will add: loadSettings(), initImportExport()
  });

})();

'use strict';
const { test, describe, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Minimal DOM environment — must be set up BEFORE requiring the platform module
// ---------------------------------------------------------------------------

// window = global (browser shim)
global.window = global;

// Minimal document with querySelector / querySelectorAll backed by a live map
const _domElements = new Map(); // id -> element object

function makeElement(tag, attrs) {
  const el = {
    tagName: tag.toUpperCase(),
    type: (attrs.type || '').toLowerCase(),
    id: attrs.id || '',
    name: attrs.name || '',
    placeholder: attrs.placeholder || '',
    autocomplete: attrs.autocomplete || '',
    _value: '',
    _attributes: Object.assign({}, attrs),
    _classes: (attrs.class || '').split(' ').filter(Boolean),
    _ariaLabel: attrs['aria-label'] || '',
    _for: attrs['for'] || '',
    _labelText: attrs._labelText || '',
    _prevSiblingLabel: null,
    _parentLabel: null,
    textContent: attrs._labelText || '',
    innerHTML: '',
    options: attrs.options || [],    // for SELECT
    selectedIndex: 0,
  };

  Object.defineProperty(el, 'value', {
    get: function () { return this._value; },
    set: function (v) { this._value = String(v); },
    configurable: true,
    enumerable: true,
  });

  el.getAttribute = function (name) {
    if (name === 'aria-label') return this._ariaLabel || null;
    return this._attributes[name] !== undefined ? String(this._attributes[name]) : null;
  };

  el.removeAttribute = function (name) {
    if (name === 'id') {
      _domElements.delete(this.id);
      this.id = '';
      this._attributes.id = '';
    } else {
      delete this._attributes[name];
    }
  };

  el.closest = function (selector) {
    if (selector === 'label') return this._parentLabel || null;
    return null;
  };

  el.matches = function () { return false; };

  return el;
}

function makeLabelEl(forAttr, text) {
  return {
    tagName: 'LABEL',
    htmlFor: forAttr,
    textContent: text,
    innerText: text,
  };
}

// Build DOM state from fixture
function buildDom() {
  _domElements.clear();

  const els = {
    first_name: makeElement('input', { id: 'first_name', name: 'first_name', type: 'text' }),
    last_name:  makeElement('input', { id: 'last_name',  name: 'last_name',  type: 'text' }),
    email:      makeElement('input', { id: 'email',      name: 'email',      type: 'email' }),
    phone:      makeElement('input', { id: 'phone',      name: 'phone',      type: 'tel' }),
    linkedin:   makeElement('input', { id: 'job_application_linkedin_profile', name: 'linkedin', type: 'text' }),
    resume:     makeElement('input', { id: 'resume',     name: 'resume',     type: 'file' }),
    cover:      makeElement('textarea', { id: 'cover_letter', name: 'cover_letter', type: '' }),
    location:   makeElement('select', {
      id: 'job_application_location', name: 'location', type: '',
      options: [
        { text: 'Select', value: '' },
        { text: 'Dubai', value: 'Dubai' },
        { text: 'Abu Dhabi', value: 'Abu Dhabi' },
      ],
    }),
    work_auth:  makeElement('select', { name: 'work_auth_question', type: '',
      options: [
        { text: 'Select', value: '' },
        { text: 'Yes, authorized', value: 'Yes' },
        { text: 'No', value: 'No' },
      ],
    }),
    custom_q1:  makeElement('textarea', { id: 'custom_q1', type: '' }),
  };

  // Labels
  const labels = {
    first_name: makeLabelEl('first_name', 'First Name'),
    last_name:  makeLabelEl('last_name',  'Last Name'),
    email:      makeLabelEl('email',      'Email'),
    phone:      makeLabelEl('phone',      'Phone'),
    linkedin:   makeLabelEl('job_application_linkedin_profile', 'LinkedIn Profile'),
    resume:     makeLabelEl('resume',     'Resume'),
    cover:      makeLabelEl('cover_letter', 'Cover Letter'),
    location:   makeLabelEl('job_application_location', 'Location'),
    custom_q1:  makeLabelEl('custom_q1', 'Why do you want this role?'),
  };

  // Wire up parent-label relationships (closest('label') fallback)
  els.custom_q1._parentLabel = labels.custom_q1;

  // Register by id
  for (const [, el] of Object.entries(els)) {
    if (el.id) _domElements.set(el.id, el);
  }

  return { els, labels };
}

// Global DOM state (reset per test)
let _currentDom = null;

// h1 elements for getJobDetails
const _h1s = {
  appTitle:    { tagName: 'H1', className: 'app-title',    textContent: 'Senior Product Manager' },
  companyName: { tagName: 'H1', className: 'company-name', textContent: 'Acme Corp' },
};

global.document = {
  querySelector: function (sel) {
    if (!_currentDom) return null;
    const { els } = _currentDom;

    // ID selectors
    if (sel === 'input#first_name' || sel === '#first_name') return els.first_name.id ? els.first_name : null;
    if (sel === 'input#last_name')  return els.last_name.id  ? els.last_name  : null;
    if (sel === 'input#email')      return els.email.id      ? els.email      : null;
    if (sel === 'input#phone')      return els.phone.id      ? els.phone      : null;
    if (sel === 'input#job_application_linkedin_profile') return els.linkedin.id ? els.linkedin : null;
    if (sel === 'input#resume')     return els.resume.id     ? els.resume     : null;
    if (sel === 'textarea#cover_letter') return els.cover.id ? els.cover      : null;
    if (sel === 'select#job_application_location') return els.location.id ? els.location : null;

    // Name selectors
    if (sel === 'input[name="first_name"]')  return els.first_name;
    if (sel === 'input[name="last_name"]')   return els.last_name;
    if (sel === 'input[name="email"]')       return els.email;
    if (sel === 'input[name="phone"]')       return els.phone;
    if (sel === 'input[name*="linkedin"]' || sel === 'input[name="linkedin"]') return els.linkedin;
    if (sel === 'input[name="resume"]')      return els.resume;
    if (sel === 'textarea[name="cover_letter"]') return els.cover;
    if (sel === 'input[name*="location"]')   return null;
    if (sel === 'select[name*="work_auth"]') return els.work_auth;
    if (sel === 'select[name*="authorization"]') return null;

    // Type selectors
    if (sel === 'input[type="email"]')       return els.email;
    if (sel === 'input[type="tel"]')         return els.phone;
    if (sel === 'input[type="file"][id*="resume"]') return els.resume.id ? els.resume : null;
    if (sel === 'input[type="radio"][name*="auth"]') return null;

    // Placeholder / autocomplete
    if (sel === 'input[autocomplete="given-name"]')  return null;
    if (sel === 'input[autocomplete="family-name"]') return null;
    if (sel.includes('placeholder*="linkedin"'))     return null;
    if (sel.includes('placeholder*="location"'))     return null;
    if (sel.includes('id*="cover"'))                 return els.cover.id ? els.cover : null;
    if (sel.includes('textarea[id*="cover"]'))       return els.cover.id ? els.cover : null;

    // h1 elements
    if (sel === 'h1.company-name') return _h1s.companyName;
    if (sel === 'h1.app-title')    return _h1s.appTitle;
    if (sel === 'h1')              return _h1s.appTitle;

    // Label selectors
    if (sel.startsWith('label[for=')) {
      const forId = sel.match(/label\[for="?([^"\]]+)"?\]/);
      if (forId) {
        const { labels } = _currentDom;
        for (const [, lbl] of Object.entries(labels)) {
          if (lbl.htmlFor === forId[1]) return lbl;
        }
      }
    }

    return null;
  },

  querySelectorAll: function (sel) {
    if (!_currentDom) return [];
    const { els } = _currentDom;

    if (sel === 'textarea, input[type="text"]') {
      // Return all textarea and text inputs
      return [
        els.first_name,   // text
        els.last_name,    // text
        els.linkedin,     // text
        els.cover,        // textarea
        els.custom_q1,    // textarea
      ];
    }
    return [];
  },

  get title() { return 'Senior Product Manager – Acme Corp'; },
};

// ---------------------------------------------------------------------------
// Set up window.JobFill stubs — done in `before` so module loads with stubs
// ---------------------------------------------------------------------------
before(() => {
  window.JobFill = {
    filler: {
      fillField: function (el, value) {
        if (el && el.type === 'file') return false;
        if (el) el.value = value;
        return true;
      },
    },
    events: {},
    matcher: {
      findBestAnswer: function () { return null; },
      substituteVariables: function (s) { return s; },
      matchDropdownOption: function () { return null; },
    },
    platforms: {},
  };

  // Load the module once with stubs ready
  require('../../platforms/greenhouse');
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('greenhouse', () => {

  beforeEach(() => {
    _currentDom = buildDom();

    // Reset matcher stubs to defaults before each test
    window.JobFill.matcher.findBestAnswer    = function () { return null; };
    window.JobFill.matcher.substituteVariables = function (s) { return s; };
    window.JobFill.matcher.matchDropdownOption = function () { return null; };
  });

  function gh() {
    return window.JobFill.platforms.greenhouse;
  }

  test('TEST: greenhouse matches greenhouse.io hostname → true', () => {
    assert.ok(gh(), 'greenhouse module must be registered');
    assert.strictEqual(gh().matches('jobs.greenhouse.io'), true);
  });

  test('TEST: greenhouse does not match lever.co hostname → false', () => {
    assert.ok(gh(), 'greenhouse module must be registered');
    assert.strictEqual(gh().matches('lever.co'), false);
  });

  test('TEST: greenhouse exposes matches, fill, getJobDetails functions', () => {
    assert.ok(gh(), 'greenhouse module must be registered');
    assert.strictEqual(typeof gh().matches, 'function');
    assert.strictEqual(typeof gh().fill, 'function');
    assert.strictEqual(typeof gh().getJobDetails, 'function');
  });

  test('TEST: greenhouse fill — first name filled from profile', async () => {
    assert.ok(gh(), 'greenhouse module must be registered');
    const results = await gh().fill({ firstName: 'Adarsh' }, []);
    const entry = results.find(r => r.field === 'First Name');
    assert.ok(entry, 'results must contain First Name entry');
    assert.strictEqual(entry.status, 'filled');
    assert.strictEqual(entry.value, 'Adarsh');
  });

  test('TEST: greenhouse fill — email filled from profile', async () => {
    assert.ok(gh(), 'greenhouse module must be registered');
    const results = await gh().fill({ email: 'test@example.com' }, []);
    const entry = results.find(r => r.field === 'Email');
    assert.ok(entry, 'results must contain Email entry');
    assert.strictEqual(entry.status, 'filled');
    assert.strictEqual(entry.value, 'test@example.com');
  });

  test('TEST: greenhouse fill — file input skipped with reason \'resume upload in Phase 11\'', async () => {
    assert.ok(gh(), 'greenhouse module must be registered');
    const results = await gh().fill({}, []);
    const entry = results.find(r => r.field === 'Resume');
    assert.ok(entry, 'results must contain Resume entry');
    assert.strictEqual(entry.status, 'skipped');
    assert.strictEqual(entry.reason, 'resume upload in Phase 11');
  });

  test('TEST: greenhouse fill — already-filled field skipped with reason \'already has value\'', async () => {
    assert.ok(gh(), 'greenhouse module must be registered');
    // Pre-fill the first name field
    _currentDom.els.first_name.value = 'AlreadyFilled';
    const results = await gh().fill({ firstName: 'Adarsh' }, []);
    const entry = results.find(r => r.field === 'First Name');
    assert.ok(entry, 'results must contain First Name entry');
    assert.strictEqual(entry.status, 'skipped');
    assert.strictEqual(entry.reason, 'already has value');
  });

  test('TEST: greenhouse fill — fallback selector used when primary not found', async () => {
    assert.ok(gh(), 'greenhouse module must be registered');
    // Remove id so input#first_name fails; name selector still works
    _currentDom.els.first_name.id = '';
    delete _currentDom.els.first_name._attributes.id;
    const results = await gh().fill({ firstName: 'Adarsh' }, []);
    const entry = results.find(r => r.field === 'First Name');
    assert.ok(entry, 'results must contain First Name entry even via fallback');
    assert.strictEqual(entry.status, 'filled');
  });

  test('TEST: greenhouse fill — custom question filled from answer bank (confidence >= 0.75)', async () => {
    assert.ok(gh(), 'greenhouse module must be registered');
    window.JobFill.matcher.findBestAnswer = function (questionText) {
      if (/why.*role/i.test(questionText)) {
        return { entry: { answer: 'I am passionate about this role.' }, score: 0.9 };
      }
      return null;
    };
    window.JobFill.matcher.substituteVariables = function (s) { return s; };
    const results = await gh().fill({}, []);
    const entry = results.find(r => r.field === 'Why do you want this role?');
    assert.ok(entry, 'results must contain custom question entry');
    assert.strictEqual(entry.status, 'filled');
  });

  test('TEST: greenhouse fill — needs_review when answer has unresolved variables', async () => {
    assert.ok(gh(), 'greenhouse module must be registered');
    window.JobFill.matcher.findBestAnswer = function () {
      return { entry: { answer: 'I want to join {{company_name}} because of its mission.' }, score: 0.9 };
    };
    window.JobFill.matcher.substituteVariables = function (s) { return s; };
    const results = await gh().fill({}, []);
    const entry = results.find(r => r.status === 'needs_review');
    assert.ok(entry, 'results must contain a needs_review entry');
    assert.ok(entry.value && entry.value.includes('{{'), 'value must contain unresolved {{token}}');
  });

});

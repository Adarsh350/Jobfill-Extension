'use strict';
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const fs = require('fs');
const { setupGlobals, MockElement, MockMutationObserver } = require('../helpers/dom-mock');

setupGlobals();
global.window = global;

// --- Mocks required for Phase 11 resume primitives ---

// Minimal File + Blob + DataTransfer mock
global.Blob = class Blob {
  constructor(parts, opts) { this._parts = parts; this.type = (opts && opts.type) || ''; }
};
global.File = class File {
  constructor(parts, name, opts) {
    this._parts = parts; this.name = name;
    this.type = (opts && opts.type) || '';
    this.size = (parts[0] && parts[0]._parts && parts[0]._parts[0])
      ? parts[0]._parts[0].length : 0;
  }
};
global.DataTransfer = class DataTransfer {
  constructor() { this._files = []; }
  get items() {
    const self = this;
    return { add(f) { self._files.push(f); } };
  }
  get files() {
    const arr = this._files.slice();
    arr.length = this._files.length;
    return arr;
  }
};
global.CSS = { escape: (s) => s.replace(/[^\w-]/g, '\\$&') };
global.atob = (b64) => Buffer.from(b64, 'base64').toString('binary');

// window.JobFill.storage mock — overridden per test
global.window = global;
global.JobFill = global.JobFill || {};
global.JobFill.storage = {
  getResume: async () => null,
};

eval(fs.readFileSync('./utils/events.js', 'utf8'));
eval(fs.readFileSync('./utils/filler.js', 'utf8'));
const filler = global.JobFill.filler;

describe('filler.js — fill lock', () => {
  // TEST: NFR-5.1 fill-lock-blocks-concurrent
  it('startFill returns false when fill already in progress', () => {
    filler.endFill(); // ensure clean state
    assert.strictEqual(filler.startFill(), true);
    assert.strictEqual(filler.startFill(), false); // locked
    assert.strictEqual(filler.isFilling(), true);
    filler.endFill();
  });
  // TEST: NFR-5.1 end-fill-releases-lock
  it('endFill releases lock so next startFill returns true', () => {
    filler.endFill(); // ensure clean state
    assert.strictEqual(filler.startFill(), true);
    assert.strictEqual(filler.isFilling(), true);
    filler.endFill();
    assert.strictEqual(filler.isFilling(), false);
    assert.strictEqual(filler.startFill(), true); // lock released
    filler.endFill();
  });
});

describe('filler.js — shadowQuery', () => {
  // TEST: FR-2.2 shadow-query-open-root
  it('finds element inside open shadow root', () => {
    const host   = new MockElement('div', '');
    const shadow = new MockElement('div', '');
    const target = new MockElement('input', 'text');
    target._selector = 'input[type=text]';
    shadow.children  = [target];
    shadow.querySelector   = (sel) => target._selector === sel ? target : null;
    shadow.querySelectorAll = (sel) => shadow.querySelector(sel) ? [target] : [];
    host.shadowRoot = shadow;

    const root = new MockElement('div', '');
    root.querySelectorAll = (sel) => sel === '*' ? [host] : [];
    root.querySelector    = () => null;

    const found = filler.shadowQuery(root, 'input[type=text]');
    assert.strictEqual(found, target);
  });
  // TEST: FR-2.2 shadow-query-not-found
  it('returns null when element not in tree', () => {
    const host   = new MockElement('div', '');
    const shadow = new MockElement('div', '');
    shadow.querySelector    = () => null;
    shadow.querySelectorAll = () => [];
    host.shadowRoot = shadow;

    const root = new MockElement('div', '');
    root.querySelectorAll = (sel) => sel === '*' ? [host] : [];
    root.querySelector    = () => null;

    assert.strictEqual(filler.shadowQuery(root, 'input[type=email]'), null);
  });
});

describe('filler.js — waitForElement', () => {
  // TEST: NFR-3.3 wait-resolves-on-appear
  it('resolves when element appears within timeout', async () => {
    let observerInstance;
    global.MutationObserver = class {
      constructor(cb) { this._cb = cb; observerInstance = this; this._observing = false; }
      observe()     { this._observing = true; }
      disconnect()  { this._observing = false; }
    };

    const mockRoot = new MockElement('div', '');
    let callCount  = 0;
    mockRoot.querySelector = () => {
      callCount++;
      return callCount >= 2 ? new MockElement('input', 'text') : null;
    };

    const p = filler.waitForElement('input', 500, mockRoot);
    observerInstance._cb([]); // trigger mutation
    const el = await p;
    assert.ok(el instanceof MockElement);
    assert.ok(!observerInstance._observing); // disconnected

    // restore
    global.MutationObserver = MockMutationObserver;
  });
  // TEST: NFR-3.3 wait-rejects-on-timeout
  it('rejects after timeout if element never appears', async () => {
    const mockRoot2 = new MockElement('div', '');
    mockRoot2.querySelector = () => null;
    await assert.rejects(
      filler.waitForElement('input', 50, mockRoot2),
      /not found|timed out/
    );
  });
});

// --- Phase 11: Resume Upload Primitives ---

describe('filler.js — dataUrlToFile', () => {
  // TEST: 11-01 dataUrlToFile-returns-file
  it('converts a base64 data URL into a File with correct name and type', () => {
    // "hello" in base64 is "aGVsbG8="
    const dataUrl = 'data:application/pdf;base64,aGVsbG8=';
    const file = filler.dataUrlToFile(dataUrl, 'test.pdf', 'application/pdf');
    assert.ok(file instanceof global.File);
    assert.strictEqual(file.name, 'test.pdf');
    assert.strictEqual(file.type, 'application/pdf');
  });
});

describe('filler.js — findResumeFileInput', () => {
  // TEST: 11-01 findResumeFileInput-null-when-no-inputs
  it('returns null when no file inputs exist in scope', () => {
    const root = new MockElement('div', '');
    root.querySelectorAll = () => [];
    assert.strictEqual(filler.findResumeFileInput(root), null);
  });

  // TEST: 11-01 findResumeFileInput-single-input
  it('returns the only file input when exactly one exists', () => {
    const input = new MockElement('input', 'file');
    const root = new MockElement('div', '');
    root.querySelectorAll = (sel) => sel === 'input[type="file"]' ? [input] : [];
    assert.strictEqual(filler.findResumeFileInput(root), input);
  });

  // TEST: 11-01 findResumeFileInput-scores-resume-keyword
  it('returns the input with "resume" in its name when multiple file inputs exist', () => {
    const generic = new MockElement('input', 'file');
    generic.name = 'attachment';
    generic.id = '';
    generic.accept = '';
    generic.getAttribute = (a) => a === 'aria-label' ? '' : null;
    generic.closest = () => null;

    const resumeInput = new MockElement('input', 'file');
    resumeInput.name = 'resume';
    resumeInput.id = '';
    resumeInput.accept = '';
    resumeInput.getAttribute = (a) => a === 'aria-label' ? '' : null;
    resumeInput.closest = () => null;

    const root = new MockElement('div', '');
    root.querySelectorAll = (sel) => sel === 'input[type="file"]' ? [generic, resumeInput] : [];
    assert.strictEqual(filler.findResumeFileInput(root), resumeInput);
  });
});

describe('filler.js — attachResume', () => {
  // TEST: 11-01 attachResume-skipped-when-no-resume
  it('returns { status: skipped, reason: no_resume_stored } when no resume in storage', async () => {
    global.JobFill.storage.getResume = async () => null;
    const input = new MockElement('input', 'file');
    input.files = [];
    input.dispatchEvent = () => {};
    const result = await filler.attachResume(input);
    assert.deepStrictEqual(result, { status: 'skipped', reason: 'no_resume_stored' });
  });

  // TEST: 11-01 attachResume-failed-when-too-large
  it('returns { status: failed, reason: resume_too_large } when resume exceeds 5 MB', async () => {
    global.JobFill.storage.getResume = async () => ({
      name: 'big.pdf', dataUrl: 'data:application/pdf;base64,aGVsbG8=',
      mimeType: 'application/pdf', size: 6 * 1024 * 1024,
    });
    const input = new MockElement('input', 'file');
    input.dispatchEvent = () => {};
    const result = await filler.attachResume(input);
    assert.deepStrictEqual(result, { status: 'failed', reason: 'resume_too_large' });
  });

  // TEST: 11-01 attachResume-filled-when-datatransfer-works
  it('returns { status: filled } when DataTransfer assignment succeeds', async () => {
    global.JobFill.storage.getResume = async () => ({
      name: 'resume.pdf', dataUrl: 'data:application/pdf;base64,aGVsbG8=',
      mimeType: 'application/pdf', size: 1024,
    });
    const input = new MockElement('input', 'file');
    input.name = 'resumeFile';
    input.dispatchEvent = () => {};
    // Simulate successful DataTransfer: files.length > 0 after assignment
    let assignedFiles;
    Object.defineProperty(input, 'files', {
      set(v) { assignedFiles = v; },
      get()  { return assignedFiles && assignedFiles.length > 0 ? assignedFiles : (assignedFiles || []); },
      configurable: true,
    });
    const result = await filler.attachResume(input);
    assert.strictEqual(result.status, 'filled');
    assert.strictEqual(result.field, 'resumeFile');
  });

  // TEST: 11-01 attachResume-null-when-files-empty-after-assign
  it('returns null when files.length stays 0 after DataTransfer (React cross-world signal)', async () => {
    global.JobFill.storage.getResume = async () => ({
      name: 'resume.pdf', dataUrl: 'data:application/pdf;base64,aGVsbG8=',
      mimeType: 'application/pdf', size: 1024,
    });
    const input = new MockElement('input', 'file');
    input.dispatchEvent = () => {};
    // files.length always 0 (React isolated world blocks assignment)
    Object.defineProperty(input, 'files', {
      set() {}, get() { return []; },
      configurable: true,
    });
    const result = await filler.attachResume(input);
    assert.strictEqual(result, null);
  });
});

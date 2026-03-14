'use strict';
const { describe, it } = require('node:test');
const { setupGlobals, MockElement, MockMutationObserver } = require('../helpers/dom-mock');

setupGlobals();

describe('filler.js — fill lock', () => {
  // TEST: NFR-5.1 fill-lock-blocks-concurrent
  it('startFill returns false when fill already in progress', { todo: 'implement in Wave 1' }, () => {});
  // TEST: NFR-5.1 end-fill-releases-lock
  it('endFill releases lock so next startFill returns true', { todo: 'implement in Wave 1' }, () => {});
});

describe('filler.js — shadowQuery', () => {
  // TEST: FR-2.2 shadow-query-open-root
  it('finds element inside open shadow root', { todo: 'implement in Wave 1' }, () => {});
  // TEST: FR-2.2 shadow-query-not-found
  it('returns null when element not in tree', { todo: 'implement in Wave 1' }, () => {});
});

describe('filler.js — waitForElement', () => {
  // TEST: NFR-3.3 wait-resolves-on-appear
  it('resolves when element appears within timeout', { todo: 'implement in Wave 1' }, () => {});
  // TEST: NFR-3.3 wait-rejects-on-timeout
  it('rejects after timeout if element never appears', { todo: 'implement in Wave 1' }, () => {});
});

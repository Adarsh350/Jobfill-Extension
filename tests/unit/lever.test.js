'use strict';
const { test, describe } = require('node:test');
require('../helpers/dom-mock');

// Load module under test (may not exist yet)
let lv = null;
try {
  require('../../platforms/lever');
  lv = (window.JobFill && window.JobFill.platforms && window.JobFill.platforms.lever) || null;
} catch (e) { /* module not yet implemented */ }

describe('lever', () => {
  test('TEST: lever matches lever.co hostname → true', { todo: 'not implemented' }, () => {});
  test('TEST: lever does not match greenhouse.io hostname → false', { todo: 'not implemented' }, () => {});
  test('TEST: lever exposes matches, fill, getJobDetails functions', { todo: 'not implemented' }, () => {});
  test('TEST: lever fill — full name filled from profile', { todo: 'not implemented' }, () => {});
  test('TEST: lever fill — email filled from profile', { todo: 'not implemented' }, () => {});
  test('TEST: lever fill — file input skipped with reason \'resume upload in Phase 11\'', { todo: 'not implemented' }, () => {});
  test('TEST: lever fill — already-filled field skipped', { todo: 'not implemented' }, () => {});
  test('TEST: lever fill — data-qa custom question filled from answer bank', { todo: 'not implemented' }, () => {});
});

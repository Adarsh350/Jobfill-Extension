'use strict';
const { test, describe } = require('node:test');
require('../helpers/dom-mock');

// Load module under test (may not exist yet)
let gh = null;
try {
  require('../../platforms/greenhouse');
  gh = (window.JobFill && window.JobFill.platforms && window.JobFill.platforms.greenhouse) || null;
} catch (e) { /* module not yet implemented */ }

describe('greenhouse', () => {
  test('TEST: greenhouse matches greenhouse.io hostname → true', { todo: 'not implemented' }, () => {});
  test('TEST: greenhouse does not match lever.co hostname → false', { todo: 'not implemented' }, () => {});
  test('TEST: greenhouse exposes matches, fill, getJobDetails functions', { todo: 'not implemented' }, () => {});
  test('TEST: greenhouse fill — first name filled from profile', { todo: 'not implemented' }, () => {});
  test('TEST: greenhouse fill — email filled from profile', { todo: 'not implemented' }, () => {});
  test('TEST: greenhouse fill — file input skipped with reason \'resume upload in Phase 11\'', { todo: 'not implemented' }, () => {});
  test('TEST: greenhouse fill — already-filled field skipped with reason \'already has value\'', { todo: 'not implemented' }, () => {});
  test('TEST: greenhouse fill — fallback selector used when primary not found', { todo: 'not implemented' }, () => {});
  test('TEST: greenhouse fill — custom question filled from answer bank (confidence >= 0.75)', { todo: 'not implemented' }, () => {});
  test('TEST: greenhouse fill — needs_review when answer has unresolved variables', { todo: 'not implemented' }, () => {});
});

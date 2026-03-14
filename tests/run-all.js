'use strict';
// Runs all unit test files. Usage: node tests/run-all.js
const { spawnSync } = require('child_process');
const files = [
  'tests/unit/events.test.js',
  'tests/unit/filler.test.js',
];
let failed = false;
for (const f of files) {
  const r = spawnSync(process.execPath, ['--test', f], { stdio: 'inherit' });
  if (r.status !== 0) { failed = true; }
}
process.exit(failed ? 1 : 0);

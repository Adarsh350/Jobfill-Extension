var fs = require('fs');
var src = fs.readFileSync('C:/Users/JobSearch/Documents/Projects/content.js', 'utf8');
var checks = [
  ['non-async listener', /addListener\(function\s*\(msg/.test(src) && /addListener\(async/.test(src) === false],
  ['return true present', /return true/.test(src)],
  ['fill lock isFilling check', /isFilling\(\)/.test(src)],
  ['startFill called', /startFill\(\)/.test(src)],
  ['endFill in finally', /finally[\s\S]{0,80}endFill/.test(src)],
  ['overlay-host guard', /jobfill-overlay-host/.test(src)],
  ['platform fallback guard', /platforms\s*\|\|\s*\{\}/.test(src)],
  ['MutationObserver present', /MutationObserver/.test(src)],
  ['invalidated catch', /Extension context invalidated/.test(src)],
  ['tabId capture from msg', /msg\.tabId/.test(src)],
];
var pass = true;
checks.forEach(function(c) {
  var ok = c[1];
  console.log((ok ? 'PASS' : 'FAIL') + ': ' + c[0]);
  if (!ok) pass = false;
});
process.exit(pass ? 0 : 1);

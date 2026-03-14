# Phase 5: Fuzzy Matcher & Answer Bank Engine - Research

**Researched:** 2026-03-14
**Domain:** Pure-function string matching, Levenshtein distance, Jaccard similarity, alias normalization, variable substitution — vanilla JS, no dependencies
**Confidence:** HIGH

---

## Summary

Phase 5 implements `utils/matcher.js` as a fully self-contained, pure-function module. Every function takes inputs and returns outputs with no side effects, no storage reads, and no Chrome API calls. This makes the entire module trivially unit-testable with `node:test` in Node.js without any browser environment.

The two hardest correctness problems are (1) the dropdown alias map, which must handle Gulf/MENA country names and abbreviations without accidentally matching near-neighbors (e.g., "US" must not match "UAE", "United Arab Emirates" must not match "United States"), and (2) the answer bank scoring threshold of 0.75, which is a conservative floor designed to prevent wrong-answer autofill. A false negative (field left blank) is always safer than a false positive (wrong answer filled).

The module exposes its namespace via `window.JobFill.matcher` using the same IIFE pattern established in `utils/storage.js`. All seven functions are pure and synchronous.

**Primary recommendation:** Implement Levenshtein with the single-row space optimisation, build the alias map as a plain object literal with lowercase keys, and compute Jaccard on token sets (not character n-grams). Use `node:test` + `node:assert` with no external test runner.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FR-2.4 | Fill dropdown fields using fuzzy matching: exact → alias map → case-insensitive includes → Levenshtein ≤ 3 | `matchDropdownOption` four-tier cascade; alias map covers UAE/Gulf variants |
| FR-3.4 | Match open-ended questions against answer bank by keyword overlap + category alignment; require confidence > 0.75 | `scoreAnswerBankEntry` Jaccard + category bonus; `findBestAnswer` threshold gate |
| FR-3.5 | Variable substitution in answers: `{{company_name}}`, `{{job_title}}`, `{{my_name}}`, `{{years_experience}}`, `{{current_company}}`, `{{target_role}}` | `substituteVariables` regex replace over `{{key}}` tokens |
| FR-3.7 | If confidence < 0.75 or variable cannot be resolved: leave field blank and flag for user review | `findBestAnswer` returns null below threshold; `substituteVariables` leaves unresolved tokens visible |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` | Node 18+ built-in | Unit test runner | Zero-install, built into Node, no npm required — matches NFR-1.2 |
| `node:assert` | Node 18+ built-in | Assertions | Paired with `node:test`; strict mode available |

### No External Dependencies
This phase is 100% vanilla JS by requirement (NFR-1.2, NFR-1.4). No npm packages, no lodash, no fuse.js, no external fuzzy libraries. All algorithms are hand-rolled but well-defined (Levenshtein, Jaccard).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled Levenshtein | `fuse.js` or `leven` npm package | Forbidden by NFR-1.2/1.4 — zero external deps |
| Jaccard token overlap | TF-IDF cosine similarity | Jaccard is simpler, explainable, sufficient at this scale; TF-IDF requires corpus statistics |
| Plain object alias map | `Map` or trie | Plain object is simpler, JSON-serialisable, sufficient for ~20-30 entries |

---

## Architecture Patterns

### Module Namespace Pattern (matches storage.js)
```javascript
// Source: utils/storage.js — established project pattern
window.JobFill = window.JobFill || {};
window.JobFill.matcher = (function () {
  // private helpers
  // ...
  return { matchDropdownOption, scoreAnswerBankEntry, findBestAnswer,
           substituteVariables, extractKeywords };
})();
```

### Recommended File Structure
```
utils/
├── storage.js       # Phase 2 — complete
├── events.js        # Phase 4 — complete
└── matcher.js       # Phase 5 — this phase

tests/
└── matcher.test.js  # Phase 5 tests — node:test
```

### Pattern 1: Single-Row Levenshtein (Space-Optimised)
**What:** Classic dynamic programming edit distance using only two arrays (previous row + current row) instead of a full matrix.
**When to use:** Short strings (dropdown option labels, question text up to ~200 chars). O(m*n) time, O(min(m,n)) space.
**Example:**
```javascript
// Space-optimised single-row Levenshtein
function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  // ensure a is the shorter string for space optimisation
  if (a.length > b.length) { const t = a; a = b; b = t; }
  let prev = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    const curr = [j];
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(prev[i] + 1, curr[i - 1] + 1, prev[i - 1] + cost);
    }
    prev = curr;
  }
  return prev[a.length];
}
```

### Pattern 2: Alias Map (Gulf/MENA Context)
**What:** Normalisation lookup keyed on lowercase abbreviation → full canonical form.
**When to use:** Applied before Levenshtein in the `matchDropdownOption` cascade to prevent abbreviation mismatches.

Critical pairs for this project's user profile (Abu Dhabi, UAE Golden Visa):
```javascript
const ALIAS_MAP = {
  // Countries — abbreviation to canonical
  'uae':  'united arab emirates',
  'usa':  'united states',
  'us':   'united states',
  'uk':   'united kingdom',
  'gb':   'united kingdom',
  'ksa':  'saudi arabia',
  'sa':   'saudi arabia',       // context-dependent; prefer 'ksa'
  'gcc':  'gulf cooperation council',
  // Work authorisation aliases
  'golden visa': 'uae golden visa',
  'gc':   'green card',
  // Experience shorthand
  'yoe':  'years of experience',
  // Nationality
  'indian': 'india',            // some dropdowns use demonym, some use country
  'emirati': 'united arab emirates',
};
```

**Collision risk:** "US" vs "UAE" — resolved because alias lookup is exact (after lowercasing), not fuzzy. "SA" is ambiguous (Saudi Arabia vs South Africa); prefer "KSA".

### Pattern 3: matchDropdownOption — Four-Tier Cascade
**What:** Ordered fallback strategy for selecting a dropdown `<option>` that matches a target value.
**When to use:** Every `<select>` field fill operation.

```javascript
function matchDropdownOption(options, targetValue) {
  // options: Array<{ value: string, text: string }>
  // returns matched option object or null
  const target = String(targetValue).trim();
  const targetLower = target.toLowerCase();
  const aliasExpanded = ALIAS_MAP[targetLower] || targetLower;

  // Tier 1: exact match (value or text)
  for (const opt of options) {
    if (opt.value === target || opt.text === target) return opt;
  }
  // Tier 2: alias-expanded exact (case-insensitive)
  for (const opt of options) {
    if (opt.text.toLowerCase() === aliasExpanded ||
        opt.value.toLowerCase() === aliasExpanded) return opt;
  }
  // Tier 3: case-insensitive includes
  for (const opt of options) {
    if (opt.text.toLowerCase().includes(aliasExpanded) ||
        aliasExpanded.includes(opt.text.toLowerCase())) return opt;
  }
  // Tier 4: Levenshtein ≤ 3 (on text label only)
  let best = null, bestDist = Infinity;
  for (const opt of options) {
    const d = levenshtein(opt.text.toLowerCase(), aliasExpanded);
    if (d < bestDist) { bestDist = d; best = opt; }
  }
  return bestDist <= 3 ? best : null;
}
```

### Pattern 4: Jaccard Token Overlap for Answer Bank Scoring
**What:** Intersection-over-union of word token sets between the page question and the stored entry's keywords + question text.
**When to use:** `scoreAnswerBankEntry` — scores a single (question, entry) pair.

```javascript
function jaccard(setA, setB) {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}
```

Scoring formula:
```
score = (jaccard_weight * jaccardScore) + (category_weight * categoryBonus)
```
Recommended weights: `jaccard_weight = 0.8`, `category_weight = 0.2`. Category bonus = 1.0 if the inferred question category matches the entry's category, else 0.

### Pattern 5: extractKeywords — Stop Word Filter
**What:** Lowercases, strips punctuation, removes stop words, returns token array.
**When to use:** Called on both page question text and stored entry question before Jaccard comparison.

```javascript
const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should',
  'may','might','shall','can','need','dare','ought','used',
  'i','you','he','she','it','we','they','me','him','her','us','them',
  'my','your','his','its','our','their',
  'this','that','these','those','which','who','what','how','why','when','where',
  'and','or','but','if','in','on','at','to','for','of','with','by',
  'from','up','about','into','through','during','before','after',
  'above','below','between','out','off','over','under','again',
  'do','please','tell','us','your','you','are',
]);

function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}
```

### Pattern 6: substituteVariables
**What:** Replaces `{{key}}` tokens with values from a variables map. Unresolved tokens are left as-is (visible to user per FR-3.7).

```javascript
function substituteVariables(answerText, variables) {
  // variables: { company_name: 'Acme', job_title: 'PM', ... }
  return answerText.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(variables, key)
      ? variables[key]
      : match; // leave {{key}} visible if not resolved
  });
}
```

### Anti-Patterns to Avoid
- **Fuzzy alias lookup:** Never run the alias map through Levenshtein — alias keys must be exact matches (after lowercasing) to avoid false expansions like "sa" → "saudi arabia" matching "salary".
- **Mutating input arrays:** All functions are pure — never sort or modify the `options` array passed to `matchDropdownOption`.
- **Deleting unresolved template variables:** FR-3.7 explicitly requires leaving `{{key}}` visible so the user knows to fill it manually.
- **Using `new RegExp(userInput)`:** Variable keys in `substituteVariables` come from stored data, not raw user input, but the regex pattern is fixed (`/\{\{(\w+)\}\}/g`) — safe.
- **Returning scores above 1.0:** Cap the combined score at 1.0 after weighted sum.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stop word list | Custom domain list | Pre-agreed list in STOP_WORDS constant (see above) | Domain-specific additions cause test fragility; a fixed agreed list is testable |
| Alias map lookup | Trie, fuzzy alias search | Plain object with `ALIAS_MAP[key]` | Aliases must be exact — fuzzy alias lookup defeats the purpose |
| Test runner | Custom assert loop | `node:test` + `node:assert/strict` | Built-in, zero install, outputs TAP, integrates with CI |

---

## Common Pitfalls

### Pitfall 1: "US" Matches "UAE" Under Levenshtein
**What goes wrong:** Levenshtein("us", "uae") = 2, which is ≤ 3. If the alias map is skipped or the cascade falls through to Levenshtein before alias resolution, "US" could match the "UAE" option.
**Why it happens:** Short strings have low edit distance to each other.
**How to avoid:** Alias map must run before Levenshtein. The alias map converts "us" → "united states" before any fuzzy comparison. "United states" vs "United Arab Emirates" has Levenshtein > 3.
**Warning signs:** Test `matchDropdownOption([{text:'United Arab Emirates',...},{text:'United States',...}], 'US')` returns UAE.

### Pitfall 2: Jaccard Returns 0 on Every Question (Over-Aggressive Stop Words)
**What goes wrong:** A question like "Are you legally authorised to work?" reduces to just ["legally", "authorised", "work"] after stop word removal. If the answer bank entry keywords don't include these exact stems, Jaccard = 0 and nothing matches.
**Why it happens:** Stop word list too aggressive or keyword list in entry too narrow.
**How to avoid:** Ship 10 pre-populated entries (FR-3.8) with rich keyword arrays. Test extractKeywords output on representative questions during development.
**Warning signs:** `findBestAnswer` always returns null in integration testing.

### Pitfall 3: Category Inference Is Wrong
**What goes wrong:** `scoreAnswerBankEntry` awards a 0.2 category bonus but the category is inferred incorrectly from question text, inflating the score for a wrong entry.
**Why it happens:** Category inference is heuristic (keyword presence in question text).
**How to avoid:** Use a simple keyword-to-category map for inference. When category cannot be inferred confidently, set category bonus to 0 rather than guessing. The 0.75 threshold is the final safety net.

### Pitfall 4: substituteVariables Deletes Unresolved Placeholders
**What goes wrong:** Template answer has `{{target_role}}` but variables map doesn't have that key. Replacement removes the token and the answer reads as if the variable was empty.
**Why it happens:** Regex replace with empty string fallback instead of leaving match intact.
**How to avoid:** The replacement function must return `match` (the full `{{key}}` string) when the key is not found — never an empty string or undefined.

### Pitfall 5: Levenshtein Called on Long Strings (Performance)
**What goes wrong:** `scoreAnswerBankEntry` passes full question text (100+ words) to Levenshtein, causing O(n*m) cost per answer bank entry.
**Why it happens:** Levenshtein used where token-set Jaccard should be used.
**How to avoid:** Levenshtein is only for `matchDropdownOption` (short labels, typically < 40 chars). `scoreAnswerBankEntry` must use Jaccard on keyword tokens, not Levenshtein on raw text.

---

## Code Examples

### node:test test file structure
```javascript
// tests/matcher.test.js
// Run: node --test tests/matcher.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Load matcher module — IIFE sets window.JobFill.matcher in browser context.
// For Node testing, export functions directly or use a test shim.
// Recommended: matcher.js checks `typeof window !== 'undefined'` before attaching.
import { levenshtein, matchDropdownOption, extractKeywords,
         scoreAnswerBankEntry, findBestAnswer, substituteVariables } from '../utils/matcher.js';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => assert.equal(levenshtein('abc', 'abc'), 0));
  it('returns length for empty string', () => assert.equal(levenshtein('', 'abc'), 3));
  it('US vs UAE is 2', () => assert.equal(levenshtein('us', 'uae'), 2));
});

describe('matchDropdownOption', () => {
  const opts = [
    { value: 'ae', text: 'United Arab Emirates' },
    { value: 'us', text: 'United States' },
    { value: 'uk', text: 'United Kingdom' },
  ];
  it('alias UAE → United Arab Emirates', () => {
    assert.equal(matchDropdownOption(opts, 'UAE').text, 'United Arab Emirates');
  });
  it('alias US → United States (not UAE)', () => {
    assert.equal(matchDropdownOption(opts, 'US').text, 'United States');
  });
  it('returns null for no match', () => {
    assert.equal(matchDropdownOption(opts, 'Zorgon'), null);
  });
});

describe('substituteVariables', () => {
  it('replaces known keys', () => {
    assert.equal(
      substituteVariables('Hello {{my_name}}', { my_name: 'Adarsh' }),
      'Hello Adarsh'
    );
  });
  it('leaves unknown keys visible', () => {
    assert.equal(
      substituteVariables('At {{company_name}}', {}),
      'At {{company_name}}'
    );
  });
});
```

### Node.js ES module export shim (for testability without browser)
```javascript
// Bottom of utils/matcher.js — dual export pattern
if (typeof window !== 'undefined') {
  window.JobFill = window.JobFill || {};
  window.JobFill.matcher = { matchDropdownOption, scoreAnswerBankEntry,
                              findBestAnswer, substituteVariables, extractKeywords };
}
// Node.js test environment
if (typeof module !== 'undefined') {
  module.exports = { levenshtein, matchDropdownOption, scoreAnswerBankEntry,
                     findBestAnswer, substituteVariables, extractKeywords };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full Levenshtein matrix | Single-row space-optimised | Well-established | Halves memory, same result |
| `require('leven')` npm package | Hand-rolled, zero deps | Always forbidden here (NFR-1.2) | No installation, fully auditable |
| Cosine TF-IDF for question matching | Jaccard token overlap | N/A — chose simpler | No corpus needed, same quality at small scale |
| Mocha/Jest test runner | `node:test` built-in | Node 18 (2022) | Zero install, passes NFR-1.2/1.4 |

---

## Open Questions

1. **Category inference heuristic**
   - What we know: Each answer bank entry has a `category` field (FR-3.2); scoring uses category alignment
   - What's unclear: How to infer category from arbitrary page question text without ML
   - Recommendation: Build a small keyword-to-category map (e.g., "salary" → salary, "work permit" → work_auth). Planner should include this map as a task deliverable.

2. **Jaccard weight tuning (0.8/0.2 split)**
   - What we know: 0.75 threshold is locked (FR-3.4)
   - What's unclear: Optimal weighting of keyword overlap vs category bonus
   - Recommendation: Start with 0.8/0.2. Include a test that verifies a known-good match scores ≥ 0.75 and a known-bad near-miss scores < 0.75. Adjust weights if tests fail.

3. **ES module vs IIFE for test compatibility**
   - What we know: Browser requires IIFE/global namespace; `node:test` works best with ESM or CJS exports
   - What's unclear: Whether the dual-export shim pattern (shown above) is preferred or if a separate test fixture wrapper is cleaner
   - Recommendation: Use the `typeof window` dual-export pattern — keeps one source file, no build step.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (Node 18+ built-in) |
| Config file | none — no config file needed |
| Quick run command | `node --test tests/matcher.test.js` |
| Full suite command | `node --test tests/matcher.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-2.4 | `matchDropdownOption` four-tier cascade: exact, alias, includes, Levenshtein ≤ 3 | unit | `node --test tests/matcher.test.js` | Wave 0 |
| FR-2.4 | Alias map: UAE→UAE, US→United States, UK→United Kingdom (no cross-collision) | unit | `node --test tests/matcher.test.js` | Wave 0 |
| FR-3.4 | `scoreAnswerBankEntry` returns 0-1 score using Jaccard + category alignment | unit | `node --test tests/matcher.test.js` | Wave 0 |
| FR-3.4 | `findBestAnswer` returns null when best score < 0.75 | unit | `node --test tests/matcher.test.js` | Wave 0 |
| FR-3.4 | `findBestAnswer` returns {entry, score} when score ≥ 0.75 | unit | `node --test tests/matcher.test.js` | Wave 0 |
| FR-3.5 | `substituteVariables` replaces all known `{{key}}` tokens | unit | `node --test tests/matcher.test.js` | Wave 0 |
| FR-3.7 | `substituteVariables` leaves unresolved `{{key}}` tokens visible (not deleted) | unit | `node --test tests/matcher.test.js` | Wave 0 |
| FR-3.4 | `extractKeywords` lowercases, strips punctuation, removes stop words | unit | `node --test tests/matcher.test.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/matcher.test.js`
- **Per wave merge:** `node --test tests/matcher.test.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/matcher.test.js` — covers all 8 test rows above; file does not exist yet
- [ ] Dual-export shim in `utils/matcher.js` — required for Node test runner to import functions

---

## Sources

### Primary (HIGH confidence)
- REQUIREMENTS.md — FR-2.4, FR-3.4, FR-3.5, FR-3.7, FR-3.8, NFR-1.2, NFR-1.4 verified directly
- `.planning/research/CONCERNS.md` — Pitfall: dropdown fuzzy match selects wrong option (HIGH); answer bank false-positive (MEDIUM)
- `.planning/research/FEATURES.md` — Levenshtein/Jaccard matching strategy, conservative threshold rationale
- `utils/storage.js` — IIFE namespace pattern confirmed

### Secondary (MEDIUM confidence)
- [MDN: Levenshtein distance algorithm](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) — standard algorithm, well-established
- [Node.js v18 node:test docs](https://nodejs.org/api/test.html) — built-in test runner confirmed Node 18+

### Tertiary (LOW confidence — none required for this phase)
- N/A — all algorithms are classical, no external library research needed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no external dependencies; node:test is built-in since Node 18
- Architecture: HIGH — algorithms (Levenshtein, Jaccard) are classical and well-defined; namespace pattern confirmed from codebase
- Pitfalls: HIGH — alias collision risk (UAE/US) verified by direct analysis of the alias map; other pitfalls verified from CONCERNS.md

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable domain — pure algorithms, no external APIs)

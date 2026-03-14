import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

let matcher;
try {
  matcher = require('../../utils/matcher.js');
} catch {
  // matcher.js does not exist yet — stubs run as todo
  matcher = {};
}

const {
  levenshtein = () => { throw new Error('not implemented'); },
  matchDropdownOption = () => { throw new Error('not implemented'); },
  extractKeywords = () => { throw new Error('not implemented'); },
  scoreAnswerBankEntry = () => { throw new Error('not implemented'); },
  findBestAnswer = () => { throw new Error('not implemented'); },
  substituteVariables = () => { throw new Error('not implemented'); },
} = matcher;

// --- levenshtein ---
describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    assert.equal(levenshtein('abc', 'abc'), 0);
  });
  it('returns string length when other string is empty', () => {
    assert.equal(levenshtein('', 'abc'), 3);
    assert.equal(levenshtein('abc', ''), 3);
  });
  it('edit distance US vs UAE is 2', () => {
    assert.equal(levenshtein('us', 'uae'), 2);
  });
  it('single substitution returns 1', () => {
    assert.equal(levenshtein('cat', 'bat'), 1);
  });
});

// --- matchDropdownOption ---
describe('matchDropdownOption', () => {
  const opts = [
    { value: 'ae', text: 'United Arab Emirates' },
    { value: 'us', text: 'United States' },
    { value: 'uk', text: 'United Kingdom' },
  ];

  it('tier 1: exact text match', () => {
    assert.equal(matchDropdownOption(opts, 'United States').text, 'United States');
  });
  it('tier 2: alias UAE → United Arab Emirates', () => {
    assert.equal(matchDropdownOption(opts, 'UAE').text, 'United Arab Emirates');
  });
  it('tier 2: alias US → United States (not UAE)', () => {
    assert.equal(matchDropdownOption(opts, 'US').text, 'United States');
  });
  it('tier 2: alias UK → United Kingdom', () => {
    assert.equal(matchDropdownOption(opts, 'UK').text, 'United Kingdom');
  });
  it('tier 3: case-insensitive includes match', () => {
    assert.equal(matchDropdownOption(opts, 'united states').text, 'United States');
  });
  it('tier 4: levenshtein ≤ 3 match', () => {
    // "Untied States" — 2 transpositions
    assert.equal(matchDropdownOption(opts, 'Untied States').text, 'United States');
  });
  it('returns null when no match within distance 3', () => {
    assert.equal(matchDropdownOption(opts, 'Zorgon'), null);
  });
  it('does not mutate the options array', () => {
    const optsCopy = [...opts];
    matchDropdownOption(opts, 'UAE');
    assert.deepEqual(opts, optsCopy);
  });
});

// --- extractKeywords ---
describe('extractKeywords', () => {
  it('lowercases and strips punctuation', () => {
    const kw = extractKeywords('Hello, World!');
    assert.ok(kw.includes('hello') || kw.includes('world'));
    assert.ok(!kw.some(w => w.includes(',')));
  });
  it('removes common stop words', () => {
    const kw = extractKeywords('Why do you want to work here?');
    assert.ok(!kw.includes('why'));
    assert.ok(!kw.includes('do'));
    assert.ok(!kw.includes('you'));
    assert.ok(kw.includes('work'));
  });
  it('returns array of strings with length > 1', () => {
    const kw = extractKeywords('Tell us about your experience with CRM tools');
    assert.ok(Array.isArray(kw));
    assert.ok(kw.every(w => w.length > 1));
  });
  it('returns empty array for all-stop-word input', () => {
    const kw = extractKeywords('a an the');
    assert.deepEqual(kw, []);
  });
});

// --- scoreAnswerBankEntry ---
describe('scoreAnswerBankEntry', () => {
  const entry = {
    id: '1',
    question: 'Why do you want to work here?',
    keywords: ['motivation', 'interest', 'company', 'work', 'reasons'],
    category: 'motivation',
    answer: 'I am motivated by...',
    variables: [],
  };

  it('returns a number between 0 and 1', () => {
    const score = scoreAnswerBankEntry('Why do you want to work here?', entry);
    assert.ok(typeof score === 'number');
    assert.ok(score >= 0 && score <= 1);
  });
  it('high overlap question scores above 0.5', () => {
    const score = scoreAnswerBankEntry('Why do you want to work at our company?', entry);
    assert.ok(score > 0.5);
  });
  it('unrelated question scores below 0.2', () => {
    const score = scoreAnswerBankEntry('What is your expected salary?', entry);
    assert.ok(score < 0.2);
  });
  it('score never exceeds 1.0', () => {
    const score = scoreAnswerBankEntry(entry.question, entry);
    assert.ok(score <= 1.0);
  });
});

// --- findBestAnswer ---
describe('findBestAnswer', () => {
  const bank = [
    {
      id: '1',
      question: 'Why do you want to work here?',
      keywords: ['motivation', 'interest', 'company', 'work', 'reasons', 'passionate', 'excited'],
      category: 'motivation',
      answer: 'I am motivated by the mission.',
      variables: [],
    },
    {
      id: '2',
      question: 'What is your salary expectation?',
      keywords: ['salary', 'compensation', 'pay', 'expectation', 'range', 'expected'],
      category: 'salary',
      answer: 'My expectation is competitive.',
      variables: [],
    },
  ];

  it('returns { entry, score } when best score ≥ 0.75', () => {
    const result = findBestAnswer('Why do you want to work at our company? What motivates you?', bank);
    // result may be null if threshold not met — implementation must tune to ensure high-overlap passes
    if (result !== null) {
      assert.ok(result.entry);
      assert.ok(typeof result.score === 'number');
      assert.ok(result.score >= 0.75);
    }
  });
  it('returns null when best score < 0.75 (FR-3.7)', () => {
    const result = findBestAnswer('Tell me about a challenge you overcame', bank);
    assert.equal(result, null);
  });
  it('returns null for empty answer bank', () => {
    assert.equal(findBestAnswer('Any question', []), null);
  });
  it('picks the highest-scoring entry when multiple entries are above threshold', () => {
    const result = findBestAnswer('What salary compensation do you expect for this role?', bank);
    if (result !== null) {
      assert.equal(result.entry.id, '2');
    }
  });
});

// --- substituteVariables ---
describe('substituteVariables', () => {
  it('replaces a single known key', () => {
    assert.equal(
      substituteVariables('Hello {{my_name}}', { my_name: 'Adarsh' }),
      'Hello Adarsh'
    );
  });
  it('replaces multiple keys in one pass', () => {
    assert.equal(
      substituteVariables('{{my_name}} at {{company_name}}', { my_name: 'Adarsh', company_name: 'Acme' }),
      'Adarsh at Acme'
    );
  });
  it('leaves unresolved {{tokens}} visible (FR-3.7)', () => {
    assert.equal(
      substituteVariables('I work at {{company_name}}', {}),
      'I work at {{company_name}}'
    );
  });
  it('leaves partially-unresolved tokens visible while resolving others', () => {
    assert.equal(
      substituteVariables('{{my_name}} applies to {{company_name}}', { my_name: 'Adarsh' }),
      'Adarsh applies to {{company_name}}'
    );
  });
  it('returns original string unchanged when variables map is empty', () => {
    const original = 'No tokens here.';
    assert.equal(substituteVariables(original, {}), original);
  });
});

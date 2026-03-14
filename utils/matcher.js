// JobFill — utils/matcher.js
// Phase 5 — Fuzzy matcher and answer bank engine
// Provides: levenshtein, matchDropdownOption, extractKeywords,
//           scoreAnswerBankEntry, findBestAnswer, substituteVariables

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'shall', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
  'this', 'that', 'these', 'those', 'which', 'who', 'what', 'how', 'why', 'when', 'where',
  'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'up', 'about', 'into', 'please', 'tell',
]);

const ALIAS_MAP = {
  'uae':         'united arab emirates',
  'usa':         'united states',
  'us':          'united states',
  'uk':          'united kingdom',
  'gb':          'united kingdom',
  'ksa':         'saudi arabia',
  'sa':          'saudi arabia',
  'gcc':         'gulf cooperation council',
  'golden visa': 'uae golden visa',
  'gc':          'green card',
  'yoe':         'years of experience',
  'indian':      'india',
  'emirati':     'united arab emirates',
};

// Category inference keyword map — simple substring lookup, not fuzzy
const CATEGORY_KEYWORDS = [
  { pattern: /salary|compensation|pay/i,                             category: 'salary' },
  { pattern: /work.*auth|visa|permit|authorization|legally/i,        category: 'work_auth' },
  { pattern: /experience|background|worked/i,                        category: 'experience' },
  { pattern: /motivat|interest|why.*work|why.*join|passion/i,        category: 'motivation' },
  { pattern: /skill|tool|proficien|familiar/i,                       category: 'skills' },
  { pattern: /location|relocat|remote|hybrid/i,                      category: 'location' },
  { pattern: /notice|available|start|when.*start/i,                  category: 'availability' },
  { pattern: /diversity|equal|inclusive/i,                           category: 'diversity' },
  { pattern: /cover.letter|introduce|about yourself/i,               category: 'cover_letter' },
];

// --- Private helpers ---

function levenshtein(a, b) {
  // Space-optimised single-row DP; swap so a is the shorter string
  if (a.length > b.length) { const t = a; a = b; b = t; }
  const m = a.length;
  const n = b.length;
  let row = [];
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = row[j];
      if (a[i - 1] === b[j - 1]) {
        row[j] = prev;
      } else {
        row[j] = 1 + Math.min(prev, row[j], row[j - 1]);
      }
      prev = temp;
    }
  }
  return row[n];
}

function jaccard(setA, setB) {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function inferCategory(text) {
  for (const { pattern, category } of CATEGORY_KEYWORDS) {
    if (pattern.test(text)) return category;
  }
  return 'other';
}

// --- Public functions ---

function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function matchDropdownOption(options, targetValue) {
  const target = targetValue;
  const targetLower = target.toLowerCase().trim();

  // Tier 1: exact text or value match (case-sensitive)
  for (const opt of options) {
    if (opt.text === target || opt.value === target) return opt;
  }

  // Tier 2: alias-expanded exact match (case-insensitive)
  const aliasExpanded = ALIAS_MAP[targetLower] || null;
  const searchTerms = [targetLower];
  if (aliasExpanded) searchTerms.push(aliasExpanded);

  for (const term of searchTerms) {
    for (const opt of options) {
      if (opt.text.toLowerCase() === term || opt.value.toLowerCase() === term) {
        return opt;
      }
    }
  }

  // Tier 3: case-insensitive includes
  for (const term of searchTerms) {
    for (const opt of options) {
      if (opt.text.toLowerCase().includes(term) || term.includes(opt.text.toLowerCase())) {
        return opt;
      }
    }
  }

  // Tier 4: Levenshtein <= 3 on text label
  let bestOpt = null;
  let bestDist = Infinity;
  for (const opt of options) {
    const dist = levenshtein(targetLower, opt.text.toLowerCase());
    if (dist <= 3 && dist < bestDist) {
      bestDist = dist;
      bestOpt = opt;
    }
  }
  if (bestOpt) return bestOpt;

  return null;
}

function scoreAnswerBankEntry(questionText, entry) {
  const questionTokens = new Set(extractKeywords(questionText));
  const entryTokens = new Set([...entry.keywords, ...extractKeywords(entry.question)]);

  if (questionTokens.size === 0 && entryTokens.size === 0) return 0;

  const jaccardScore = jaccard(questionTokens, entryTokens);
  const inferredCategory = inferCategory(questionText);
  const categoryBonus = inferredCategory === entry.category ? 1.0 : 0;

  return Math.min(1.0, 0.8 * jaccardScore + 0.2 * categoryBonus);
}

function findBestAnswer(questionText, answerBank) {
  if (!answerBank || answerBank.length === 0) return null;

  let bestEntry = null;
  let bestScore = -Infinity;

  for (const entry of answerBank) {
    const score = scoreAnswerBankEntry(questionText, entry);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (bestScore >= 0.75) return { entry: bestEntry, score: bestScore };
  return null;
}

function substituteVariables(answerText, variables) {
  return answerText.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(variables, key)
      ? variables[key]
      : match; // Leave {{token}} visible if not found
  });
}

// --- Export shims ---

// Browser namespace
if (typeof window !== 'undefined') {
  window.JobFill = window.JobFill || {};
  window.JobFill.matcher = {
    matchDropdownOption,
    scoreAnswerBankEntry,
    findBestAnswer,
    substituteVariables,
    extractKeywords,
  };
}

// Node.js / CJS (for node:test)
if (typeof module !== 'undefined') {
  module.exports = {
    levenshtein,
    matchDropdownOption,
    scoreAnswerBankEntry,
    findBestAnswer,
    substituteVariables,
    extractKeywords,
  };
}

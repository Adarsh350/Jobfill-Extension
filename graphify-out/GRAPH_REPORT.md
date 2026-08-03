# Graph Report - .  (2026-08-03)

## Corpus Check
- 135 files · ~137,174 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 354 nodes · 463 edges · 32 communities (29 shown, 3 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 28
- Community 30

## God Nodes (most connected - your core abstractions)
1. `host_permissions` - 8 edges
2. `MockElement()` - 7 edges
3. `handleMessage()` - 6 edges
4. `renderAnswerBank()` - 6 edges
5. `MockNode()` - 6 edges
6. `fill()` - 5 edges
7. `fillStandardFields()` - 5 edges
8. `fillStandardFields()` - 5 edges
9. `bindAnswerBank()` - 5 edges
10. `MockMutationObserver()` - 5 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (32 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (36): action, default_icon, default_popup, background, service_worker, commands, fill-form, content_scripts (+28 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (11): MockElement(), MockMutationObserver(), setupGlobals(), assert, { describe, it, before }, fs, { setupGlobals, MockElement }, assert (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (23): bindAnswerBank(), bindProfileAutoSave(), bindResumeTab(), clearResumeUI(), closeModal(), collectProfile(), debounce(), deleteEntry() (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (13): assert, attrMatches(), getAttrValue(), matchAll(), matchFirst(), MockNode(), nodeMatches(), nodeMatchesSingle() (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (11): assert, attrMatches(), getAttrValue(), matchAll(), matchFirst(), MockNode(), nodeMatches(), nodeMatchesSingle() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (8): assert, buildDom(), fs, makeButton(), makeElement(), MockMutationObserver, path, { test, describe, before, beforeEach }

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (9): assert, buildDom(), _domElements, fs, _h1s, makeElement(), makeLabelEl(), path (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.20
Nodes (3): attachResume(), dataUrlToFile(), fillField()

### Community 9 - "Community 9"
Cohesion: 0.26
Nodes (10): ALIAS_MAP, CATEGORY_KEYWORDS, extractKeywords(), findBestAnswer(), inferCategory(), jaccard(), levenshtein(), matchDropdownOption() (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.35
Nodes (9): discoverFields(), fill(), fillCustomQuestions(), fillStandardFields(), getAdjacentLabel(), getJobDetails(), hasValue(), scoreField() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.20
Nodes (8): assert, buildDom(), _domElements, fs, _jobTitleEl, makeElement(), path, { test, describe, before, beforeEach }

### Community 12 - "Community 12"
Cohesion: 0.38
Nodes (9): attachResumeInMainWorld(), exportData(), getStatus(), handleCommand(), handleMessage(), handleResumeUploadFallback(), importData(), mergeAnswerBank() (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.36
Nodes (8): detectCrossOrigin(), fill(), fillCustomQuestions(), fillStandardFields(), getAdjacentLabel(), getJobDetails(), hasValue(), resolveSelector()

### Community 14 - "Community 14"
Cohesion: 0.24
Nodes (7): assert, buildDom(), fs, makeElement(), makeLabelEl(), path, { test, describe, before, beforeEach }

### Community 15 - "Community 15"
Cohesion: 0.36
Nodes (6): fill(), fillCustomQuestions(), fillStandardFields(), hasValue(), isNativeBaytForm(), resolveSelector()

### Community 16 - "Community 16"
Cohesion: 0.39
Nodes (7): fill(), fillCustomQuestions(), fillStandardFields(), getAdjacentLabel(), getJobDetails(), hasValue(), resolveSelector()

### Community 17 - "Community 17"
Cohesion: 0.39
Nodes (7): fill(), fillCustomQuestions(), fillStandardFields(), getAdjacentLabel(), getJobDetails(), hasValue(), resolveSelector()

### Community 18 - "Community 18"
Cohesion: 0.36
Nodes (6): fill(), fillStandardFields(), hasValue(), isEasyApplyContext(), resolveSelector(), sleep()

### Community 19 - "Community 19"
Cohesion: 0.47
Nodes (7): dismiss(), _ensureHost(), _loadPosition(), _makeDraggable(), showBanner(), showButton(), showResults()

### Community 20 - "Community 20"
Cohesion: 0.43
Nodes (6): fill(), fillCustomQuestions(), fillStandardFields(), getJobDetails(), hasValue(), resolveSelector()

### Community 21 - "Community 21"
Cohesion: 0.39
Nodes (5): fill(), fillStandardFields(), hasValue(), isVisible(), resolveField()

### Community 22 - "Community 22"
Cohesion: 0.32
Nodes (3): dispatchInputChange(), fillInput(), fillTextarea()

### Community 23 - "Community 23"
Cohesion: 0.43
Nodes (4): downloadJSON(), initExport(), initImport(), showImportStatus()

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (5): bindResumeTab(), clearResumeUI(), formatBytes(), loadResume(), showResumeInfo()

### Community 25 - "Community 25"
Cohesion: 0.40
Nodes (3): assert, { createRequire }, { describe, it, before }

### Community 26 - "Community 26"
Cohesion: 0.40
Nodes (3): assert, { createRequire }, { describe, it, before }

## Knowledge Gaps
- **69 isolated node(s):** `manifest_version`, `name`, `version`, `description`, `storage` (+64 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `manifest_version`, `name`, `version` to the rest of the system?**
  _69 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07526881720430108 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12807881773399016 - nodes in this community are weakly interconnected._
- **Should `Community 6` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
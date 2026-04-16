# Graph Report - .  (2026-04-16)

## Corpus Check
- 37 files · ~31,290 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 242 nodes · 412 edges · 22 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 98 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]

## God Nodes (most connected - your core abstractions)
1. `fillField()` - 21 edges
2. `attachResume()` - 12 edges
3. `get()` - 10 edges
4. `set()` - 9 edges
5. `getUniqueSelector()` - 9 edges
6. `runFill()` - 8 edges
7. `fill()` - 8 edges
8. `getAnswerBank()` - 7 edges
9. `findBestAnswer()` - 7 edges
10. `fill()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `getFillStatus()` --calls--> `get()`  [INFERRED]
  utils/storage.js → tests/unit/filler.test.js
- `runFill()` --calls--> `startFill()`  [INFERRED]
  content.js → utils/filler.js
- `runFill()` --calls--> `getProfile()`  [INFERRED]
  content.js → utils/storage.js
- `runFill()` --calls--> `getAnswerBank()`  [INFERRED]
  content.js → utils/storage.js
- `runFill()` --calls--> `fill()`  [INFERRED]
  content.js → platforms/ashby.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (30): set(), bindProfileAutoSave(), clearResumeUI(), closeModal(), collectProfile(), debounce(), deleteEntry(), escapeHtml() (+22 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (22): fill(), fillCustomQuestions(), fillStandardFields(), getJobDetails(), hasValue(), resolveSelector(), getUniqueSelector(), fill() (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (18): dispatchBlur(), attachResume(), dataUrlToFile(), findResumeFileInput(), shadowQuery(), shadowQueryAll(), fill(), fillStandardFields() (+10 more)

### Community 3 - "Community 3"
Cohesion: 0.19
Nodes (9): exportData(), getStatus(), handleCommand(), handleMessage(), handleResumeUploadFallback(), importData(), mergeAnswerBank(), triggerFill() (+1 more)

### Community 4 - "Community 4"
Cohesion: 0.22
Nodes (14): dispatchInputChange(), fillCheckbox(), fillInput(), fillRadio(), fillSelect(), fillTextarea(), fillField(), fill() (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.25
Nodes (11): runFill(), safeRuntimeCall(), endFill(), startFill(), dismiss(), _ensureHost(), _loadPosition(), _makeDraggable() (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.21
Nodes (9): attrMatches(), getAttrValue(), matchFirst(), nodeMatches(), nodeMatchesSingle(), parseHtml(), parseInto(), parseSelector() (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.24
Nodes (5): waitForElement(), buildDom(), makeButton(), makeElement(), MockMutationObserver

### Community 8 - "Community 8"
Cohesion: 0.27
Nodes (7): attrMatches(), getAttrValue(), matchFirst(), nodeMatches(), nodeMatchesSingle(), parseSelector(), parseSingle()

### Community 9 - "Community 9"
Cohesion: 0.35
Nodes (9): discoverFields(), fill(), fillCustomQuestions(), fillStandardFields(), getAdjacentLabel(), getJobDetails(), hasValue(), scoreField() (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.36
Nodes (8): detectCrossOrigin(), fill(), fillCustomQuestions(), fillStandardFields(), getAdjacentLabel(), getJobDetails(), hasValue(), resolveSelector()

### Community 11 - "Community 11"
Cohesion: 0.36
Nodes (6): fill(), fillCustomQuestions(), fillStandardFields(), hasValue(), isNativeBaytForm(), resolveSelector()

### Community 12 - "Community 12"
Cohesion: 0.47
Nodes (3): buildDom(), makeElement(), makeLabelEl()

### Community 13 - "Community 13"
Cohesion: 0.47
Nodes (3): buildDom(), makeElement(), makeLabelEl()

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (2): buildDom(), makeElement()

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 16`** (2 nodes): `make_png()`, `create_icons.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `title()`, `ashby.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `makeSelect()`, `events.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `workday.test.js`, `title()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `run-all.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `matcher.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `attachResume()` connect `Community 2` to `Community 0`, `Community 1`, `Community 4`, `Community 9`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.250) - this node is a cross-community bridge._
- **Why does `getResume()` connect `Community 0` to `Community 2`, `Community 3`?**
  _High betweenness centrality (0.208) - this node is a cross-community bridge._
- **Why does `fillField()` connect `Community 4` to `Community 1`, `Community 2`, `Community 9`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `fillField()` (e.g. with `fillTextarea()` and `fillSelect()`) actually correct?**
  _`fillField()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `attachResume()` (e.g. with `getResume()` and `fill()`) actually correct?**
  _`attachResume()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `get()` (e.g. with `getStatus()` and `exportData()`) actually correct?**
  _`get()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `set()` (e.g. with `importData()` and `buildDom()`) actually correct?**
  _`set()` has 8 INFERRED edges - model-reasoned connections that need verification._
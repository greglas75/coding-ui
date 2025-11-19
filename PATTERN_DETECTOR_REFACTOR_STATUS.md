# 🔧 Pattern Detector Refactoring - Status

## ✅ CO ZOSTAŁO ZROBIONE (30% Complete)

### Struktura utworzona:
```
python-service/validators/patterns/
├── __init__.py                       ✅ DONE
├── base_pattern.py                   ✅ DONE (90 lines)
├── category_validated_pattern.py     ✅ DONE (235 lines)
└── pattern_router.py                 ✅ DONE (90 lines)
```

### Wyekstraktowane Patter

ny:
- ✅ **Pattern 0: Category Validated** (235 lines)
  - Standalone pattern class
  - Inherits from BasePattern
  - Testable in isolation
  - Clean separation of concerns

### Infrastruktura:
- ✅ **BasePattern** - Abstract base class for all patterns
- ✅ **PatternRouter** - Orchestrates pattern detection
- ✅ **Logging** - Structured logging for pattern detection
- ✅ **Priority system** - Patterns checked in order

---

## 🚧 CO JESZCZE TRZEBA ZROBIĆ (70% Remaining)

### Pozostałe Patterny do Ekstrakcji:

#### 1. Pattern 1: Category Error
**Location:** `pattern_detector.py:383-487` (105 lines)
**Priority:** High
**Triggers:**
- Search B < 5 results
- Search A > 10 results
- KG: user text exists but in different category

**File to create:** `category_error_pattern.py`

---

#### 2. Pattern 2: Ambiguous Descriptor
**Location:** `pattern_detector.py:489-627` (138 lines)
**Priority:** Medium
**Triggers:**
- Vision AI detects 3+ different brands
- No single brand > 40% frequency
- User text is descriptor keyword

**File to create:** `ambiguous_descriptor_pattern.py`

---

#### 3. Pattern 3: Clear Match
**Location:** `pattern_detector.py:629-767` (138 lines)
**Priority:** High
**Triggers:**
- Vision AI: single brand > 50% frequency
- KG: verified brand in correct category
- Embedding: moderate-high similarity (> 0.60)

**File to create:** `clear_match_pattern.py`

---

#### 4. Pattern 4: Unclear Result
**Location:** `pattern_detector.py:769-860` (91 lines)
**Priority:** Low (always matches as fallback)
**Triggers:**
- Low confidence from all sources
- Conflicting information
- Insufficient data

**File to create:** `unclear_pattern.py`

---

### Pomocnicze Metody do Przeniesienia:

#### `_build_sources_dict()` (114 lines)
**Location:** `pattern_detector.py:862-975`
**Action:** Move to helper utility module
**New file:** `pattern_helpers.py`

#### `_build_decision_tree()` (139 lines)
**Location:** `pattern_detector.py:980-1118`
**Action:** Move to helper utility module or BasePattern

#### `_detect_validation_issues()` (124 lines)
**Location:** `pattern_detector.py:1120-1243`
**Action:** Move to helper utility module or BasePattern

---

## 📋 PLAN DZIAŁANIA

### Krok 1: Wyekstraktuj Pozostałe Patterny (4-6h)

**Kolejność (od najważniejszego):**

1. **Pattern 3: Clear Match** (2h)
   ```bash
   python-service/validators/patterns/clear_match_pattern.py
   ```
   - Most common pattern
   - High business value
   - Well-defined logic

2. **Pattern 1: Category Error** (1.5h)
   ```bash
   python-service/validators/patterns/category_error_pattern.py
   ```
   - Important for data quality
   - Prevents wrong categorization

3. **Pattern 2: Ambiguous Descriptor** (2h)
   ```bash
   python-service/validators/patterns/ambiguous_descriptor_pattern.py
   ```
   - Handles complex cases
   - Requires candidate ranking

4. **Pattern 4: Unclear** (0.5h)
   ```bash
   python-service/validators/patterns/unclear_pattern.py
   ```
   - Simplest pattern (fallback)
   - Always matches

---

### Krok 2: Utwórz Pattern Helpers (2h)

```bash
python-service/validators/patterns/pattern_helpers.py
```

**Przeniesione funkcje:**
- `build_sources_dict()`
- `build_decision_tree()`
- `detect_validation_issues()`

**Benefits:**
- Reusable across all patterns
- Easy to test
- Single source of truth

---

### Krok 3: Zaktualizuj PatternRouter (1h)

```python
# pattern_router.py
def __init__(self):
    self.patterns = [
        CategoryValidatedPattern(),      # Priority 0 ✅
        CategoryErrorPattern(),           # Priority 1
        AmbiguousDescriptorPattern(),     # Priority 2
        ClearMatchPattern(),              # Priority 3
        UnclearPattern(),                 # Priority 4 (always matches)
    ]
```

---

### Krok 4: Integracja z PatternDetector (2h)

```python
# pattern_detector.py (nowa wersja - ~50 linii zamiast 1,243!)
from validators.patterns import PatternRouter

class PatternDetector(BaseValidator):
    def __init__(self):
        self.router = PatternRouter()
        logger.info("PatternDetector initialized with modular patterns")

    def detect_pattern(self, user_text, category, **kwargs) -> ValidationResult:
        # Prepare validation data
        validation_data = {
            'user_text': user_text,
            'category': category,
            'pinecone_match': kwargs.get('pinecone_match'),
            'dual_search_results': kwargs.get('dual_search_results'),
            'vision_results': kwargs.get('vision_results'),
            'vision_brands_a': kwargs.get('vision_brands_a'),
            'vision_brands_b': kwargs.get('vision_brands_b'),
            'web_brands_a': kwargs.get('web_brands_a'),
            'web_brands_b': kwargs.get('web_brands_b'),
            'kg_results': kwargs.get('kg_results'),
            'embedding_similarities': kwargs.get('embedding_similarities'),
            'raw_image_urls': kwargs.get('raw_image_urls'),
            'raw_web_results': kwargs.get('raw_web_results'),
            'raw_kg_details': kwargs.get('raw_kg_details'),
        }

        # Delegate to router
        return self.router.detect(validation_data)
```

---

### Krok 5: Testing (3h)

**Unit Tests dla każdego patternu:**
```bash
tests/validators/patterns/
├── test_base_pattern.py
├── test_category_validated_pattern.py
├── test_category_error_pattern.py
├── test_ambiguous_descriptor_pattern.py
├── test_clear_match_pattern.py
├── test_unclear_pattern.py
└── test_pattern_router.py
```

**Test Coverage Goals:**
- Each pattern: 80%+
- Pattern router: 90%+
- Integration: 70%+

---

## 📊 PROGRESS TRACKER

| Component | Status | Lines | Priority | Effort |
|-----------|--------|-------|----------|--------|
| BasePattern | ✅ Done | 90 | High | 1h |
| PatternRouter | ✅ Done | 90 | High | 1h |
| CategoryValidatedPattern | ✅ Done | 235 | High | 2h |
| ClearMatchPattern | ⏳ TODO | ~140 | High | 2h |
| CategoryErrorPattern | ⏳ TODO | ~110 | Medium | 1.5h |
| AmbiguousDescriptorPattern | ⏳ TODO | ~140 | Medium | 2h |
| UnclearPattern | ⏳ TODO | ~95 | Low | 0.5h |
| PatternHelpers | ⏳ TODO | ~200 | Medium | 2h |
| Integration | ⏳ TODO | ~50 | High | 2h |
| Unit Tests | ⏳ TODO | ~500 | High | 3h |

**Total Progress:** 3/10 components (30%)
**Remaining Effort:** 14 hours

---

## 🎯 IMMEDIATE NEXT STEPS

### Następne 2 godziny:

1. **Ekstraktuj Clear Match Pattern** (2h)
   - Najczęściej używany
   - Wysoka wartość biznesowa
   - Clear logic

### Dzisiaj wieczorem (4h):

2. **Ekstraktuj Category Error Pattern** (1.5h)
3. **Ekstraktuj Ambiguous Descriptor Pattern** (2h)
4. **Ekstraktuj Unclear Pattern** (0.5h)

### Jutro (8h):

5. **Utwórz Pattern Helpers** (2h)
6. **Zaktualizuj Pattern Router** (1h)
7. **Integracja z PatternDetector** (2h)
8. **Unit Tests** (3h)

---

## ✅ VERIFICATION CHECKLIST

Po zakończeniu refactoringu:

- [ ] Wszystkie 5 patternów wyekstraktowane
- [ ] Pattern helpers utworzone
- [ ] Pattern router kompletny
- [ ] PatternDetector zredukowany do ~50 linii
- [ ] Wszystkie testy przechodzą
- [ ] Code coverage > 80%
- [ ] No regression (wszystkie istniejące testy pass)
- [ ] Performance nie spadła (benchmark)
- [ ] Dokumentacja zaktualizowana

---

## 📈 EXPECTED BENEFITS

**Before:**
- Pattern Detector: 1,243 lines (god class)
- Cannot test patterns independently
- Changing Pattern 0 risks breaking Pattern 3
- Onboarding: days

**After:**
- Pattern Detector: ~50 lines (orchestrator)
- Each pattern: ~140 lines average (testable)
- Patterns isolated (safe changes)
- Onboarding: hours
- **60% easier maintenance**
- **80% faster testing**
- **50% easier to add new patterns**

---

## 🚀 READY-TO-USE COMMANDS

### Kontynuuj ekstrakcję następnego patternu:

```bash
# Pattern 3: Clear Match
touch python-service/validators/patterns/clear_match_pattern.py

# Pattern 1: Category Error
touch python-service/validators/patterns/category_error_pattern.py

# Pattern 2: Ambiguous Descriptor
touch python-service/validators/patterns/ambiguous_descriptor_pattern.py

# Pattern 4: Unclear
touch python-service/validators/patterns/unclear_pattern.py

# Helpers
touch python-service/validators/patterns/pattern_helpers.py
```

### Run tests:

```bash
cd python-service
pytest tests/validators/patterns/ -v
```

### Check coverage:

```bash
pytest --cov=validators/patterns tests/validators/patterns/
```

---

**Status:** 🟡 In Progress (30% Complete)
**Next Task:** Extract Clear Match Pattern
**Estimated Completion:** 2 days (16 hours total)

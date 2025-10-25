# TGM Research - coding-ui Project Context

**Last Updated:** 2025-10-25  
**Project:** Translation System & Survey Analysis Platform  
**Owner:** Greg (CTO & Founder)

---

## 🎯 Current Focus

### Active Work: Pass 3 Architecture Redesign

**Problem Identified:**
- Pass 3 was incorrectly designed as a translation execution module
- Contained hardcoded Polish content that should be dynamic
- Had minimal MODULE_NOTES while duplicating Pass 1/2 logic
- Violated separation of concerns

**Solution in Progress:**
- Convert Pass 3 to quality aggregation module ONLY
- Pass 3 receives already-processed outputs from Pass 1 & Pass 2
- Remove hardcoded Polish elements
- Focus on quality dimension weights and report formatting
- Minimal linguistic knowledge needed (works with processed results)

**Status:** Redesigning architecture, removing execution logic

---

## 🏗️ System Architecture

### Translation Pipeline (Multi-pass Polish System)

```
┌─────────────────────────────────────────────┐
│  INPUT: Source text + context               │
└──────────────────┬──────────────────────────┘
                   ↓
         ┌─────────────────────┐
         │  PASS 1              │
         │  Initial Analysis +  │
         │  Base Translation    │
         └──────────┬──────────┘
                    ↓
         ┌─────────────────────┐
         │  PASS 2              │
         │  Style Improvement   │
         │  (receives Pass 1)   │
         └──────────┬──────────┘
                    ↓
         ┌─────────────────────┐
         │  PASS 3              │
         │  Quality Aggregation │
         │  (receives 1 + 2)    │
         └──────────┬──────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  OUTPUT: Translation + Quality Report        │
└─────────────────────────────────────────────┘
```

### Pass Responsibilities

| Pass | Purpose | Inputs | Outputs | Notes |
|------|---------|--------|---------|-------|
| Pass 1 | Initial analysis + translation | Source text, context | Base translation + quality metrics | Heavy linguistic processing |
| Pass 2 | Style improvement | Pass 1 output | Refined translation + style metrics | Focuses on naturalness |
| Pass 3 | Quality aggregation | Pass 1 + Pass 2 outputs | Final report with weighted scores | NO translation execution |

### Code Organization Philosophy

```
/prompts/
  ├── pass1/          # Initial translation logic
  ├── pass2/          # Style refinement logic
  ├── pass3/          # Quality aggregation logic (MINIMAL linguistic content)
  └── MODULE_NOTES/   # Language-specific rules (Polish grammar, examples, etc.)
```

**Key Principle:**
- `MODULE_NOTES` = Language-specific content that changes per language
- `prompts/` = Universal structural logic that stays the same
- Pass 3 should reference MODULE_NOTES dynamically, not duplicate content

---

## 💻 Tech Stack

### Backend
- **Framework:** Python FastAPI
- **Port:** 8001
- **Logs:** `/tmp/python-service.log`
- **Main file:** `python-service/main.py`

### Frontend
- **Framework:** React 19 + TypeScript
- **Meta-framework:** Next.js 15
- **Backend:** Supabase
- **Features:** Virtual scrolling for 10,000+ rows, AI categorization dashboard

### AI Integration
- **Providers:** OpenAI (GPT-4), Anthropic (Claude), Google (Gemini), DeepL
- **Template Engine:** Handlebars for modular prompts
- **Languages Supported:** 96+
- **Special Features:**
  - Calque detection system
  - Formality analysis
  - Context-aware improvements
  - Dynamic linguistic rule loading

### Other Systems
- **Fraud Detection:** Cloudflare Workers for edge processing
- **Analysis:** Mouse trajectory patterns, behavioral detection
- **Focus:** AdsPower-style automation identification

---

## 🐛 Known Issues & Recent Fixes

### 2025-10-25: Pydantic Serialization Error (RESOLVED)

**Error:**
```
TypeError: 'NoneType' object cannot be converted to 'SchemaSerializer'
```

**Root Cause:**
- Pydantic BaseModel classes defined AFTER `app = FastAPI()` in `main.py`
- Models were on line 293, app creation on line 379

**Solution:**
- Move ALL Pydantic models BEFORE app creation
- Standard order: imports → models → app → routes

**Lesson Learned:**
- FastAPI needs models defined before app instantiation
- This error appeared 10+ times because fix wasn't properly verified
- ALWAYS test immediately after moving code

### 2025-10-25: Pass 3 Architecture Issue (IN PROGRESS)

**Problem:**
- Pass 3 designed as translation executor (wrong!)
- Hardcoded Polish content in prompt files
- Minimal MODULE_NOTES despite being language-specific

**Impact:**
- Duplication of Pass 1/2 logic
- Difficult to add new languages
- Unclear separation of concerns

**Solution:**
- Redesign Pass 3 as quality aggregator
- Remove translation execution
- Focus on metric weighting and report formatting
- Use variables for any language-specific content

---

## 📚 Important Patterns & Conventions

### Handlebars Template Architecture

```handlebars
{{! Universal logic (stays in prompt file) }}
You are translating from {{source_lang}} to {{target_lang}}.

{{! Language-specific content (from MODULE_NOTES) }}
{{{polish_verb_aspect_rules}}}
{{{polish_formality_guidelines}}}

{{! Dynamic content (from variables) }}
Source: {{source_text}}
Context: {{context}}
Previous translation: {{pass1_output}}
```

### Prompt Optimization Strategies

1. **Formality Filtering:** Skip formality checks when not needed
2. **Calque Detection:** Dynamic system based on language pair
3. **Module Loading:** Load only relevant linguistic rules
4. **Meta-prompt Generation:** Create language-specific tools programmatically

### Translation Quality Dimensions

- Accuracy (semantic preservation)
- Naturalness (idiomatic flow)
- Formality (appropriate register)
- Calques (direct translation issues)
- Grammar (linguistic correctness)
- Style (consistency with context)

---

## 📋 Decision Log

| Date | Decision | Rationale | Impact |
|------|----------|-----------|--------|
| 2025-10-25 | Pass 3 = aggregator only | Eliminate logic duplication | Simpler maintenance, clearer architecture |
| 2025-10-25 | MODULE_NOTES for language rules | Separation of concerns | Easier to add new languages |
| 2025-10-25 | Pydantic models before app | Fix serialization errors | Standard FastAPI pattern |

---

## 🚀 Roadmap & Next Steps

### Immediate (This Week)
- [ ] Complete Pass 3 redesign
- [ ] Remove hardcoded Polish from Pass 3
- [ ] Implement quality dimension weighting
- [ ] Test with multi-language inputs

### Short-term (This Month)
- [ ] Optimize fraud detection patterns
- [ ] Improve AdsPower detection accuracy
- [ ] Add more language support to translation system
- [ ] Performance optimization for 10,000+ row dashboard

### Long-term (This Quarter)
- [ ] Scale to 200+ languages
- [ ] Advanced behavioral analysis
- [ ] Real-time translation API
- [ ] Comprehensive quality reporting dashboard

---

## 🔍 Debugging Context

### Recent Debugging Sessions

#### Session: 2025-10-25 (Pydantic Error)
- **Duration:** Multiple attempts (10+)
- **Issue:** Repeated same fix without verification
- **Root cause:** Models after app creation
- **Resolution:** Moved models to top of file
- **Lesson:** Test immediately after each change

#### Session: 2025-10-25 (Pass 3 Architecture)
- **Duration:** Ongoing design discussion
- **Issue:** Unclear responsibilities in Pass 3
- **Analysis:** Pass 3 should not translate, only aggregate
- **Status:** Redesigning with quality-focused approach

---

## 💡 Greg's Working Context

### Expertise Areas
- **Linguistics:** Polish specialist, multilingual translator
- **Translation QA:** Quality management, cross-cultural methodology
- **Survey Research:** Enterprise SaaS for survey analysis
- **Fraud Detection:** Bot identification, behavioral analysis

### Current Priorities
1. Translation system optimization
2. Fraud detection accuracy
3. Dashboard performance
4. Multi-language scalability

### Communication Preferences
- Direct, technical communication
- Code examples over explanations
- Polish/English code-switching natural
- No corporate fluff

---

## 📞 External Dependencies

### API Keys & Services
- OpenAI API (GPT-4)
- Anthropic API (Claude)
- Google AI (Gemini)
- DeepL API
- Supabase
- Cloudflare Workers

### Deployment
- Python service: Local development (port 8001)
- Frontend: Next.js development server
- Cloudflare Workers: Edge deployment

---

## 📝 Session Log

### 2025-10-25 Evening
**Changed:** 
- Created AI instruction system for coding-ui
- Fixed Pydantic serialization error documentation
- Analyzed Pass 3 architecture problems

**Reason:** 
- Prevent repetition of same debugging mistakes
- Improve AI assistant continuity across sessions
- Document architectural decisions

**Result:** 
- Comprehensive instruction files created
- Clear guidelines for future development
- Pass 3 redesign strategy defined

**Next steps:** 
- Implement Pass 3 changes
- Test multi-language support
- Document quality metrics

---

*This context file should be updated after every significant session.*
*Read this file FIRST before starting any work on coding-ui.*

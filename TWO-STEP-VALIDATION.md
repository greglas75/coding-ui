# Two-Step AI Validation with Web Evidence Scoring

## Overview
Enhanced AI categorization with a second validation step that analyzes Google Search and Image results to boost or reduce confidence scores based on real-world evidence.

## How It Works

### Step 1: Initial Brand Matching (OpenAI)
- Analyzes user's response
- Matches to brand codes from the list
- Returns initial confidence score (e.g., 90%)

### Step 2: Web Evidence Validation (NEW! 🆕)
- Analyzes Google Search results (3 results)
- Analyzes Google Image results (6 images)
- Calculates evidence score
- Boosts or reduces confidence based on findings

## Evidence Scoring Rules

### Positive Evidence (Increases Confidence)

| Evidence Type | Boost | Description |
|--------------|-------|-------------|
| **Official Website** | +10% | Brand's official domain found (e.g., sensodyne.com) |
| **Retail Sites** | +5% | Found on Amazon, Walmart, Target, eBay, etc. |
| **Multiple Mentions** | +3% | Brand name appears 2+ times in results |
| **Many Product Images** | +10% | 4+ images with brand name in URL/title |
| **Some Product Images** | +5% | 2-3 images with brand name |

### Negative Evidence (Decreases Confidence)

| Evidence Type | Penalty | Description |
|--------------|---------|-------------|
| **No Web Evidence** | -10% | No search results AND no images |
| **No Search Results** | -5% | Google returned no results |

## Example Scenarios

### Scenario 1: Strong Evidence (Sensodyne)
**User Input:** "سنسوداين" (Arabic for Sensodyne)

**Step 1 - OpenAI:**
- Match: Sensodyne
- Confidence: 95%

**Step 2 - Web Evidence:**
- ✅ Official site: sensodyne.com (+10%)
- ✅ Retail sites: Amazon, Walmart (+5%)
- ✅ 6 product images (+10%)
- ✅ 4 mentions in results (+3%)

**Final Confidence:** 95% + 28% = **100%** (capped at 100%)

### Scenario 2: Weak Evidence (Generic Term)
**User Input:** "pasta do zębów" (Polish for "toothpaste")

**Step 1 - OpenAI:**
- Match: Generic Toothpaste
- Confidence: 60%

**Step 2 - Web Evidence:**
- ❌ No brand-specific results (-5%)
- ⚠️ No product images (0%)

**Final Confidence:** 60% - 5% = **55%**

### Scenario 3: Unknown Brand
**User Input:** "BrandX123" (fictional brand)

**Step 1 - OpenAI:**
- Match: Unknown
- Confidence: 40%

**Step 2 - Web Evidence:**
- ❌ No search results (-5%)
- ❌ No images (-5%)

**Final Confidence:** 40% - 10% = **30%** (Low confidence → reject)

## Implementation Details

### Code Changes
**File:** `src/lib/openai.ts`

```typescript
// Step 3: Boost confidence with web evidence validation
const boostedSuggestions = validatedSuggestions.map(suggestion => {
  const evidenceScore = calculateEvidenceScore(
    suggestion.code_name,
    webContext,
    images
  );

  const boostedConfidence = Math.min(1.0, suggestion.confidence + evidenceScore.boost);

  return {
    ...suggestion,
    confidence: boostedConfidence,
    reasoning: suggestion.reasoning +
      `\n\n🔍 Web Evidence: ${evidenceScore.details}`
  };
});
```

### Evidence Calculation Function
- `calculateEvidenceScore()` - Lines 302-407
- Analyzes URLs, titles, snippets
- Checks for official sites, retail presence
- Validates with image search results

## Benefits

1. **Higher Accuracy**
   - Reduces false positives from OpenAI alone
   - Validates brands with real-world evidence

2. **Better Confidence Scores**
   - More granular confidence levels
   - Reflects actual brand verification

3. **Transparency**
   - Shows evidence details in AI reasoning
   - Users can see why confidence was adjusted

4. **Quality Control**
   - Flags potentially incorrect matches (low final confidence)
   - Identifies strong matches (high confidence after boost)

## Console Logging

Watch for these new log messages:

```
📊 Evidence boost for "Sensodyne": +18.0% (official site, retail sites, product images)
🔍 Web Evidence: Confidence boosted from 95% to 100%
```

## Testing

To test the new validation:

1. Refresh browser (Cmd+Shift+R)
2. Try categorizing answer 130 (Sensodyne in Arabic)
3. Check console for evidence boost logs
4. Open AI Insights modal to see enhanced reasoning

## Future Enhancements

Potential improvements:
- ML-based evidence scoring
- Domain authority checking (trust score)
- Language-specific retail site lists
- Image content analysis (logo detection)
- Social media verification (brand mentions on Twitter, Instagram)

---

✅ **Status:** Implemented and ready to test!

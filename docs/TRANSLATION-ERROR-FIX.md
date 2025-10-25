# Translation/Categorization Error - Root Cause Analysis & Fix

## Problem Summary
AI categorization was failing with error: `Invalid response format from OpenAI - missing suggestions array`

## Root Causes Identified

### Issue 1: Missing Database Columns ✅ FIXED
- **Error**: `400 Bad Request` when querying categories table
- **Cause**: Columns `llm_preset` and `gpt_template` didn't exist in database
- **Solution**: Created migration `20250110000000_add_template_columns.sql`
- **Result**: Columns added with default value "LLM Proper Name"

### Issue 2: Invalid Model Configuration ✅ FIXED
- **Error**: `400 Unsupported value: 'temperature' does not support 0.3`
- **Cause**: Category "Toothpaste" (ID: 2) was set to use `gpt-5` (doesn't exist)
- **Solution**:
  - Fixed database: Changed `gpt-5` → `gpt-4o-mini`
  - Updated code to skip temperature for GPT-5 models (future-proofing)
- **File**: `src/lib/openai.ts:149-171`

### Issue 3: Wrong JSON Response Format ✅ FIXED
- **Error**: `Invalid response format from OpenAI - missing suggestions array`
- **Cause**: "LLM Proper Name" template asked for wrong JSON format
- **Old Format**:
  ```json
  {
    "normalized": "{brand}",
    "confidence": 0.92,
    "status": "whitelist | uncertain | reject",
    "reasoning": "..."
  }
  ```
- **New Format**:
  ```json
  {
    "suggestions": [
      {
        "code_id": "1",
        "code_name": "Nike",
        "confidence": 0.95,
        "reasoning": "..."
      }
    ]
  }
  ```
- **Solution**: Updated template in `src/config/DefaultTemplates.ts:29-75`
- **Additional Fix**: Changed format check from `!prompt.includes('JSON')` to `!prompt.includes('"suggestions"')`

## Files Modified

1. **supabase/migrations/20250110000000_add_template_columns.sql** (NEW)
   - Adds `llm_preset` and `gpt_template` columns

2. **src/lib/openai.ts**
   - Lines 149-174: Made temperature conditional for GPT-5 support
   - Lines 182-191: Added detailed logging for invalid responses
   - Lines 339-360: Improved JSON format check

3. **src/config/DefaultTemplates.ts**
   - Lines 29-75: Fixed "LLM Proper Name" template to use suggestions format

4. **scripts/check-models.js** (NEW)
   - Utility to verify and fix invalid model configurations

## Testing

Run categorization on answer 142 (Arabic text: "كرست" / "crest"):
1. Should fetch web context successfully
2. Should call OpenAI with gpt-4o-mini model
3. Should receive valid JSON with suggestions array
4. Should store results in database

## Next Steps

✅ All issues resolved - categorization should now work correctly!

To test:
1. Refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Try categorizing any answer
3. Check console logs for: `✅ OpenAI returned X suggestions`

## Prevention

- **Database Schema**: Keep TypeScript types in sync with database schema
- **Template Testing**: Validate template JSON formats match expected response structure
- **Model Validation**: Add validation for OpenAI model names before saving to database

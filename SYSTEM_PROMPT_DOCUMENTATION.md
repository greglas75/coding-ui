# System Prompt Documentation - Claude Sonnet 4.5

## Overview

This document describes the system prompt that guides Claude Sonnet 4.5 in generating high-quality, MECE-compliant codebooks from survey response clusters.

**File**: `python-service/prompts/system_prompt.xml`
**Version**: 1.0.0
**Size**: 7.78 KB (7,962 bytes)
**Estimated Tokens**: ~2,200 tokens
**Last Updated**: 2025-01-01

## Purpose

The system prompt instructs Claude on how to:
1. Analyze clusters of survey responses
2. Extract thematic patterns
3. Create hierarchical code structures
4. Ensure MECE compliance (Mutually Exclusive, Collectively Exhaustive)
5. Handle multilingual data
6. Use chain-of-thought reasoning

## Structure

### 1. Role Definition

Establishes Claude as an expert qualitative research analyst with expertise in:
- Identifying thematic patterns
- Creating MECE taxonomies
- Handling multilingual data
- Balancing granularity with usability

### 2. Task Description

Clearly defines the task:
- Analyze 50+ survey responses in a cluster
- Extract main theme
- Create hierarchical code structure
- Provide reasoning and examples

### 3. MECE Principles

**Mutually Exclusive:**
- No overlap between codes
- Each response fits ONE primary code
- Choose dominant topic for mixed responses
- Clear boundaries

**Collectively Exhaustive:**
- All responses must fit somewhere
- No missing themes
- Minimize generic "Other" codes (< 10%)

### 4. Hierarchy Logic

**Adaptive hierarchy depth:**

- **Flat (1 level)**: Homogeneous responses
- **Two-level**: Natural sub-groups (most common)
- **Three-level**: High complexity only

Default to simpler structures.

### 5. Multilingual Guidelines

- Preserve semantic meaning across languages
- Use target language for code names
- Don't create separate codes per language
- Handle language-specific nuances in descriptions

**Example:**
- Responses: "Nike shoes" (EN), "Buty Nike" (PL), "Chaussures Nike" (FR)
- Code: "Nike Footwear" (single code, not 3 separate)

### 6. Reasoning Process

5-step chain-of-thought:

1. **OBSERVE**: Identify patterns
2. **CONSIDER**: Different categorization options
3. **EVALUATE**: Which structure fits best
4. **DECIDE**: Final structure with rationale
5. **VALIDATE**: Check MECE compliance

### 7. Output Format

Structured XML response:

```xml
<analysis>
  <thinking>[Chain-of-thought reasoning]</thinking>

  <theme>
    <name>[2-4 words]</name>
    <description>[1-2 sentences]</description>
    <dominant_language>[ISO code]</dominant_language>
    <confidence>[high/medium/low]</confidence>
  </theme>

  <hierarchy_depth>[flat/two_level/three_level]</hierarchy_depth>

  <codes>
    <code>
      <name>[Code name]</name>
      <description>[Description]</description>
      <confidence>[high/medium/low]</confidence>
      <example_texts>
        <text id="[id]">[Quote]</text>
      </example_texts>
      <frequency_estimate>[high/medium/low]</frequency_estimate>
    </code>
  </codes>

  <mece_assessment>
    <exclusivity>[excellent/good/needs_improvement]</exclusivity>
    <exhaustiveness>[excellent/good/needs_improvement]</exhaustiveness>
    <notes>[Warnings]</notes>
  </mece_assessment>
</analysis>
```

### 8. Quality Standards

**Code Count**: 3-7 codes per theme
- < 3: Missing nuance
- > 7: Over-segmented

**Coverage**: Each code ≥ 5-10% of responses

**Naming**:
- Clear and specific
- Jargon-free
- 2-5 words max
- Action-oriented when relevant

**Descriptions**:
- Clear inclusion/exclusion criteria
- Examples of what fits/doesn't fit
- Actionable for coders

**Examples**: 2-3 quotes per code

**Confidence**: Honest uncertainty assessment

### 9. Edge Cases

**Mixed-Topic Responses**: Code by dominant topic

**Short Responses**: "Nike" is valid, don't require long text

**Ambiguous Responses**: Use confidence="low", note ambiguity

**Outliers**: Consider if genuine theme or truly misc (< 5%)

**Language Mixing**: Analyze semantic content, not language

### 10. Examples Usage

If examples provided:
- Study structure
- Understand reasoning
- Match quality level
- Adapt (don't copy verbatim)

## Validation

### XML Validation

```bash
cd python-service
python3 validate_prompt.py
```

**Expected Output:**
```
✅ XML is valid
   Root tag: <system_prompt>
   Sections: 10

📁 File Size: 7.78 KB (7962 bytes)

📊 Token Count: ~2,200 tokens
   ✅ Within acceptable range (< 2500)
```

### Manual Validation

```bash
# Check XML syntax
xmllint --noout prompts/system_prompt.xml

# Should return no errors
echo $?  # 0 = success
```

## Token Count Estimation

**Estimated**: ~2,200 tokens
**Limit**: < 3,000 tokens (recommended < 2,500)
**Status**: ✅ Within limits

To measure exact count:

```python
import anthropic

client = anthropic.Anthropic(api_key="your-key")

with open("prompts/system_prompt.xml") as f:
    prompt = f.read()

count = client.count_tokens(prompt)
print(f"Tokens: {count}")
```

## Usage in Python Service

The system prompt is loaded in `services/claude_client.py`:

```python
class ClaudeClient:
    def __init__(self, system_prompt_path="prompts/system_prompt.xml"):
        with open(system_prompt_path, 'r', encoding='utf-8') as f:
            self.system_prompt = f.read()

    def generate_codeframe(self, cluster_texts, ...):
        response = self.client.messages.create(
            model="claude-sonnet-4-5-20251022",
            max_tokens=4096,
            temperature=0.3,
            system=self.system_prompt,  # ← System prompt used here
            messages=[...]
        )
```

## Example Request/Response

### Input to Claude

**System**: [Contents of system_prompt.xml]

**User**:
```xml
<task>
Analyze the following cluster of survey responses:

<category>
  <name>Athletic Footwear Brands</name>
  <description>Survey about shoe brand preferences</description>
  <target_language>en</target_language>
</category>

<cluster_responses>
  <text id="1" language="en">I love Nike shoes</text>
  <text id="2" language="en">Nike has the best quality</text>
  <text id="3" language="en">Adidas is my favorite</text>
  <text id="4" language="pl">Buty Adidas są najlepsze</text>
  <text id="5" language="en">Puma sneakers are comfortable</text>
  ...
</cluster_responses>
</task>
```

### Output from Claude

```xml
<analysis>
  <thinking>
    I observe three distinct brand preferences in this cluster:
    1. Nike mentions (responses 1-2)
    2. Adidas mentions (responses 3-4, noting multilingual)
    3. Puma mentions (response 5)

    These are MUTUALLY EXCLUSIVE (each response focuses on one brand).
    Structure should be TWO_LEVEL: Athletic Brands → Individual brands

    This structure is COLLECTIVELY EXHAUSTIVE as all responses fit.
  </thinking>

  <theme>
    <name>Athletic Footwear Brands</name>
    <description>Consumer preferences for major athletic shoe brands.</description>
    <dominant_language>en</dominant_language>
    <confidence>high</confidence>
  </theme>

  <hierarchy_depth>two_level</hierarchy_depth>

  <codes>
    <code>
      <name>Nike</name>
      <description>Positive mentions of Nike footwear and brand</description>
      <confidence>high</confidence>
      <example_texts>
        <text id="1">I love Nike shoes</text>
        <text id="2">Nike has the best quality</text>
      </example_texts>
      <frequency_estimate>medium</frequency_estimate>
    </code>

    <code>
      <name>Adidas</name>
      <description>Positive mentions of Adidas footwear and brand</description>
      <confidence>high</confidence>
      <example_texts>
        <text id="3">Adidas is my favorite</text>
        <text id="4">Buty Adidas są najlepsze</text>
      </example_texts>
      <frequency_estimate>medium</frequency_estimate>
    </code>

    <!-- More codes... -->
  </codes>

  <mece_assessment>
    <exclusivity>excellent</exclusivity>
    <exhaustiveness>excellent</exhaustiveness>
    <notes>Clear brand-based segmentation with no overlaps.</notes>
  </mece_assessment>
</analysis>
```

## Best Practices

### 1. Regular Updates

Review and update the prompt based on:
- Real-world usage feedback
- Quality issues identified
- New edge cases discovered
- MECE validation failures

### 2. Version Control

When updating:
1. Increment version number
2. Update date
3. Document changes in header comments
4. Test with sample data

### 3. A/B Testing

Consider maintaining multiple versions:
- Conservative (more guidance)
- Liberal (more flexibility)
- Specialized (domain-specific)

### 4. Monitoring

Track in production:
- Average MECE scores
- Code count distribution
- Confidence levels
- User edits to generated codes

### 5. Optimization

If needed:
- Reduce token count by removing examples
- Add domain-specific guidance
- Adjust quality thresholds
- Modify hierarchy logic

## Troubleshooting

### Issue: Low MECE Scores

**Symptoms**: Scores < 70 consistently

**Solutions**:
1. Add more examples of good MECE structure
2. Strengthen exclusivity guidelines
3. Add examples of bad overlaps to avoid

### Issue: Too Many Codes

**Symptoms**: > 7 codes per theme regularly

**Solutions**:
1. Emphasize "3-7 codes" guideline more
2. Add penalty for over-segmentation
3. Provide examples of well-merged codes

### Issue: Generic Codes

**Symptoms**: Frequent "Other", "Miscellaneous"

**Solutions**:
1. Strengthen prohibition on generic codes
2. Require minimum 10% coverage per code
3. Add examples of specific vs. generic naming

### Issue: Wrong Hierarchy Depth

**Symptoms**: Always flat or always three-level

**Solutions**:
1. Add more examples showing when to use each
2. Emphasize "adaptive" nature
3. Provide decision tree in prompt

## Related Files

- `python-service/services/claude_client.py` - Uses this prompt
- `python-service/validate_prompt.py` - Validation script
- `python-service/test_request.json` - Sample test data
- `supabase/migrations/` - Database schema for results

## Changelog

### Version 1.0.0 (2025-01-01)

Initial release with:
- Complete MECE guidelines
- Adaptive hierarchy logic
- Multilingual support
- Chain-of-thought reasoning
- Quality standards
- Edge case handling

## References

- MECE Principle: https://en.wikipedia.org/wiki/MECE_principle
- Qualitative Coding: https://en.wikipedia.org/wiki/Coding_(social_sciences)
- Claude API Docs: https://docs.anthropic.com/claude/docs
- XML Specification: https://www.w3.org/XML/

---

**Maintainer**: TGM Research Team
**Last Review**: 2025-01-01
**Next Review**: 2025-04-01 (quarterly)

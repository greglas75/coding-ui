# AI Cost Dashboard - User Guide

## Overview

The AI Cost Dashboard helps you monitor and control your AI feature expenses across the Research Coding platform. It tracks costs for two main AI-powered features:

- **Answer Coding** (GPT-4o-mini) - AI categorization of survey responses
- **Codeframe Builder** (Claude Sonnet 4.5) - AI generation of coding frameworks

## Accessing the Dashboard

1. Navigate to the main application
2. Click the **"Costs"** link in the top navigation bar (dollar sign icon)
3. Or visit directly: `http://localhost:5173/cost-dashboard`

## Dashboard Sections

### 1. Overview Cards

Three summary cards at the top show your key metrics:

**Total Spend**
- Shows total AI costs for the selected time period
- Displays percentage change vs previous period
- Green arrow (↓) = costs decreased
- Red arrow (↑) = costs increased

**Answer Coding**
- Costs specifically for AI answer categorization
- Shows total number of answers categorized
- Average cost per answer
- Model used: GPT-4o-mini

**Codeframe Builder**
- Costs for AI codeframe generation
- Number of codeframes created
- Average cost per codeframe
- Model used: Claude Sonnet 4.5

### 2. Time Period Selector

Use the dropdown in the top-right to change the time period:
- **Today** - Current day's costs
- **Yesterday** - Previous day
- **This Week** - Current week (Monday-Sunday)
- **Last Week** - Previous week
- **This Month** - Current calendar month
- **Last Month** - Previous calendar month

### 3. Budget Status

Displays your monthly budget usage:

**Color Coding:**
- 🟢 **Green** (0-79%) - Normal usage
- 🟡 **Yellow** (80-89%) - Approaching limit
- 🔴 **Red** (90-100%) - Near or over limit

**Alert Threshold:**
When you exceed 80% of your monthly budget, a warning appears:
> ⚠️ Approaching budget limit
> Consider optimizing AI usage or increasing your budget

**Budget Management:**
- Default monthly limit: $200
- To change your budget, use the API endpoint (see Technical Documentation)

### 4. End-of-Month Projection

Predicts your total costs by month's end based on current usage patterns.

**Confidence Levels:**
- 🟢 **High confidence** - 15+ days of data in current month
- 🟡 **Medium confidence** - 7-14 days of data
- 🟠 **Low confidence** - 3-6 days of data
- ⚪ **Insufficient data** - Less than 3 days

The projection uses daily average × remaining days + current total.

### 5. Cost Breakdown Chart

**Horizontal Bars:**
- Visual representation of cost split between features
- Shows percentage and dollar amount
- Displays key metrics:
  - Total items processed
  - Average cost per item

**Bar Chart:**
- Side-by-side comparison of feature costs
- Hover over bars for exact amounts

### 6. Historical Trend Chart

**Toggle View:**
- **Last 30 Days** - Daily breakdown
- **Last 6 Months** - Monthly aggregates

**Chart Lines:**
- 🔵 Blue line - Answer Coding costs
- 🟣 Purple line - Codeframe Builder costs
- 🟢 Green dashed line - Total combined costs

**Reading the Chart:**
- X-axis: Date or month
- Y-axis: Cost in USD
- Hover over data points for exact values

### 7. Detailed Cost Breakdown Table

**Features:**
- Paginated list of all AI operations
- 20 items per page
- Real-time cost details

**Columns:**
- **Date** - When the operation occurred
- **Feature** - Answer Coding or Codeframe Builder
- **Description** - What was processed
- **Model** - AI model used
- **Tokens** - Input/output token counts
- **Cost** - USD amount to 4 decimal places

**Filtering:**
Use the "Feature" dropdown to filter:
- All Features
- Answer Coding only
- Codeframe Builder only

**Exporting Data:**
Click **"Export CSV"** to download all cost data as a spreadsheet.

CSV includes:
- Date and time
- Feature type
- Model name
- Token usage (input/output)
- Cost in USD
- Description

## Understanding Costs

### Answer Coding Pricing

**Model:** GPT-4o-mini

**Typical costs per answer:**
- Simple categorization: $0.001 - $0.003
- Complex multi-category: $0.005 - $0.010

**What affects cost:**
- Answer length (longer = more input tokens)
- Number of categories
- Complexity of instructions

### Codeframe Generation Pricing

**Model:** Claude Sonnet 4.5

**Typical costs per codeframe:**
- Small codeframe (5-10 codes): $1.00 - $3.00
- Medium codeframe (11-25 codes): $3.00 - $8.00
- Large codeframe (26+ codes): $8.00 - $15.00

**What affects cost:**
- Number of sample responses analyzed
- Codeframe complexity
- Number of iterations/refinements

## Cost Optimization Tips

### For Answer Coding:

1. **Batch similar answers** - Process similar questions together
2. **Use clear categories** - Well-defined categories reduce retries
3. **Review auto-confirm settings** - Auto-confirm high-confidence results
4. **Limit category count** - More categories = higher costs

### For Codeframe Generation:

1. **Provide quality samples** - Better samples = fewer iterations
2. **Use templates** - Start with existing codeframes when possible
3. **Be specific in prompts** - Clear instructions reduce back-and-forth
4. **Review before regenerating** - Regeneration doubles costs

### General Tips:

1. **Monitor your budget** - Check dashboard weekly
2. **Set appropriate limits** - Adjust based on project needs
3. **Use filters** - Target specific data subsets
4. **Export regularly** - Track patterns over time

## Empty States

When you first access the dashboard or haven't used AI features recently, you'll see:

> No data available yet
> Cost data will appear here as you use AI features

This is normal. Costs appear as you:
- Categorize answers using AI
- Generate codeframes with the builder

## Common Questions (FAQ)

**Q: Why is my dashboard empty?**
A: You haven't used any AI features yet, or there's no data for the selected time period.

**Q: When do costs appear?**
A: Immediately after using AI features. Refresh if needed.

**Q: Can I delete cost entries?**
A: No. All costs are logged permanently for accurate tracking.

**Q: What if I exceed my budget?**
A: You'll see a warning at 80%. At 100%, new AI operations may be blocked (configurable).

**Q: How often does data update?**
A: Real-time. The dashboard refreshes every 2 minutes automatically, or use the browser refresh.

**Q: Can I export historical data?**
A: Yes, use the "Export CSV" button in the Detailed Breakdown section.

**Q: What's the difference between projections and actuals?**
A:
- **Actuals** = What you've spent so far (Overview cards)
- **Projections** = Predicted month-end total (Prediction card)

**Q: Why did costs spike suddenly?**
A: Check the Detailed Table for specific operations. Common causes:
- Large batch of answer categorization
- Multiple codeframe generations
- Processing unusually long responses

**Q: How do I reduce costs?**
A: Follow the Cost Optimization Tips section above. Focus on:
- Reducing unnecessary AI calls
- Improving prompt quality
- Using batch operations efficiently

**Q: Are these costs real charges?**
A: Yes, these reflect actual API costs from OpenAI (GPT) and Anthropic (Claude).

**Q: Can I set custom budget alerts?**
A: Currently via API only. See technical documentation.

## Dark Mode Support

The dashboard fully supports dark mode:
- Toggle using the theme button in the top navigation
- All charts and tables adapt to dark theme
- Improved readability in low-light conditions

## Mobile Support

The dashboard is responsive and works on mobile devices:
- Cards stack vertically on small screens
- Tables scroll horizontally
- Charts resize appropriately
- All features remain accessible

## Need Help?

**Technical Issues:**
- Check the browser console for errors
- Verify API server is running (port 3001)
- Check database connection

**Questions about costs:**
- Review this documentation
- Check the Detailed Table for specific operations
- Export data for deeper analysis

**Feature Requests:**
- Submit via GitHub issues
- Contact system administrator

## Related Documentation

- [Setup Guide](./COST_DASHBOARD_SETUP.md) - Installation and configuration
- [API Documentation](./API_COST_TRACKING.md) - Technical API reference
- [Database Schema](./DATABASE_SCHEMA.md) - Schema documentation

---

**Last Updated:** 2025-10-21
**Version:** 1.0.0

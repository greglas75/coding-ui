## E2E Testing Guide

Complete end-to-end testing suite with Playwright covering all application features.

## 📁 Structure

```
e2e/
├── fixtures/          # Test data files
│   ├── valid-codes.xlsx
│   ├── large-dataset.xlsx
│   ├── malformed-data.xlsx
│   ├── valid-codes.csv
│   ├── invalid.txt
│   └── api-test-data.json
├── helpers/           # Reusable helper functions
│   ├── test-helpers.ts
│   ├── api-helpers.ts
│   ├── fixture-helpers.ts
│   ├── accessibility-helpers.ts
│   └── e2e-helpers.ts
├── tests/             # Test files (~170 tests)
│   ├── ai-features.spec.ts
│   ├── api-endpoints.spec.ts
│   ├── import-export.spec.ts
│   ├── keyboard-shortcuts.spec.ts
│   ├── security.spec.ts
│   ├── accessibility.spec.ts
│   ├── mobile-responsive.spec.ts
│   ├── error-handling.spec.ts
│   ├── performance.spec.ts
│   ├── offline-mode.spec.ts
│   ├── analytics-dashboard.spec.ts
│   ├── realtime-collaboration.spec.ts
│   ├── settings.spec.ts
│   ├── advanced-features.spec.ts
│   └── ... (existing tests)
└── global-setup.ts    # Pre-test setup
```

## 🚀 Running Tests

### All Tests
```bash
npm run test:e2e
```

### Specific Test Suite
```bash
npm run test:e2e -- ai-features
npm run test:e2e -- api-endpoints
npm run test:e2e -- import-export
npm run test:e2e -- keyboard-shortcuts
npm run test:e2e -- security
npm run test:e2e -- accessibility
npm run test:e2e -- mobile-responsive
npm run test:e2e -- error-handling
npm run test:e2e -- performance
```

### With UI Mode
```bash
npm run test:e2e:ui
```

### Debug Mode
```bash
npm run test:e2e:debug -- ai-features
```

### Record New Tests
```bash
npm run test:e2e:record
```

## 📊 Test Coverage

### Priority High (~40 tests)
- **AI Features** (15 tests): AI suggestions, auto-confirm, pricing
- **API Endpoints** (8 tests): Health, filtering, upload, rate limiting
- **Import/Export** (10 tests): Excel/CSV import/export with validation
- **Keyboard Shortcuts** (8 tests): Quick status, navigation, actions
- **Security** (6 tests): XSS protection, file validation, rate limits

### Priority Medium (~20 tests)
- **Accessibility** (8 tests): A11y compliance, keyboard nav, ARIA
- **Mobile Responsive** (6 tests): Mobile layout, touch interactions
- **Error Handling** (7 tests): Network errors, boundaries, 404

### Priority Low (~30 tests)
- **Performance** (6 tests): Load times, virtualization, debouncing
- **Offline Mode** (5 tests): Caching, queue, sync
- **Analytics** (4 tests): Charts, filters, export
- **Real-time** (4 tests): Online users, updates
- **Settings** (5 tests): AI config, theme, notifications
- **Advanced** (6 tests): Undo/redo, batch operations

### Existing Tests (~43 tests)
- Workflow tests for categories, codes, coding
- Critical user workflows
- Filter persistence
- Status management

**Total: ~170 E2E tests**

## 🎯 Fixtures

### Excel Files
- `valid-codes.xlsx` - Valid code import (10 rows)
- `large-dataset.xlsx` - Performance testing (1000+ rows)
- `malformed-data.xlsx` - Error handling (bad columns/types)
- `empty-file.xlsx` - Empty file validation

### CSV Files
- `valid-codes.csv` - Valid CSV import
- `invalid-encoding.csv` - Encoding error handling

### Other Files
- `invalid.txt` - File type validation
- `api-test-data.json` - API test data

## 🛠️ Prerequisites

### Required Services
1. **Frontend Server** (required)
   ```bash
   npm run build
   npm run preview
   # Runs on http://localhost:4173
   ```

2. **API Server** (optional, but recommended)
   ```bash
   npm run dev:api
   # Runs on http://localhost:3001
   ```

### Optional Dependencies
For full accessibility testing:
```bash
npm install -D @axe-core/playwright axe-playwright
```

## 📝 Test Reports

### View HTML Report
```bash
npm run test:e2e:report
```

### Report Includes
- Test results with pass/fail status
- Screenshots of failures
- Videos of test runs
- Execution times
- Error stack traces

### Report Locations
- HTML Report: `playwright-report/index.html`
- Test Results: `test-results/`
- Screenshots: `test-results/screenshots/`
- Videos: `test-results/videos/`

## 🧪 Writing New Tests

### Using Helpers
```typescript
import {
  goToCodingPage,
  waitForLoadingToFinish,
  uploadFile
} from '../helpers/test-helpers';
import { getValidExcelPath } from '../helpers/fixture-helpers';

test('my new test', async ({ page }) => {
  await goToCodingPage(page, 1);
  await waitForLoadingToFinish(page);

  const filePath = getValidExcelPath();
  await uploadFile(page, filePath);
});
```

### Test Structure
```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

## 🔧 Configuration

### Playwright Config
See `playwright.config.ts`:
- Timeout: 60s per test
- Retries: 1 locally, 2 on CI
- Workers: 4 locally, 2 on CI
- Trace: Retained on failure
- Screenshots/Videos: On failure only

### Environment Variables
- `CI=true` - Enables CI mode (headless, more retries)
- `DEBUG=pw:api` - Enables Playwright debug logs

## 🚨 Troubleshooting

### Tests Fail: "Target closed"
- Increase timeout in `playwright.config.ts`
- Check if services are running

### Tests Fail: "Cannot find fixture"
- Run `node e2e/fixtures/generate-excel-fixtures.js`
- Check fixture paths in `fixture-helpers.ts`

### API Tests Skip
- Start API server: `npm run dev:api`
- Check API health: http://localhost:3001/api/health

### Slow Test Execution
- Reduce `slowMo` in config
- Use headless mode: `HEADLESS=true npm run test:e2e`
- Run specific suites instead of all tests

## 📈 Best Practices

1. **Use Helpers**: Reuse helper functions for common actions
2. **Wait for Loading**: Always wait for loading to finish
3. **Use Fixtures**: Use fixture files for test data
4. **Check Visibility**: Always check if elements exist before interacting
5. **Graceful Skips**: Skip tests if features aren't implemented
6. **Clean Up**: Tests should be independent and not affect each other
7. **Descriptive Names**: Use clear test names explaining what's tested
8. **Console Logs**: Add console.log for test progress tracking

## 🎯 CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: |
    npm run build
    npm run preview &
    npm run dev:api &
    sleep 5
    npm run test:e2e
```

### Test Sharding (for faster CI)
```bash
npx playwright test --shard=1/4
npx playwright test --shard=2/4
npx playwright test --shard=3/4
npx playwright test --shard=4/4
```

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices Guide](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)

## ✅ Test Checklist

Before committing:
- [ ] All tests pass locally
- [ ] New tests added for new features
- [ ] Fixtures generated if needed
- [ ] Helper functions used
- [ ] Tests are independent
- [ ] Descriptive test names
- [ ] Console logs for debugging
- [ ] Documentation updated

---

**Total Tests**: ~170 E2E tests
**Execution Time**: ~15-20 minutes (full suite)
**Success Rate**: Target 95%+ on CI


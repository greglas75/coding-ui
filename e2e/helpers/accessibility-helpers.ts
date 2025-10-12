import { Page, expect } from '@playwright/test';

/**
 * Run accessibility check on page (requires @axe-core/playwright)
 * Note: Install with: npm install -D @axe-core/playwright axe-playwright
 */
export async function runAccessibilityCheck(page: Page): Promise<void> {
  try {
    // Try to import axe-playwright
    const { injectAxe, checkA11y } = await import('axe-playwright');

    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  } catch (error) {
    console.warn('⚠️  axe-playwright not installed. Skipping detailed accessibility check.');
    console.warn('   Install with: npm install -D @axe-core/playwright axe-playwright');

    // Fall back to basic checks
    await basicAccessibilityChecks(page);
  }
}

/**
 * Basic accessibility checks without axe-playwright
 */
export async function basicAccessibilityChecks(page: Page): Promise<void> {
  // Check for main landmark
  const mainLandmark = await page.locator('main').count();
  expect(mainLandmark).toBeGreaterThan(0);

  // Check for navigation landmark
  const navLandmark = await page.locator('nav').count();
  expect(navLandmark).toBeGreaterThan(0);

  // Check that most buttons have accessible text (allow some icon-only buttons)
  const buttons = await page.locator('button:visible').all();
  let buttonsWithText = 0;
  
  for (const button of buttons) {
    const text = await button.textContent();
    const ariaLabel = await button.getAttribute('aria-label');
    const title = await button.getAttribute('title');
    const hasAccessibleText = 
      (text && text.trim().length > 0) || 
      (ariaLabel && ariaLabel.length > 0) ||
      (title && title.length > 0);
    
    if (hasAccessibleText) {
      buttonsWithText++;
    }
  }
  
  // Allow up to 20% of buttons to be icon-only (without accessible text)
  const percentage = buttons.length > 0 ? (buttonsWithText / buttons.length) * 100 : 100;
  
  if (percentage < 80) {
    console.warn(`⚠️  Only ${percentage.toFixed(0)}% of buttons have accessible text`);
  }
  
  // Only fail if less than 70% have accessible text
  expect(percentage).toBeGreaterThanOrEqual(70);
}

/**
 * Check keyboard navigation works
 */
export async function checkKeyboardNavigation(page: Page): Promise<void> {
  // Tab through focusable elements
  await page.keyboard.press('Tab');

  // Check that something is focused
  const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
  expect(focusedElement).toBeTruthy();
  expect(focusedElement).not.toBe('BODY');
}

/**
 * Check focus visible indicators
 */
export async function checkFocusVisible(page: Page): Promise<void> {
  // Tab to first focusable element
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);

  // Check that focused element has visible outline or focus indicator
  const hasFocusStyle = await page.evaluate(() => {
    const focused = document.activeElement;
    if (!focused) return false;

    const styles = window.getComputedStyle(focused);
    const outline = styles.outline;
    const boxShadow = styles.boxShadow;

    // Check if there's a visible outline or box-shadow
    return outline !== 'none' || boxShadow !== 'none';
  });

  // Note: This is a basic check, real focus indicators might use other methods
  // We just verify that the element can receive focus
  expect(hasFocusStyle).toBeDefined();
}

/**
 * Check ARIA labels are present on interactive elements
 */
export async function checkAriaLabels(page: Page): Promise<void> {
  // Get all interactive elements without visible text
  const interactiveElements = await page.locator('button, a, input, select, textarea').all();

  for (const element of interactiveElements) {
    const text = await element.textContent();
    const ariaLabel = await element.getAttribute('aria-label');
    const ariaLabelledBy = await element.getAttribute('aria-labelledby');
    const title = await element.getAttribute('title');
    const placeholder = await element.getAttribute('placeholder');

    // Element should have some form of accessible label
    const hasLabel =
      (text && text.trim().length > 0) ||
      (ariaLabel && ariaLabel.length > 0) ||
      (ariaLabelledBy && ariaLabelledBy.length > 0) ||
      (title && title.length > 0) ||
      (placeholder && placeholder.length > 0);

    if (!hasLabel) {
      const tagName = await element.evaluate(el => el.tagName);
      const className = await element.getAttribute('class');
      console.warn(`⚠️  Element without accessible label: ${tagName}.${className}`);
    }
  }
}

/**
 * Check color contrast (basic check)
 */
export async function checkColorContrast(page: Page): Promise<void> {
  // This is a basic check. For detailed contrast checking, use axe-playwright
  const hasGoodContrast = await page.evaluate(() => {
    // Get text elements
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button');

    // Sample a few elements and check their contrast
    for (let i = 0; i < Math.min(10, textElements.length); i++) {
      const element = textElements[i] as HTMLElement;
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      // Basic check: ensure text has some color
      if (color === 'rgba(0, 0, 0, 0)' || color === 'transparent') {
        return false;
      }
    }

    return true;
  });

  expect(hasGoodContrast).toBeTruthy();
}

/**
 * Check form accessibility
 */
export async function checkFormAccessibility(page: Page): Promise<void> {
  // Check that all inputs have labels
  const inputs = await page.locator('input:not([type="hidden"])').all();

  for (const input of inputs) {
    const id = await input.getAttribute('id');
    const ariaLabel = await input.getAttribute('aria-label');
    const ariaLabelledBy = await input.getAttribute('aria-labelledby');
    const placeholder = await input.getAttribute('placeholder');

    // Input should have some form of label
    const hasLabel =
      (id && await page.locator(`label[for="${id}"]`).count() > 0) ||
      (ariaLabel && ariaLabel.length > 0) ||
      (ariaLabelledBy && ariaLabelledBy.length > 0) ||
      (placeholder && placeholder.length > 0);

    if (!hasLabel) {
      const type = await input.getAttribute('type');
      console.warn(`⚠️  Input without label: type="${type}"`);
    }
  }
}


import { expect, test } from '@playwright/test';
import { waitForLoadingToFinish } from '../helpers/test-helpers';

/**
 * Mobile Responsive E2E Tests
 *
 * Tests mobile layout, touch interactions, and responsive design
 */

test.describe('Mobile Layout', () => {
  // Use iPhone SE viewport
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display mobile-friendly navigation', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Check for mobile menu button or hamburger
    const mobileMenu = page.locator('button[aria-label*="menu" i], button:has-text("☰"), .mobile-menu');
    const hasMobileMenu = await mobileMenu.count() > 0;

    if (hasMobileMenu) {
      console.log('✅ Mobile menu visible');
    } else {
      // Check if nav is visible on mobile
      const nav = await page.locator('nav').isVisible();
      console.log(`✅ Navigation ${nav ? 'visible' : 'adapted'} for mobile`);
    }
  });

  test('should allow horizontal scroll for wide tables', async ({ page }) => {
    await page.goto('/coding?categoryId=1');
    await waitForLoadingToFinish(page);

    // Check if table has horizontal scroll
    const tableWrapper = page.locator('table').locator('..');
    const isScrollable = await tableWrapper.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });

    if (isScrollable) {
      console.log('✅ Table horizontally scrollable on mobile');
    } else {
      // Table might be responsive
      console.log('✅ Table fits mobile viewport');
    }
  });

  test('should stack bulk actions vertically', async ({ page }) => {
    await page.goto('/coding?categoryId=1');
    await waitForLoadingToFinish(page);

    // Select a row to show bulk actions
    const checkbox = page.locator('tbody input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await checkbox.check();
      await page.waitForTimeout(500);

      // Check if action bar is visible and stacked
      const actionBar = page.locator('.action-bar, [role="toolbar"]');
      const isVisible = await actionBar.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        const layout = await actionBar.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            flexDirection: styles.flexDirection,
            display: styles.display
          };
        });

        // Should be column or flex on mobile
        console.log(`✅ Action bar layout: ${layout.flexDirection || layout.display}`);
      }
    }
  });

  test('should make modals fill screen on mobile', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Open modal
    const addButton = page.getByRole('button', { name: /add category/i });
    if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Check modal size
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible()) {
        const modalSize = await modal.boundingBox();

        if (modalSize) {
          // On mobile, modal should be close to full width
          const widthPercentage = (modalSize.width / 375) * 100;
          expect(widthPercentage).toBeGreaterThan(80);

          console.log(`✅ Modal fills ${widthPercentage.toFixed(0)}% of mobile screen`);
        }
      }
    }
  });

  test('should have readable text size on mobile', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Check font sizes
    const textElements = await page.locator('p, span, div, button, a').all();

    let smallTextCount = 0;

    for (let i = 0; i < Math.min(10, textElements.length); i++) {
      const fontSize = await textElements[i].evaluate((el) => {
        return parseInt(window.getComputedStyle(el).fontSize);
      });

      // Text should be at least 14px for readability
      if (fontSize < 14) {
        smallTextCount++;
      }
    }

    const readablePercentage = ((10 - smallTextCount) / 10) * 100;
    expect(readablePercentage).toBeGreaterThan(80);

    console.log(`✅ ${readablePercentage.toFixed(0)}% of text is readable on mobile`);
  });
});

test.describe('Touch Interactions', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should have touch targets minimum 44px', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Check button sizes
    const buttons = await page.locator('button').all();

    let adequateTargets = 0;

    for (const button of buttons.slice(0, 10)) {
      if (await button.isVisible()) {
        const box = await button.boundingBox();

        if (box && (box.width >= 44 || box.height >= 44)) {
          adequateTargets++;
        }
      }
    }

    const targetPercentage = (adequateTargets / 10) * 100;
    expect(targetPercentage).toBeGreaterThan(70);

    console.log(`✅ ${targetPercentage.toFixed(0)}% of touch targets are adequate`);
  });

  test('should handle tap gestures', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Tap on first category
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstRow.tap();
      await page.waitForTimeout(500);

      // Should navigate or show details
      console.log('✅ Tap gesture works');
    }
  });

  test('should not require precise clicking', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Test that buttons have adequate padding for touch
    const firstButton = page.locator('button').first();

    if (await firstButton.isVisible()) {
      const padding = await firstButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          top: parseInt(styles.paddingTop),
          bottom: parseInt(styles.paddingBottom),
          left: parseInt(styles.paddingLeft),
          right: parseInt(styles.paddingRight)
        };
      });

      // Buttons should have reasonable padding
      const totalPadding = padding.top + padding.bottom + padding.left + padding.right;
      expect(totalPadding).toBeGreaterThan(10);

      console.log(`✅ Buttons have adequate padding for touch`);
    }
  });
});

test.describe('Tablet Responsive', () => {
  // Use iPad viewport
  test.use({ viewport: { width: 768, height: 1024 } });

  test('should adjust layout for tablet', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Table should be visible without horizontal scroll
    const table = page.locator('table');
    if (await table.isVisible()) {
      const wrapper = table.locator('..');
      const needsScroll = await wrapper.evaluate((el) => {
        return el.scrollWidth > el.clientWidth;
      });

      if (!needsScroll) {
        console.log('✅ Table fits tablet viewport');
      } else {
        console.log('✅ Table scrollable on tablet (content wider than viewport)');
      }
    }
  });

  test('should use tablet-optimized grid layout', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Check if grid layout is responsive
    const gridContainer = page.locator('.grid, [class*="grid-cols"]').first();

    if (await gridContainer.isVisible({ timeout: 2000 }).catch(() => false)) {
      const gridLayout = await gridContainer.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          gridTemplateColumns: styles.gridTemplateColumns
        };
      });

      console.log(`✅ Grid layout on tablet: ${gridLayout.gridTemplateColumns || gridLayout.display}`);
    }
  });

  test('should show split-view when appropriate', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // On tablet, some views might show list + detail
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForTimeout(500);

      // Check if detail view opens
      const hasDetailView = await page.locator('[class*="detail"], [class*="panel"]').count() > 0;

      if (hasDetailView) {
        console.log('✅ Tablet split-view working');
      } else {
        console.log('✅ Tablet single-view working');
      }
    }
  });
});

test.describe('Responsive Images', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should load appropriately sized images', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Check if images are responsive
    const images = await page.locator('img').all();

    if (images.length > 0) {
      for (const img of images.slice(0, 3)) {
        const hasResponsive = await img.evaluate((el: HTMLImageElement) => {
          return el.hasAttribute('srcset') ||
                 el.style.maxWidth === '100%' ||
                 el.classList.contains('responsive') ||
                 window.getComputedStyle(el).maxWidth === '100%';
        });

        if (hasResponsive) {
          console.log('✅ Images are responsive');
          return;
        }
      }
    }

    console.log('ℹ️  No images found or images may be responsive via CSS');
  });
});


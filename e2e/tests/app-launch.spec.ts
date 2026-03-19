import { test, expect } from '../fixtures/electron';

test.describe('App Launch', () => {
  test('window opens successfully', async ({ page }) => {
    // The page should be loaded and visible
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('displays NetPad Pro branding in status bar', async ({ page }) => {
    const branding = page.locator('text=NetPad Pro');
    await expect(branding.first()).toBeVisible({ timeout: 10000 });
  });

  test('shows at least one tab on startup', async ({ page }) => {
    // Wait for the tab bar to render
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });
    const closeBtns = await page.locator('[title="Close tab"]').count();
    expect(closeBtns).toBeGreaterThanOrEqual(1);
  });

  test('shows 1 Pane in status bar', async ({ page }) => {
    const paneCount = page.locator('text=1 Pane');
    await expect(paneCount).toBeVisible({ timeout: 10000 });
  });
});

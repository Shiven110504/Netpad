import { test, expect } from '../fixtures/electron';

test.describe('App Launch & Basic UI', () => {
  test('window opens with correct branding and initial state', async ({ page }) => {
    // The page should be loaded
    const title = await page.title();
    expect(title).toBeTruthy();

    // Should show NetPad Pro branding
    const branding = page.locator('text=NetPad Pro');
    await expect(branding.first()).toBeVisible({ timeout: 10000 });

    // Should have at least one tab
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });
    const closeBtns = await page.locator('[title="Close tab"]').count();
    expect(closeBtns).toBeGreaterThanOrEqual(1);

    // Should show 1 Pane in status bar
    const paneCount = page.locator('text=1 Pane');
    await expect(paneCount).toBeVisible({ timeout: 5000 });
  });
});

import { test, expect } from '../fixtures/electron';

test.describe('Settings', () => {
  test('settings modal opens with Ctrl+,', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    // Open settings
    await page.keyboard.press('Control+,');

    // Settings modal should appear
    const settingsTitle = page.locator('text=Settings').first();
    await expect(settingsTitle).toBeVisible({ timeout: 5000 });
  });

  test('settings modal has Terminal tab', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    // Open settings
    await page.keyboard.press('Control+,');
    await page.waitForTimeout(300);

    // Click Terminal tab
    const terminalTab = page.locator('button:has-text("terminal")');
    await expect(terminalTab).toBeVisible({ timeout: 5000 });
    await terminalTab.click();

    // Terminal settings should show
    await expect(page.locator('text=Font Family')).toBeVisible();
    await expect(page.locator('text=Scrollback Lines')).toBeVisible();
    await expect(page.locator('text=Cursor Style')).toBeVisible();
  });

  test('settings modal has Shortcuts tab with SSH shortcut', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    // Open settings
    await page.keyboard.press('Control+,');
    await page.waitForTimeout(300);

    // Click Shortcuts tab
    const shortcutsTab = page.locator('button:has-text("shortcuts")');
    await shortcutsTab.click();

    // Should show SSH terminal shortcut
    await expect(page.locator('text=New SSH terminal')).toBeVisible({ timeout: 3000 });
  });

  test('settings modal closes with Escape', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    // Open settings
    await page.keyboard.press('Control+,');
    const settingsTitle = page.locator('text=Settings').first();
    await expect(settingsTitle).toBeVisible({ timeout: 5000 });

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(settingsTitle).not.toBeVisible({ timeout: 3000 });
  });
});

import { test, expect } from '../fixtures/electron';

test.describe('Settings', () => {
  test('settings modal opens, has Terminal and Shortcuts tabs, and closes', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    // Open settings with Ctrl+,
    await page.keyboard.press('Control+,');
    const settingsTitle = page.locator('text=Settings').first();
    await expect(settingsTitle).toBeVisible({ timeout: 5000 });

    // Click Terminal tab — should show terminal settings
    const terminalTab = page.locator('button:has-text("terminal")');
    await expect(terminalTab).toBeVisible({ timeout: 5000 });
    await terminalTab.click();
    await expect(page.locator('text=Font Family')).toBeVisible();
    await expect(page.locator('text=Cursor Style')).toBeVisible();

    // Click Shortcuts tab — should show SSH shortcut
    const shortcutsTab = page.locator('button:has-text("shortcuts")');
    await shortcutsTab.click();
    await expect(page.locator('text=New SSH terminal')).toBeVisible({ timeout: 3000 });

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(settingsTitle).not.toBeVisible({ timeout: 3000 });
  });
});

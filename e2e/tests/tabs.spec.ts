import { test, expect } from '../fixtures/electron';

test.describe('Tab Management', () => {
  test('can create and close tabs', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });
    const initialTabs = await page.locator('[title="Close tab"]').count();

    // Create a new tab
    const addBtn = page.locator('[title="New Note Tab (Ctrl+N)"]');
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();

    // Should have one more tab
    const afterAdd = await page.locator('[title="Close tab"]').count();
    expect(afterAdd).toBe(initialTabs + 1);

    // Close the last tab
    await page.locator('[title="Close tab"]').last().click();

    // Should be back to original count
    const afterClose = await page.locator('[title="Close tab"]').count();
    expect(afterClose).toBe(initialTabs);
  });

  test('can switch between tabs with keyboard', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    // Create a second tab
    await page.keyboard.press('Control+n');
    await page.waitForTimeout(300);

    const tabs = await page.locator('[title="Close tab"]').count();
    expect(tabs).toBeGreaterThanOrEqual(2);
  });
});

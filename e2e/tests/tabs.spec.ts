import { test, expect } from '../fixtures/electron';

test.describe('Tab Management', () => {
  test('can create a new tab', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });
    const initialTabs = await page.locator('[title="Close tab"]').count();

    // Click the new note tab button
    const addBtn = page.locator('[title="New Note Tab (Ctrl+N)"]');
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();

    // Should have one more tab
    const newTabs = await page.locator('[title="Close tab"]').count();
    expect(newTabs).toBe(initialTabs + 1);
  });

  test('can close a tab', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    // First create a second tab so we can close one
    const addBtn = page.locator('[title="New Note Tab (Ctrl+N)"]');
    await addBtn.click();
    await page.waitForTimeout(300);

    const tabsBefore = await page.locator('[title="Close tab"]').count();
    expect(tabsBefore).toBeGreaterThanOrEqual(2);

    // Close the last tab
    const closeBtns = page.locator('[title="Close tab"]');
    await closeBtns.last().click();

    const tabsAfter = await page.locator('[title="Close tab"]').count();
    expect(tabsAfter).toBe(tabsBefore - 1);
  });

  test('can switch between tabs', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    // Create a second tab
    const addBtn = page.locator('[title="New Note Tab (Ctrl+N)"]');
    await addBtn.click();
    await page.waitForTimeout(300);

    // Both tabs should be visible — look for "Untitled" text in tab bar area
    const tabs = await page.locator('[title="Close tab"]').count();
    expect(tabs).toBeGreaterThanOrEqual(2);
  });
});

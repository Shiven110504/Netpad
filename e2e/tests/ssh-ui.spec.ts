import { test, expect } from '../fixtures/electron';

test.describe('SSH UI', () => {
  test('SSH connection dialog can be opened from tab bar dropdown', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    // Find and click the SSH dropdown chevron button
    const chevronBtn = page.locator('[title="New Tab Options"]');
    await expect(chevronBtn).toBeVisible({ timeout: 5000 });
    await chevronBtn.click();

    // The dropdown should appear with SSH Terminal option
    const sshOption = page.locator('text=New SSH Terminal');
    await expect(sshOption).toBeVisible({ timeout: 3000 });
  });

  test('SSH connection dialog has required fields', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    // Open SSH connection dialog via keyboard shortcut
    await page.keyboard.press('Control+Shift+T');

    // Wait for dialog to appear
    const dialog = page.locator('text=SSH Connection');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Check for required form fields
    await expect(page.locator('text=Hostname')).toBeVisible();
    await expect(page.locator('text=Port')).toBeVisible();
    await expect(page.locator('text=Username')).toBeVisible();
  });

  test('SSH connection dialog can be closed with Cancel', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    // Open dialog
    await page.keyboard.press('Control+Shift+T');
    const dialog = page.locator('text=SSH Connection');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Close with Cancel button
    const cancelBtn = page.locator('button:has-text("Cancel")');
    await cancelBtn.click();

    // Dialog should be gone
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test('SSH connection dialog can be closed with Escape', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    // Open dialog
    await page.keyboard.press('Control+Shift+T');
    const dialog = page.locator('text=SSH Connection');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Close with Escape
    await page.keyboard.press('Escape');

    // Dialog should be gone
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });
});

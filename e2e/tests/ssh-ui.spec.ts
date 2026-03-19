import { test, expect } from '../fixtures/electron';

test.describe('SSH UI', () => {
  test('SSH connection dialog opens from dropdown and has required fields', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    // Open via dropdown menu
    const chevronBtn = page.locator('[title="New Tab Options"]');
    await expect(chevronBtn).toBeVisible({ timeout: 5000 });
    await chevronBtn.click();

    const sshOption = page.locator('text=New SSH Terminal');
    await expect(sshOption).toBeVisible({ timeout: 3000 });
    await sshOption.click();

    // Dialog should appear with required fields
    const dialog = page.locator('text=SSH Connection');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Hostname')).toBeVisible();
    await expect(page.locator('text=Port')).toBeVisible();
    await expect(page.locator('text=Username')).toBeVisible();

    // Close with Cancel
    await page.locator('button:has-text("Cancel")').click();
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test('SSH connection dialog opens with Ctrl+Shift+T and closes with Escape', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    // Open with keyboard shortcut
    await page.keyboard.press('Control+Shift+T');
    const dialog = page.locator('text=SSH Connection');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });
});

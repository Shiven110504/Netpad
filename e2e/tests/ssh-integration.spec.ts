import { test, expect } from '../fixtures/mock-ssh-server';
import { test as electronTest, expect as electronExpect } from '../fixtures/electron';

// Helper: fill the SSH connection dialog and connect
async function connectToServer(page: any, port: number, password = 'testpass') {
  await page.keyboard.press('Control+Shift+T');
  await page.locator('text=SSH Connection').waitFor({ state: 'visible', timeout: 5000 });

  await page.locator('input[placeholder="192.168.1.1"]').fill('127.0.0.1');
  await page.locator('input[type="number"]').fill(String(port));
  await page.locator('input[placeholder="admin"]').fill('testuser');
  await page.locator('input[placeholder="Enter password"]').fill(password);

  // Click Connect (exact match to avoid matching "Reconnect")
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
}

// Helper: wait for SSH connection to be established
async function waitForConnected(page: any) {
  const connectingText = page.locator('text=/Connecting to/i');
  await connectingText.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  await connectingText.waitFor({ state: 'hidden', timeout: 10000 });

  // Verify no error appeared
  const errorText = page.locator('text=/All configured authentication|Connection error/i');
  await expect(errorText).not.toBeVisible({ timeout: 2000 });
}

test.describe('SSH Integration', () => {
  test('connects to SSH server and can type into terminal', async ({ page, sshPort }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    await connectToServer(page, sshPort);
    await page.waitForSelector('.xterm', { timeout: 10000 });
    await waitForConnected(page);

    // Verify no error overlay
    const errorOverlay = page.locator('text=/All configured authentication|Connection error|error/i');
    await expect(errorOverlay).not.toBeVisible({ timeout: 3000 });

    // Type into terminal and verify it stays connected
    const terminal = page.locator('.xterm-helper-textarea');
    await terminal.focus();
    await terminal.type('hello');
    await page.waitForTimeout(1000);

    await expect(page.locator('.xterm')).toBeVisible();
  });

  test('SSH tab can be created and closed, updating tab count', async ({ page, sshPort }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });
    const tabsBefore = await page.locator('[title="Close tab"]').count();

    await connectToServer(page, sshPort);
    await page.waitForSelector('.xterm', { timeout: 10000 });
    await waitForConnected(page);

    // Tab count should have increased
    expect(await page.locator('[title="Close tab"]').count()).toBe(tabsBefore + 1);

    // Close the SSH tab
    await page.locator('[title="Close tab"]').last().click();
    await page.waitForTimeout(500);

    // Tab count should be back to original
    expect(await page.locator('[title="Close tab"]').count()).toBe(tabsBefore);
  });

  test('wrong password shows auth error', async ({ page, sshPort }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    await connectToServer(page, sshPort, 'wrongpassword');

    // Should show an auth error
    const errorText = page.locator('text=/authentication|error|failed/i');
    await expect(errorText.first()).toBeVisible({ timeout: 10000 });
  });
});

// Connection failure test uses base electron fixture (no mock server needed)
electronTest.describe('SSH Connection Failure', () => {
  electronTest('shows error state when connection refused', async ({ page }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    // Try to connect to a port with nothing listening
    await page.keyboard.press('Control+Shift+T');
    await page.locator('text=SSH Connection').waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('input[placeholder="192.168.1.1"]').fill('127.0.0.1');
    await page.locator('input[type="number"]').fill('19999');
    await page.locator('input[placeholder="admin"]').fill('testuser');
    await page.locator('input[placeholder="Enter password"]').fill('wrong');

    await page.getByRole('button', { name: 'Connect', exact: true }).click();

    // Should show an error or disconnected state
    const errorText = page.locator('text=/error|disconnected|failed|refused|timed out/i');
    await electronExpect(errorText.first()).toBeVisible({ timeout: 15000 });
  });
});

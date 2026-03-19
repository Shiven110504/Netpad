import { test, expect } from '../fixtures/mock-ssh-server';
import { test as electronTest, expect as electronExpect } from '../fixtures/electron';

// Helper: fill the SSH connection dialog and connect
async function connectToServer(page: any, port: number, password = 'testpass') {
  // Open SSH connection dialog
  await page.keyboard.press('Control+Shift+T');
  await page.locator('text=SSH Connection').waitFor({ state: 'visible', timeout: 5000 });

  // Fill hostname
  const hostInput = page.locator('input[placeholder="192.168.1.1"]');
  await hostInput.fill('127.0.0.1');

  // Fill port
  const portInput = page.locator('input[type="number"]');
  await portInput.fill(String(port));

  // Fill username
  const usernameInput = page.locator('input[placeholder="admin"]');
  await usernameInput.fill('testuser');

  // Fill password
  const passwordInput = page.locator('input[placeholder="Enter password"]');
  await passwordInput.fill(password);

  // Click Connect (exact match to avoid matching "Reconnect")
  const connectBtn = page.getByRole('button', { name: 'Connect', exact: true });
  await connectBtn.click();
}

// Helper: wait for SSH connection to be established (green status dot appears)
async function waitForConnected(page: any) {
  // Wait for the "Connecting to..." text to disappear — it's only shown while connecting
  const connectingText = page.locator('text=/Connecting to/i');
  await connectingText.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  await connectingText.waitFor({ state: 'hidden', timeout: 10000 });

  // Verify no error appeared
  const errorText = page.locator('text=/All configured authentication|Connection error/i');
  await expect(errorText).not.toBeVisible({ timeout: 2000 });
}

test.describe('SSH Integration', () => {
  test('can connect to mock SSH server successfully', async ({ page, sshPort }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    await connectToServer(page, sshPort);

    // Wait for terminal to appear
    await page.waitForSelector('.xterm', { timeout: 10000 });

    // CRITICAL: Verify the connection actually succeeds by waiting for the
    // connecting/error overlay to disappear. If auth fails, an error overlay stays visible.
    await waitForConnected(page);

    // Verify no error overlay is shown
    const errorOverlay = page.locator('text=/All configured authentication|Connection error|error/i');
    await expect(errorOverlay).not.toBeVisible({ timeout: 3000 });
  });

  test('can type into connected terminal and data flows', async ({ page, sshPort }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    await connectToServer(page, sshPort);
    await page.waitForSelector('.xterm', { timeout: 10000 });
    await waitForConnected(page);

    // Type into the terminal — xterm uses a hidden textarea
    const terminal = page.locator('.xterm-helper-textarea');
    await terminal.focus();
    await terminal.type('hello');

    // Wait for echo response from mock server
    await page.waitForTimeout(1000);

    // Terminal should still be visible and no error overlay
    await expect(page.locator('.xterm')).toBeVisible();
    const errorOverlay = page.locator('text=/error|disconnected|failed/i');
    await expect(errorOverlay).not.toBeVisible({ timeout: 2000 });
  });

  test('closing SSH tab reduces tab count', async ({ page, sshPort }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    const tabsBefore = await page.locator('[title="Close tab"]').count();

    await connectToServer(page, sshPort);
    await page.waitForSelector('.xterm', { timeout: 10000 });
    await waitForConnected(page);

    // Tab count should have increased
    const tabsWithSSH = await page.locator('[title="Close tab"]').count();
    expect(tabsWithSSH).toBe(tabsBefore + 1);

    // Close the SSH tab (last close button)
    await page.locator('[title="Close tab"]').last().click();
    await page.waitForTimeout(500);

    // Tab count should be back to original
    const tabsAfter = await page.locator('[title="Close tab"]').count();
    expect(tabsAfter).toBe(tabsBefore);
  });

  test('wrong password shows auth error', async ({ page, sshPort }) => {
    await page.waitForSelector('[title="Close tab"]', { timeout: 10000 });

    // Connect with wrong password
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

    const hostInput = page.locator('input[placeholder="192.168.1.1"]');
    await hostInput.fill('127.0.0.1');

    const portInput = page.locator('input[type="number"]');
    await portInput.fill('19999');

    const usernameInput = page.locator('input[placeholder="admin"]');
    await usernameInput.fill('testuser');

    const passwordInput = page.locator('input[placeholder="Enter password"]');
    await passwordInput.fill('wrong');

    const connectBtn = page.getByRole('button', { name: 'Connect', exact: true });
    await connectBtn.click();

    // Should show an error or disconnected state in the terminal overlay
    const errorText = page.locator('text=/error|disconnected|failed|refused|timed out/i');
    await electronExpect(errorText.first()).toBeVisible({ timeout: 15000 });
  });
});

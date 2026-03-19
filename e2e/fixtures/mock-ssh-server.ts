import { test as electronTest, expect } from './electron';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { startServer } = require('../helpers/ssh-server.cjs');

type SSHServerFixture = {
  sshPort: number;
};

export const test = electronTest.extend<SSHServerFixture>({
  sshPort: async ({}, use) => {
    const { port, stop } = await startServer();
    await use(port);
    await stop();
  },
});

export { expect };

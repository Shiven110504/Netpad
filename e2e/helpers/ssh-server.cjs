const { Server, utils: ssh2Utils } = require('ssh2');
const { generateKeyPairSync } = require('crypto');

/**
 * Creates a mock SSH server for integration testing.
 * - Accepts username 'testuser' with password 'testpass'
 * - Echoes back received data with "echo: " prefix
 * - Sends a welcome banner on shell open
 */
function startServer() {
  return new Promise((resolve, reject) => {
    // Generate an RSA host key in PKCS1 format (ssh2 requires this, not PKCS8)
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    });

    const activeClients = new Set();

    const server = new Server({ hostKeys: [privateKey] }, (client) => {
      activeClients.add(client);
      client.on('close', () => activeClients.delete(client));

      client.on('authentication', (ctx) => {
        if (ctx.method === 'password' && ctx.username === 'testuser' && ctx.password === 'testpass') {
          ctx.accept();
        } else if (ctx.method === 'none') {
          ctx.reject(['password']);
        } else {
          ctx.reject();
        }
      });

      client.on('ready', () => {
        client.on('session', (accept) => {
          const session = accept();

          let shellStream = null;

          session.on('pty', (accept) => {
            accept();
          });

          session.on('shell', (accept) => {
            shellStream = accept();

            // Send welcome banner
            shellStream.write('mock-ssh-server ready\r\n');

            // Echo back received data
            shellStream.on('data', (data) => {
              const text = data.toString();
              shellStream.write(`echo: ${text}`);
            });
          });

          session.on('window-change', (accept) => {
            if (accept) accept();
          });
        });
      });

      client.on('error', () => {
        // Ignore client errors in test server
      });
    });

    server.on('error', (err) => {
      reject(err);
    });

    // Listen on random port
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        port,
        stop: () => new Promise((res) => {
          // Force-close all active client connections so server.close() doesn't hang
          for (const client of activeClients) {
            try { client.end(); } catch (e) { /* ignore */ }
          }
          activeClients.clear();
          server.close(() => res());
        }),
      });
    });
  });
}

module.exports = { startServer };

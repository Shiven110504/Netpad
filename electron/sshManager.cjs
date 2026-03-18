const { Client } = require('ssh2');
const { EventEmitter } = require('events');
const { readFileSync } = require('fs');

class SSHManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
  }

  connect(sessionId, config) {
    return new Promise((resolve, reject) => {
      if (this.sessions.has(sessionId)) {
        this.disconnect(sessionId);
      }

      const client = new Client();
      const session = { client, channel: null, config };
      this.sessions.set(sessionId, session);

      this.emit('status', sessionId, 'connecting', null);

      client.on('ready', () => {
        client.shell(
          { term: 'xterm-256color', cols: 80, rows: 24 },
          (err, channel) => {
            if (err) {
              this.emit('status', sessionId, 'error', err.message);
              reject(err);
              return;
            }

            session.channel = channel;
            this.emit('status', sessionId, 'connected', null);

            channel.on('data', (data) => {
              this.emit('data', sessionId, data.toString('base64'));
            });

            channel.stderr.on('data', (data) => {
              this.emit('data', sessionId, data.toString('base64'));
            });

            channel.on('close', () => {
              this.emit('status', sessionId, 'disconnected', null);
              this.sessions.delete(sessionId);
            });

            resolve({ sessionId, status: 'connected' });
          }
        );
      });

      client.on('error', (err) => {
        this.emit('status', sessionId, 'error', err.message);
        this.sessions.delete(sessionId);
        reject(err);
      });

      client.on('end', () => {
        if (this.sessions.has(sessionId)) {
          this.emit('status', sessionId, 'disconnected', null);
          this.sessions.delete(sessionId);
        }
      });

      client.on('close', () => {
        if (this.sessions.has(sessionId)) {
          this.emit('status', sessionId, 'disconnected', null);
          this.sessions.delete(sessionId);
        }
      });

      // Build connection config
      const connConfig = {
        host: config.host,
        port: config.port || 22,
        username: config.username,
        readyTimeout: 10000,
        keepaliveInterval: 30000,
        keepaliveCountMax: 3,
      };

      if (config.authMethod === 'key' && config.keyFilePath) {
        try {
          connConfig.privateKey = readFileSync(config.keyFilePath);
          if (config.passphrase) {
            connConfig.passphrase = config.passphrase;
          }
        } catch (err) {
          this.emit('status', sessionId, 'error', `Failed to read key file: ${err.message}`);
          this.sessions.delete(sessionId);
          reject(err);
          return;
        }
      } else {
        connConfig.password = config.password;
      }

      client.connect(connConfig);
    });
  }

  disconnect(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        if (session.channel) {
          session.channel.close();
        }
        session.client.end();
      } catch (e) {
        // Ignore errors during cleanup
      }
      this.sessions.delete(sessionId);
    }
  }

  send(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (session?.channel) {
      session.channel.write(data);
    }
  }

  resize(sessionId, cols, rows) {
    const session = this.sessions.get(sessionId);
    if (session?.channel) {
      session.channel.setWindow(rows, cols, rows * 16, cols * 8);
    }
  }

  disconnectAll() {
    for (const sessionId of this.sessions.keys()) {
      this.disconnect(sessionId);
    }
  }
}

module.exports = new SSHManager();

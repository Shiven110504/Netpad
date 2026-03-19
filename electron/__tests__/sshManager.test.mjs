import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { SSHManager } = require('../sshManager.cjs');

// Mock ssh2 Client
class MockClient extends EventEmitter {
  connect = vi.fn();
  shell = vi.fn();
  end = vi.fn();
}

function createMockChannel() {
  const channel = new EventEmitter();
  channel.close = vi.fn();
  channel.write = vi.fn();
  channel.setWindow = vi.fn();
  channel.stderr = new EventEmitter();
  return channel;
}

describe('SSHManager', () => {
  let manager;
  let lastMockClient;
  let mockReadFileSync;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFileSync = vi.fn(() => Buffer.from('mock-private-key'));
    manager = new SSHManager({
      createClient: () => {
        lastMockClient = new MockClient();
        return lastMockClient;
      },
      readFileSync: mockReadFileSync,
    });
  });

  // Helper to connect and get a connected session
  async function connectSession(sessionId = 'sess1', config = {}) {
    const channel = createMockChannel();
    const connectPromise = manager.connect(sessionId, {
      host: '10.0.0.1',
      username: 'root',
      password: 'pass',
      ...config,
    });
    const client = lastMockClient;
    client.shell.mockImplementation((_opts, cb) => cb(null, channel));
    client.emit('ready');
    await connectPromise;
    return { client, channel };
  }

  describe('connection lifecycle', () => {
    it('transitions through connecting → connected status on successful connect', async () => {
      const statusSpy = vi.fn();
      manager.on('status', statusSpy);

      const result = await connectSession('sess1');

      expect(statusSpy).toHaveBeenCalledWith('sess1', 'connecting', null);
      expect(statusSpy).toHaveBeenCalledWith('sess1', 'connected', null);
      expect(result.client.connect).toHaveBeenCalledWith(
        expect.objectContaining({ host: '10.0.0.1', username: 'root', port: 22 })
      );
    });

    it('emits error status and rejects on connection failure', async () => {
      const statusSpy = vi.fn();
      manager.on('status', statusSpy);

      const connectPromise = manager.connect('sess1', {
        host: '10.0.0.1', username: 'root', password: 'pass',
      });
      lastMockClient.emit('error', new Error('Connection refused'));

      await expect(connectPromise).rejects.toThrow('Connection refused');
      expect(statusSpy).toHaveBeenCalledWith('sess1', 'error', 'Connection refused');
    });

    it('emits error status and rejects on shell failure', async () => {
      const connectPromise = manager.connect('sess1', {
        host: '10.0.0.1', username: 'root', password: 'pass',
      });
      lastMockClient.shell.mockImplementation((_opts, cb) => cb(new Error('Shell failed')));
      lastMockClient.emit('ready');

      await expect(connectPromise).rejects.toThrow('Shell failed');
    });

    it('emits disconnected on channel close, client end, and client close', async () => {
      const statusSpy = vi.fn();
      manager.on('status', statusSpy);

      // Test channel close
      const { channel } = await connectSession('sess1');
      channel.emit('close');
      expect(statusSpy).toHaveBeenCalledWith('sess1', 'disconnected', null);
      expect(manager.sessions.has('sess1')).toBe(false);

      // Test client end
      const { client: client2 } = await connectSession('sess2');
      client2.emit('end');
      expect(statusSpy).toHaveBeenCalledWith('sess2', 'disconnected', null);

      // Test client close
      const { client: client3 } = await connectSession('sess3');
      client3.emit('close');
      expect(statusSpy).toHaveBeenCalledWith('sess3', 'disconnected', null);
    });

    it('disconnects existing session when reconnecting with same id', async () => {
      const { client: client1, channel: channel1 } = await connectSession('sess1');

      manager.connect('sess1', { host: '10.0.0.2', username: 'root', password: 'pass' });

      expect(channel1.close).toHaveBeenCalled();
      expect(client1.end).toHaveBeenCalled();
    });
  });

  describe('authentication methods', () => {
    it('connects with password auth and default port', () => {
      manager.connect('sess1', {
        host: '10.0.0.1', username: 'root', password: 'pass123',
      });

      expect(lastMockClient.connect).toHaveBeenCalledWith(
        expect.objectContaining({ host: '10.0.0.1', username: 'root', password: 'pass123', port: 22 })
      );
    });

    it('connects with key auth, reads key file, supports passphrase', () => {
      manager.connect('sess1', {
        host: '10.0.0.1', username: 'root',
        authMethod: 'key', keyFilePath: '/home/user/.ssh/id_rsa', passphrase: 'mypass',
      });

      expect(mockReadFileSync).toHaveBeenCalledWith('/home/user/.ssh/id_rsa');
      expect(lastMockClient.connect).toHaveBeenCalledWith(
        expect.objectContaining({ privateKey: expect.any(Buffer), passphrase: 'mypass' })
      );
    });

    it('rejects with error when key file cannot be read', async () => {
      mockReadFileSync.mockImplementationOnce(() => { throw new Error('ENOENT'); });

      const connectPromise = manager.connect('sess1', {
        host: '10.0.0.1', username: 'root', authMethod: 'key', keyFilePath: '/nonexistent/key',
      });

      await expect(connectPromise).rejects.toThrow('ENOENT');
    });
  });

  describe('data forwarding', () => {
    it('forwards stdout and stderr as base64 data events', async () => {
      const dataSpy = vi.fn();
      manager.on('data', dataSpy);

      const { channel } = await connectSession('sess1');

      const stdout = Buffer.from('Hello from server');
      channel.emit('data', stdout);
      expect(dataSpy).toHaveBeenCalledWith('sess1', stdout.toString('base64'));

      const stderr = Buffer.from('Error output');
      channel.stderr.emit('data', stderr);
      expect(dataSpy).toHaveBeenCalledWith('sess1', stderr.toString('base64'));
    });
  });

  describe('session operations', () => {
    it('send() writes data to channel', async () => {
      const { channel } = await connectSession('sess1');
      manager.send('sess1', 'ls -la\n');
      expect(channel.write).toHaveBeenCalledWith('ls -la\n');
    });

    it('resize() calls setWindow with correct dimensions', async () => {
      const { channel } = await connectSession('sess1');
      manager.resize('sess1', 120, 40);
      expect(channel.setWindow).toHaveBeenCalledWith(40, 120, 40 * 16, 120 * 8);
    });

    it('disconnect() closes channel and ends client', async () => {
      const { client, channel } = await connectSession('sess1');
      manager.disconnect('sess1');
      expect(channel.close).toHaveBeenCalled();
      expect(client.end).toHaveBeenCalled();
      expect(manager.sessions.has('sess1')).toBe(false);
    });

    it('disconnectAll() cleans up all sessions', async () => {
      const { client: c1, channel: ch1 } = await connectSession('sess1');
      const { client: c2, channel: ch2 } = await connectSession('sess2');

      manager.disconnectAll();

      expect(ch1.close).toHaveBeenCalled();
      expect(ch2.close).toHaveBeenCalled();
      expect(c1.end).toHaveBeenCalled();
      expect(c2.end).toHaveBeenCalled();
      expect(manager.sessions.size).toBe(0);
    });

    it('operations on non-existent sessions do not throw', () => {
      expect(() => manager.disconnect('nonexistent')).not.toThrow();
      expect(() => manager.send('nonexistent', 'data')).not.toThrow();
      expect(() => manager.resize('nonexistent', 80, 24)).not.toThrow();
    });
  });
});

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

  describe('connect()', () => {
    it('emits connecting status on connect', () => {
      const statusSpy = vi.fn();
      manager.on('status', statusSpy);

      manager.connect('sess1', {
        host: '192.168.1.1',
        port: 22,
        username: 'admin',
        password: 'secret',
      });

      expect(statusSpy).toHaveBeenCalledWith('sess1', 'connecting', null);
    });

    it('connects with password auth', () => {
      manager.connect('sess1', {
        host: '10.0.0.1',
        port: 22,
        username: 'root',
        password: 'pass123',
      });

      expect(lastMockClient.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          host: '10.0.0.1',
          port: 22,
          username: 'root',
          password: 'pass123',
        })
      );
    });

    it('connects with key auth', () => {
      manager.connect('sess1', {
        host: '10.0.0.1',
        port: 22,
        username: 'root',
        authMethod: 'key',
        keyFilePath: '/home/user/.ssh/id_rsa',
      });

      expect(mockReadFileSync).toHaveBeenCalledWith('/home/user/.ssh/id_rsa');
      expect(lastMockClient.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          host: '10.0.0.1',
          username: 'root',
          privateKey: expect.any(Buffer),
        })
      );
    });

    it('connects with key auth and passphrase', () => {
      manager.connect('sess1', {
        host: '10.0.0.1',
        username: 'root',
        authMethod: 'key',
        keyFilePath: '/home/user/.ssh/id_rsa',
        passphrase: 'mypass',
      });

      expect(lastMockClient.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          privateKey: expect.any(Buffer),
          passphrase: 'mypass',
        })
      );
    });

    it('uses default port 22 when not specified', () => {
      manager.connect('sess1', {
        host: '10.0.0.1',
        username: 'root',
        password: 'pass',
      });

      expect(lastMockClient.connect).toHaveBeenCalledWith(
        expect.objectContaining({ port: 22 })
      );
    });

    it('resolves with sessionId and status on successful connection', async () => {
      const channel = createMockChannel();
      const connectPromise = manager.connect('sess1', {
        host: '10.0.0.1',
        username: 'root',
        password: 'pass',
      });

      lastMockClient.shell.mockImplementation((_opts, cb) => cb(null, channel));
      lastMockClient.emit('ready');

      const result = await connectPromise;
      expect(result).toEqual({ sessionId: 'sess1', status: 'connected' });
    });

    it('emits connected status after successful shell', async () => {
      const statusSpy = vi.fn();
      manager.on('status', statusSpy);

      await connectSession('sess1');

      expect(statusSpy).toHaveBeenCalledWith('sess1', 'connecting', null);
      expect(statusSpy).toHaveBeenCalledWith('sess1', 'connected', null);
    });

    it('rejects and emits error on client error', async () => {
      const statusSpy = vi.fn();
      manager.on('status', statusSpy);

      const connectPromise = manager.connect('sess1', {
        host: '10.0.0.1',
        username: 'root',
        password: 'pass',
      });

      lastMockClient.emit('error', new Error('Connection refused'));

      await expect(connectPromise).rejects.toThrow('Connection refused');
      expect(statusSpy).toHaveBeenCalledWith('sess1', 'error', 'Connection refused');
    });

    it('rejects on shell error', async () => {
      const statusSpy = vi.fn();
      manager.on('status', statusSpy);

      const connectPromise = manager.connect('sess1', {
        host: '10.0.0.1',
        username: 'root',
        password: 'pass',
      });

      lastMockClient.shell.mockImplementation((_opts, cb) => cb(new Error('Shell failed')));
      lastMockClient.emit('ready');

      await expect(connectPromise).rejects.toThrow('Shell failed');
      expect(statusSpy).toHaveBeenCalledWith('sess1', 'error', 'Shell failed');
    });

    it('rejects on key file read failure', async () => {
      const statusSpy = vi.fn();
      manager.on('status', statusSpy);
      mockReadFileSync.mockImplementationOnce(() => { throw new Error('ENOENT'); });

      const connectPromise = manager.connect('sess1', {
        host: '10.0.0.1',
        username: 'root',
        authMethod: 'key',
        keyFilePath: '/nonexistent/key',
      });

      await expect(connectPromise).rejects.toThrow('ENOENT');
      expect(statusSpy).toHaveBeenCalledWith('sess1', 'error', expect.stringContaining('Failed to read key file'));
    });

    it('disconnects existing session with same id before reconnecting', async () => {
      const { client: client1, channel: channel1 } = await connectSession('sess1');

      // Second connection with same sessionId
      manager.connect('sess1', {
        host: '10.0.0.2',
        username: 'root',
        password: 'pass',
      });

      expect(channel1.close).toHaveBeenCalled();
      expect(client1.end).toHaveBeenCalled();
    });
  });

  describe('data forwarding', () => {
    it('emits data event with base64 when channel receives data', async () => {
      const dataSpy = vi.fn();
      manager.on('data', dataSpy);

      const { channel } = await connectSession('sess1');

      const buf = Buffer.from('Hello from server');
      channel.emit('data', buf);

      expect(dataSpy).toHaveBeenCalledWith('sess1', buf.toString('base64'));
    });

    it('emits data event for stderr', async () => {
      const dataSpy = vi.fn();
      manager.on('data', dataSpy);

      const { channel } = await connectSession('sess1');

      const buf = Buffer.from('Error output');
      channel.stderr.emit('data', buf);

      expect(dataSpy).toHaveBeenCalledWith('sess1', buf.toString('base64'));
    });
  });

  describe('channel close', () => {
    it('emits disconnected and removes session on channel close', async () => {
      const statusSpy = vi.fn();
      manager.on('status', statusSpy);

      const { channel } = await connectSession('sess1');
      channel.emit('close');

      expect(statusSpy).toHaveBeenCalledWith('sess1', 'disconnected', null);
      expect(manager.sessions.has('sess1')).toBe(false);
    });
  });

  describe('disconnect()', () => {
    it('closes channel and ends client', async () => {
      const { client, channel } = await connectSession('sess1');

      manager.disconnect('sess1');

      expect(channel.close).toHaveBeenCalled();
      expect(client.end).toHaveBeenCalled();
      expect(manager.sessions.has('sess1')).toBe(false);
    });

    it('does nothing for non-existent session', () => {
      expect(() => manager.disconnect('nonexistent')).not.toThrow();
    });
  });

  describe('send()', () => {
    it('writes data to channel', async () => {
      const { channel } = await connectSession('sess1');

      manager.send('sess1', 'ls -la\n');

      expect(channel.write).toHaveBeenCalledWith('ls -la\n');
    });

    it('does nothing for non-existent session', () => {
      expect(() => manager.send('nonexistent', 'data')).not.toThrow();
    });
  });

  describe('resize()', () => {
    it('calls setWindow with correct args', async () => {
      const { channel } = await connectSession('sess1');

      manager.resize('sess1', 120, 40);

      // sshManager passes: rows, cols, rows*16, cols*8
      expect(channel.setWindow).toHaveBeenCalledWith(40, 120, 40 * 16, 120 * 8);
    });

    it('does nothing for non-existent session', () => {
      expect(() => manager.resize('nonexistent', 80, 24)).not.toThrow();
    });
  });

  describe('disconnectAll()', () => {
    it('disconnects all active sessions', async () => {
      const { client: client1, channel: channel1 } = await connectSession('sess1');
      const { client: client2, channel: channel2 } = await connectSession('sess2');

      manager.disconnectAll();

      expect(channel1.close).toHaveBeenCalled();
      expect(channel2.close).toHaveBeenCalled();
      expect(client1.end).toHaveBeenCalled();
      expect(client2.end).toHaveBeenCalled();
      expect(manager.sessions.size).toBe(0);
    });
  });

  describe('client end/close events', () => {
    it('emits disconnected on client end event', async () => {
      const statusSpy = vi.fn();
      manager.on('status', statusSpy);

      const { client } = await connectSession('sess1');
      client.emit('end');

      expect(statusSpy).toHaveBeenCalledWith('sess1', 'disconnected', null);
    });

    it('emits disconnected on client close event', async () => {
      const statusSpy = vi.fn();
      manager.on('status', statusSpy);

      const { client } = await connectSession('sess1');
      client.emit('close');

      expect(statusSpy).toHaveBeenCalledWith('sess1', 'disconnected', null);
    });
  });
});

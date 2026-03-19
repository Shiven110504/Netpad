const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sshAPI', {
  isAvailable: true,

  connect: (config) => ipcRenderer.invoke('ssh:connect', config),
  disconnect: (sessionId) => ipcRenderer.invoke('ssh:disconnect', sessionId),

  send: (sessionId, data) => ipcRenderer.send('ssh:send', sessionId, data),
  resize: (sessionId, cols, rows) => ipcRenderer.send('ssh:resize', sessionId, cols, rows),

  onData: (callback) => {
    const handler = (_event, sessionId, data) => callback(sessionId, data);
    ipcRenderer.on('ssh:data', handler);
    return () => ipcRenderer.removeListener('ssh:data', handler);
  },

  onStatus: (callback) => {
    const handler = (_event, sessionId, status, error) => callback(sessionId, status, error);
    ipcRenderer.on('ssh:status', handler);
    return () => ipcRenderer.removeListener('ssh:status', handler);
  },

  selectKeyFile: () => ipcRenderer.invoke('ssh:selectKeyFile'),
});

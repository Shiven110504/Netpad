const { app, BrowserWindow, Menu, MenuItem, ipcMain, dialog } = require('electron');
const path = require('path');
const sshManager = require('./sshManager.cjs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'NetPad Pro',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Remove default menu bar for cleaner look (keep dev tools accessible via shortcut)
  Menu.setApplicationMenu(null);

  // Native right-click context menu
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();

    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'undo' }));
      menu.append(new MenuItem({ role: 'redo' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'cut' }));
      menu.append(new MenuItem({ role: 'copy' }));
      menu.append(new MenuItem({ role: 'paste' }));
      menu.append(new MenuItem({ role: 'delete' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'selectAll' }));
    } else if (params.selectionText) {
      menu.append(new MenuItem({ role: 'copy' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'selectAll' }));
    } else {
      menu.append(new MenuItem({ role: 'selectAll' }));
    }

    if (!app.isPackaged) {
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({
        label: 'Inspect Element',
        click: () => {
          mainWindow.webContents.inspectElement(params.x, params.y);
          if (!mainWindow.webContents.isDevToolsOpened()) {
            mainWindow.webContents.openDevTools();
          }
        },
      }));
    }

    if (menu.items.length > 0) {
      menu.popup({ window: mainWindow });
    }
  });

  if (app.isPackaged) {
    // Production — load the Vite build output
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    // Development — load the Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // SSH IPC handlers
  ipcMain.handle('ssh:connect', async (_event, config) => {
    const { v4: uuidv4 } = require('uuid');
    const sessionId = uuidv4();
    try {
      const result = await sshManager.connect(sessionId, config);
      return result;
    } catch (err) {
      return { sessionId, status: 'error', error: err.message };
    }
  });

  ipcMain.handle('ssh:disconnect', async (_event, sessionId) => {
    sshManager.disconnect(sessionId);
    return { success: true };
  });

  ipcMain.on('ssh:send', (_event, sessionId, data) => {
    sshManager.send(sessionId, data);
  });

  ipcMain.on('ssh:resize', (_event, sessionId, cols, rows) => {
    sshManager.resize(sessionId, cols, rows);
  });

  ipcMain.handle('ssh:selectKeyFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select SSH Private Key',
      properties: ['openFile'],
      filters: [
        { name: 'SSH Keys', extensions: ['pem', 'key', 'ppk'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Forward SSH events to renderer
  sshManager.on('data', (sessionId, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ssh:data', sessionId, data);
    }
  });

  sshManager.on('status', (sessionId, status, error) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ssh:status', sessionId, status, error);
    }
  });
}

// Quit when all windows are closed
app.on('window-all-closed', () => {
  sshManager.disconnectAll();
  // On macOS, apps typically stay active until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

app.whenReady().then(createWindow);

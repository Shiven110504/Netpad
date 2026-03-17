// Preload script — runs in renderer context before page loads.
// Use contextBridge to expose safe APIs to the renderer if needed in the future.
//
// Example:
//   const { contextBridge } = require('electron');
//   contextBridge.exposeInMainWorld('electronAPI', {
//     platform: process.platform,
//   });

// For now, no custom APIs are needed — the app runs entirely in the browser context
// using localStorage for persistence.

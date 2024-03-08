const { contextBridge, ipcRenderer } = require("electron");

// Expose Electron APIs securely
contextBridge.exposeInMainWorld("electron", {
  // sending messages from renderer to main process
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  // receiving messages from main to renderer process
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
});

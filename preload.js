const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  receive: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args)),
  openExternal: (url) => ipcRenderer.send('open-external', url),
});

contextBridge.exposeInMainWorld('vpn', {
  getConfigs: () => ipcRenderer.send('get-configs'),
  connect: (configIndex) => ipcRenderer.send('connect-vpn', configIndex),
  disconnect: () => ipcRenderer.send('disconnect-vpn'),
  requestStats: () => ipcRenderer.send('request-stats'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  onUpdateConfigs: (callback) => ipcRenderer.on('update-configs', (event, configs) => callback(configs)),
  onConnectionStatus: (callback) => ipcRenderer.on('connection-status', (event, isConnected) => callback(isConnected)),
  onConnectionStats: (callback) => ipcRenderer.on('connection-stats', (event, stats) => callback(stats))
});

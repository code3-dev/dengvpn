const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  receive: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args)),
  openExternal: (url) => ipcRenderer.send('open-external', url),
});

contextBridge.exposeInMainWorld('vpn', {
  connect: (serverIndex) => {
    ipcRenderer.send('connect-vpn', serverIndex);
  },
  disconnect: () => {
    ipcRenderer.send('disconnect-vpn');
  },
  getConfigs: () => {
    ipcRenderer.send('get-configs');
  },
  requestStats: () => {
    ipcRenderer.send('request-stats');
  },
  onUpdateConfigs: (callback) => {
    ipcRenderer.on('update-configs', (event, configs) => callback(configs));
  },
  onConnectionStatus: (callback) => {
    ipcRenderer.on('connection-status', (event, status) => callback(status));
  },
  onConnectionStats: (callback) => {
    ipcRenderer.on('connection-stats', (event, stats) => callback(stats));
  },
  openExternal: (url) => {
    ipcRenderer.send('open-external', url);
  }
});

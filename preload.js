const { contextBridge, ipcRenderer } = require('electron');

// Cache for callbacks to prevent memory leaks
const callbackCache = new Map();

contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    // List of allowed channels
    const validChannels = ['open-external', 'connect-vpn', 'connect-vpn-url', 'disconnect-vpn', 'get-configs', 'request-stats'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, callback) => {
    // List of allowed channels
    const validChannels = ['update-configs', 'connection-status', 'connection-stats'];
    if (validChannels.includes(channel)) {
      // Cache the callback to prevent memory leaks
      if (!callbackCache.has(channel)) {
        callbackCache.set(channel, new Set());
      }
      callbackCache.get(channel).add(callback);
      
      // Remove callback when the page unloads
      window.addEventListener('beforeunload', () => {
        if (callbackCache.has(channel)) {
          callbackCache.get(channel).delete(callback);
        }
      });
      
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  openExternal: (url) => {
    ipcRenderer.send('open-external', url);
  },
});

contextBridge.exposeInMainWorld('vpn', {
  connect: (serverIndex) => {
    ipcRenderer.send('connect-vpn', serverIndex);
  },
  connectWithUrl: (configUrl) => {
    ipcRenderer.send('connect-vpn-url', configUrl);
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
    const channel = 'update-configs';
    if (!callbackCache.has(channel)) {
      callbackCache.set(channel, new Set());
    }
    callbackCache.get(channel).add(callback);
    
    // Remove callback when the page unloads
    window.addEventListener('beforeunload', () => {
      if (callbackCache.has(channel)) {
        callbackCache.get(channel).delete(callback);
      }
    });
    
    ipcRenderer.on(channel, (event, configs) => callback(configs));
  },
  onConnectionStatus: (callback) => {
    const channel = 'connection-status';
    if (!callbackCache.has(channel)) {
      callbackCache.set(channel, new Set());
    }
    callbackCache.get(channel).add(callback);
    
    // Remove callback when the page unloads
    window.addEventListener('beforeunload', () => {
      if (callbackCache.has(channel)) {
        callbackCache.get(channel).delete(callback);
      }
    });
    
    ipcRenderer.on(channel, (event, status) => callback(status));
  },
  onConnectionStats: (callback) => {
    const channel = 'connection-stats';
    if (!callbackCache.has(channel)) {
      callbackCache.set(channel, new Set());
    }
    callbackCache.get(channel).add(callback);
    
    // Remove callback when the page unloads
    window.addEventListener('beforeunload', () => {
      if (callbackCache.has(channel)) {
        callbackCache.get(channel).delete(callback);
      }
    });
    
    ipcRenderer.on(channel, (event, stats) => callback(stats));
  },
  openExternal: (url) => {
    ipcRenderer.send('open-external', url);
  }
});
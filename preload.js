const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  fetchShows: (date) => ipcRenderer.invoke('fetch-shows', date)
});

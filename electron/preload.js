const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    getConfig: () => ipcRenderer.invoke('config:get'),
    saveConfig: (config) => ipcRenderer.invoke('config:save', config),
    getWeather: () => ipcRenderer.invoke('weather:get'),
    onWeather: (cb) => ipcRenderer.on('weather:update', (_e, data) => cb(data))
})
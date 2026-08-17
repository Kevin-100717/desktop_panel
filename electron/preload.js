const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    getConfig: () => ipcRenderer.invoke('config:get'),
    saveConfig: (config) => ipcRenderer.invoke('config:save', config),
    getWeather: () => ipcRenderer.invoke('weather:get'),
    onWeather: (cb) => ipcRenderer.on('weather:update', (_e, data) => cb(data)),
    getAutoStart: () => ipcRenderer.invoke('autostart:get'),
    setAutoStart: (enabled) => ipcRenderer.invoke('autostart:set', enabled),
    getStats: () => ipcRenderer.invoke('stats:get')
})
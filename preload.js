const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI',{
    openFile: () => ipcRenderer.invoke('dialog:open-file-selector')
})

contextBridge.exposeInMainWorld('darkMode', {
    toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
    system: () => ipcRenderer.invoke('dark-mode:system')
})
const { contextBridge, ipcRenderer, webFrame } = require('electron');

function sendSilentPrint() {
  console.log('[ARTECH Electron Preload] Sending silent-print IPC to main process');
  ipcRenderer.send('silent-print');
}

// 1. Expose a secure print trigger to the renderer context
contextBridge.exposeInMainWorld('electronAPI', {
  silentPrint: sendSilentPrint,
  isElectron: true,
  platform: process.platform,
});

// 2. Override window.print in the webpage's main world context
webFrame.executeJavaScript(`
  (function() {
    window.print = function() {
      console.log('[ARTECH Electron] Intercepted window.print() -> Routing to silent background printer');
      if (window.electronAPI && typeof window.electronAPI.silentPrint === 'function') {
        window.electronAPI.silentPrint();
      } else {
        console.warn('[ARTECH Electron] electronAPI.silentPrint not available, fallback required');
      }
    };
    console.log('[ARTECH Electron] Silent print override active on window.print()');
  })();
`);

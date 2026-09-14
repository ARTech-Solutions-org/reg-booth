const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Chromium flags to suppress native print preview dialog and enable background kiosk printing
app.commandLine.appendSwitch('disable-print-preview');
app.commandLine.appendSwitch('kiosk-printing');

// Load custom config from station-config.json next to .exe if exists
let userConfig = {};
const configPath = path.join(path.dirname(process.execPath), 'station-config.json');
if (fs.existsSync(configPath)) {
  try {
    userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('[ARTECH Electron] Failed to read station-config.json:', err);
  }
}

const CONFIG = {
  url: userConfig.url || 'http://localhost:8080/kiosk',
  fallbackUrl: 'http://localhost:5000/kiosk',
  fullscreen: userConfig.fullscreen !== false,
  frame: false,
  kiosk: userConfig.kiosk !== false,
  autoHideMenuBar: true,
  printerDeviceName: userConfig.printerDeviceName || '',
};

const preloadPath = path.join(__dirname, 'preload.js');
let mainWindow = null;
let ipcRegistered = false;
let serverProcess = null;

// Suppress or restore the Windows taskbar during kiosk execution
function setTaskbarVisible(visible) {
  if (process.platform !== 'win32') return;
  const show = visible ? '5' : '0';
  spawn('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy', 'Bypass',
    '-WindowStyle', 'Hidden',
    '-Command',
    `if (-not ('Win.Tray' -as [type])) { Add-Type -Name Tray -Namespace Win -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr FindWindow(string c, string n); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);' }; $n=${show}; [Win.Tray]::ShowWindow([Win.Tray]::FindWindow('Shell_TrayWnd', $null), $n) | Out-Null; [Win.Tray]::ShowWindow([Win.Tray]::FindWindow('Shell_SecondaryTrayWnd', $null), $n) | Out-Null;`
  ], { windowsHide: true, stdio: 'ignore' });
}

function logToRenderer(win, message, level = 'log') {
  console[level](message);
  if (!win || win.isDestroyed()) return;
  const payload = JSON.stringify(String(message));
  const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  win.webContents.executeJavaScript(`console.${method}(${payload})`).catch(() => {});
}

function printOnce(contents, options) {
  return new Promise((resolve) => {
    try {
      contents.print(options, (success, failureReason) => {
        resolve({ success: !!success, failureReason: failureReason || '' });
      });
    } catch (err) {
      resolve({ success: false, failureReason: err && err.message ? err.message : String(err) });
    }
  });
}

async function resolvePrinterName(win) {
  try {
    const printers = await win.webContents.getPrintersAsync();
    logToRenderer(win, `[ARTECH Electron] Detected printers: ${printers.map(p => `"${p.name}"${p.isDefault ? ' [DEFAULT]' : ''}`).join(', ') || '(none)'}`);

    if (CONFIG.printerDeviceName) {
      const match = printers.find(p => p.name.toLowerCase().includes(CONFIG.printerDeviceName.toLowerCase()));
      if (match) return match.name;
    }

    // Auto-detect Zebra, Brother, TSC, or thermal badge printer if present
    const thermal = printers.find(p => {
      const n = p.name.toLowerCase();
      return n.includes('thermal') || n.includes('badge') || n.includes('zebra') || n.includes('brother') || n.includes('label');
    });
    if (thermal) {
      logToRenderer(win, `[ARTECH Electron] Selected badge printer: "${thermal.name}"`);
      return thermal.name;
    }

    const defaultPrinter = printers.find(p => p.isDefault);
    if (defaultPrinter) {
      logToRenderer(win, `[ARTECH Electron] Using default printer: "${defaultPrinter.name}"`);
      return defaultPrinter.name;
    }

    if (printers.length > 0) return printers[0].name;
  } catch (err) {
    logToRenderer(win, `[ARTECH Electron] Error listing printers: ${err.message}`, 'error');
  }
  return CONFIG.printerDeviceName || '';
}

async function executeSilentPrint(win) {
  if (!win || win.isDestroyed()) return;
  logToRenderer(win, '[ARTECH Electron] Silent print request received');

  const deviceName = await resolvePrinterName(win);
  logToRenderer(win, `[ARTECH Electron] Target printer: "${deviceName || 'System Default'}"`);

  const options = {
    silent: true,
    printBackground: true,
    deviceName: deviceName || undefined,
    margins: { marginType: 'none' },
  };

  const result = await printOnce(win.webContents, options);
  if (!result.success) {
    logToRenderer(win, `[ARTECH Electron] Silent print failed: ${result.failureReason}`, 'error');
  } else {
    logToRenderer(win, '[ARTECH Electron] Silent print job dispatched successfully!');
  }
}

function registerIpc() {
  if (ipcRegistered) return;
  ipcRegistered = true;
  ipcMain.on('silent-print', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    executeSilentPrint(win).catch((err) => {
      logToRenderer(win, `[ARTECH Electron] Print crash: ${err?.message || err}`, 'error');
    });
  });
}

function checkUrlAvailable(targetUrl) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const req = http.request({
        host: parsed.hostname,
        port: parsed.port || 80,
        path: parsed.pathname,
        method: 'HEAD',
        timeout: 1000,
      }, (res) => {
        resolve(res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

async function startServerIfNeeded() {
  // Check if server is already running on 8080
  const isAvailable = await checkUrlAvailable('http://localhost:8080/api/healthz');
  if (isAvailable) {
    console.log('[ARTECH Electron] Local event server is already active on port 8080.');
    return;
  }

  // Look for bundled server at build/server/index.js or relative to app
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'build', 'server', 'index.js'),
    path.join(__dirname, 'server', 'index.js'),
    path.join(path.dirname(process.execPath), 'resources', 'server', 'index.js'),
  ];

  for (const sp of possiblePaths) {
    if (fs.existsSync(sp)) {
      console.log(`[ARTECH Electron] Launching internal server from: ${sp}`);
      serverProcess = spawn(process.execPath, [sp], {
        stdio: 'inherit',
        env: { ...process.env, PORT: '8080', NODE_ENV: 'production' },
      });
      await new Promise(r => setTimeout(r, 1200));
      break;
    }
  }
}

async function createWindow() {
  registerIpc();
  await startServerIfNeeded();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: CONFIG.fullscreen,
    frame: CONFIG.frame,
    kiosk: CONFIG.kiosk,
    autoHideMenuBar: CONFIG.autoHideMenuBar,
    backgroundColor: '#08090C',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Ctrl+P test print
    if (input.control && input.key.toLowerCase() === 'p') {
      event.preventDefault();
      executeSilentPrint(mainWindow).catch((err) => {
        logToRenderer(mainWindow, `[ARTECH Electron] Error: ${err.message}`, 'error');
      });
    }

    // Escape key toggles kiosk mode so organizers can access desktop if needed
    if (input.key === 'Escape') {
      const nextKiosk = !mainWindow.isKiosk();
      mainWindow.setKiosk(nextKiosk);
      if (nextKiosk) {
        setTaskbarVisible(false);
      } else {
        setTaskbarVisible(true);
        mainWindow.setFullScreen(false);
      }
    }

    // F12 DevTools
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }

    // Ctrl+R / F5 Reload
    if ((input.control && input.key.toLowerCase() === 'r') || input.key === 'F5') {
      mainWindow.reload();
    }
  });

  // Check if primary URL or fallback responds
  let loadUrl = CONFIG.url;
  const primaryOk = await checkUrlAvailable(CONFIG.url);
  if (!primaryOk) {
    const fallbackOk = await checkUrlAvailable(CONFIG.fallbackUrl);
    if (fallbackOk) {
      loadUrl = CONFIG.fallbackUrl;
    }
  }

  logToRenderer(mainWindow, `[ARTECH Electron] Connecting to: ${loadUrl}`);
  mainWindow.loadURL(loadUrl);
  mainWindow.setMenuBarVisibility(false);
  setTaskbarVisible(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  setTaskbarVisible(true);
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

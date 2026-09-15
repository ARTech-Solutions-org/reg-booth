import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_PRINT_CONFIG, type PrintConfig } from '../../shared/types.js';

const router = Router();

function getStationConfigPath(): string {
  const exeDir = process.execPath ? path.dirname(process.execPath) : process.cwd();
  const candidates = [
    path.join(exeDir, 'station-config.json'),
    path.resolve(process.cwd(), 'station-config.json'),
    path.resolve(process.cwd(), 'release', 'ARTECH-Station-win32-x64', 'station-config.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  // Default to exeDir or cwd
  return path.join(exeDir, 'station-config.json');
}

export function readStationConfigFile(): any {
  const filePath = getStationConfigPath();
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      console.error('[Station Config] Failed to parse station-config.json:', err);
    }
  }
  return {
    url: 'http://localhost:8080/kiosk',
    kiosk: true,
    fullscreen: true,
    printerDeviceName: '',
    printConfig: DEFAULT_PRINT_CONFIG,
  };
}

export function writeStationConfigFile(newConfig: any): void {
  const filePath = getStationConfigPath();
  const existing = readStationConfigFile();
  const merged = {
    ...existing,
    ...newConfig,
    printConfig: {
      ...DEFAULT_PRINT_CONFIG,
      ...(existing.printConfig || {}),
      ...(newConfig.printConfig || {}),
    },
    // Keep top-level printerDeviceName synchronized with printConfig.printerDeviceName
    printerDeviceName:
      newConfig.printConfig?.printerDeviceName !== undefined
        ? newConfig.printConfig.printerDeviceName
        : newConfig.printerDeviceName || existing.printerDeviceName || '',
  };
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
}

// GET /api/station-config
router.get('/station-config', (_req, res) => {
  try {
    const config = readStationConfigFile();
    if (!config.printConfig) {
      config.printConfig = { ...DEFAULT_PRINT_CONFIG, printerDeviceName: config.printerDeviceName || '' };
    }
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to read station config' });
  }
});

// POST /api/station-config
router.post('/station-config', (req, res) => {
  try {
    const incoming = req.body;
    writeStationConfigFile(incoming);
    const updated = readStationConfigFile();
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save station config' });
  }
});

export default router;

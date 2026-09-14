import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const templateDir = 'G:\\Downloads\\Talabat-Mart-Booth-win32-x64\\Talabat-Mart-Booth-win32-x64';
const outputDir = path.join(rootDir, 'release', 'ARTECH-Station-win32-x64');

console.log('====================================================');
console.log('  ARTECH Station Desktop EXE Builder (win32-x64)    ');
console.log('====================================================');

// 1. Build Client and Standalone Server bundles
console.log('\n[1/4] Building production web bundles & standalone server...');
execSync('npm run build:client', { cwd: rootDir, stdio: 'inherit' });

const esbuildBin = path.join(rootDir, 'node_modules', 'esbuild', 'bin', 'esbuild');
execSync(`node "${esbuildBin}" src/server/index.ts --platform=node --bundle --format=cjs --outfile=build/server/server.cjs --external:pg-native`, {
  cwd: rootDir,
  stdio: 'inherit'
});

// 2. Prepare Output Directory
console.log(`\n[2/4] Initializing output directory: ${outputDir}`);
if (!fs.existsSync(templateDir)) {
  console.error(`[Error] Reference Electron directory not found: ${templateDir}`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

// Copy base Electron runtime binaries from reference template
console.log('Copying Electron runtime binaries...');
const templateFiles = fs.readdirSync(templateDir);
for (const file of templateFiles) {
  if (file === 'resources' || file.endsWith('.py') || file.endsWith('.js') || file === 'app-extracted') continue;
  const src = path.join(templateDir, file);
  let destFileName = file;
  if (file === 'Talabat-Mart-Booth.exe') {
    destFileName = 'ARTECH-Station.exe';
  }
  const dest = path.join(outputDir, destFileName);
  if (fs.statSync(src).isDirectory()) {
    fs.cpSync(src, dest, { recursive: true });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 3. Assemble resources/app
console.log('\n[3/4] Assembling resources/app bundle...');
const resourcesDir = path.join(outputDir, 'resources');
fs.mkdirSync(resourcesDir, { recursive: true });

// Remove any old asar in target
const oldAsar = path.join(resourcesDir, 'app.asar');
if (fs.existsSync(oldAsar)) fs.unlinkSync(oldAsar);

const appDir = path.join(resourcesDir, 'app');
fs.mkdirSync(appDir, { recursive: true });

// Copy electron main & preload
fs.copyFileSync(path.join(rootDir, 'electron', 'main.cjs'), path.join(appDir, 'main.js'));
fs.copyFileSync(path.join(rootDir, 'electron', 'preload.cjs'), path.join(appDir, 'preload.js'));
fs.copyFileSync(path.join(rootDir, 'electron', 'package.json'), path.join(appDir, 'package.json'));

// Copy client dist
const distTarget = path.join(appDir, 'dist');
fs.cpSync(path.join(rootDir, 'dist'), distTarget, { recursive: true });

// Copy standalone server bundle
const serverTargetDir = path.join(appDir, 'server');
fs.mkdirSync(serverTargetDir, { recursive: true });
fs.copyFileSync(
  path.join(rootDir, 'build', 'server', 'server.cjs'),
  path.join(serverTargetDir, 'server.cjs')
);

// Copy .env for database credentials
const rootEnv = path.join(rootDir, '.env');
if (fs.existsSync(rootEnv)) {
  fs.copyFileSync(rootEnv, path.join(appDir, '.env'));
  fs.copyFileSync(rootEnv, path.join(outputDir, '.env'));
  console.log('Copied .env configuration to app package.');
}

// Pack resources/app into resources/app.asar
console.log('Packaging resources/app into resources/app.asar...');
const asarTarget = path.join(resourcesDir, 'app.asar');
execSync(`npx @electron/asar pack "${appDir}" "${asarTarget}"`, {
  cwd: rootDir,
  stdio: 'inherit'
});
console.log('Packed app.asar successfully.');

// 4. Create Station Config next to the .exe
console.log('\n[4/4] Generating station-config.json...');
const configContent = {
  url: 'http://localhost:8080/kiosk',
  kiosk: true,
  fullscreen: true,
  printerDeviceName: '',
  notes: 'Set printerDeviceName to your thermal badge printer name (e.g. Zebra, Brother, Epson) or leave empty for auto-detection. Set kiosk: false to run in a window during setup.'
};

fs.writeFileSync(
  path.join(outputDir, 'station-config.json'),
  JSON.stringify(configContent, null, 2),
  'utf8'
);

console.log('\n====================================================');
console.log(' BUILD SUCCESSFUL!');
console.log(` Executable Ready at:`);
console.log(`   ${path.join(outputDir, 'ARTECH-Station.exe')}`);
console.log('====================================================\n');

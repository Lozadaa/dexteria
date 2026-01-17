import { app, BrowserWindow, ipcMain, Menu, globalShortcut } from 'electron';
import * as path from 'path';
import { initializeIpcHandlers } from './ipc/handlers';
import { initBadgeClearing } from './services/NotificationService';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
// This is only needed for Squirrel.Windows installers
try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch {
  // electron-squirrel-startup not installed, skip
}

// Use app.isPackaged as the source of truth for production detection
const isDev = !app.isPackaged;

// Get project root - in dev it's the current working directory
const projectRoot = isDev ? process.cwd() : path.dirname(app.getPath('exe'));

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const isMac = process.platform === 'darwin';

  // Get icon path - in dev it's in assets folder, in prod it's in resources
  const iconPath = isDev
    ? path.join(process.cwd(), 'assets', 'logoicon.png')
    : path.join(process.resourcesPath, 'assets', 'logoicon.ico');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Dexteria',
    icon: iconPath,
    resizable: true,
    // Frameless window - custom titlebar (disabled temporarily for debugging)
    frame: true,
    // Only use transparency on macOS
    transparent: isMac,
    // Background color - dark for dark mode, matches app
    backgroundColor: '#0a0f1a',
    // macOS specific
    ...(isMac && {
      titleBarStyle: 'hiddenInset',
      vibrancy: 'under-window',
      visualEffectState: 'active',
    }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Need to disable sandbox for file system access
    },
    show: true,
  });

  // Remove the menu bar
  Menu.setApplicationMenu(null);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Debug listeners for load failures
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    console.error('[did-fail-load]', { code, desc, url, isMainFrame });
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[did-finish-load]', mainWindow?.webContents.getURL());
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files from asar
    const indexPath = path.join(__dirname, '../renderer/index.html');
    console.log('[main] Loading index from:', indexPath);
    console.log('[main] __dirname:', __dirname);
    console.log('[main] app.isPackaged:', app.isPackaged);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Send window state changes to renderer
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', false);
  });

  // Initialize badge clearing on window focus/show
  initBadgeClearing(mainWindow);
}

// App lifecycle
app.whenReady().then(async () => {
  // Initialize IPC handlers without project (will show welcome screen)
  await initializeIpcHandlers();

  createWindow();

  // Register F12 to toggle DevTools
  const f12Registered = globalShortcut.register('F12', () => {
    console.log('F12 pressed - toggling DevTools');
    mainWindow?.webContents.toggleDevTools();
  });
  console.log('F12 shortcut registered:', f12Registered);

  // Also Ctrl+Shift+I
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    mainWindow?.webContents.toggleDevTools();
  });

  // Ctrl+O to open project
  globalShortcut.register('CommandOrControl+O', () => {
    mainWindow?.webContents.send('shortcut:open-project');
  });

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();

  // On macOS, apps typically stay active until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Basic app IPC handlers
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getName', () => {
  return app.getName();
});

ipcMain.handle('app:getProjectRoot', () => {
  return projectRoot;
});

// Window control handlers
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

ipcMain.handle('window:openDevTools', () => {
  mainWindow?.webContents.openDevTools();
});

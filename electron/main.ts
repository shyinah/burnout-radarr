import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GlobalInputTracker } from './tracker.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const preloadPath = path.resolve(__dirname, 'preload.js')

// Global tracker instance (runs in main process, does not block renderer)
const tracker = new GlobalInputTracker({
  idleThresholdMs: 15000,
  emitIntervalMs: 1000,
})

let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: 'Burnout Radarr',
  })

  // Broadcast real-time activity metrics to renderer
  tracker.on('update', (metrics) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('activity:update', metrics)
    }
  })

  // Start background tracking automatically
  tracker.start()

  // Load URL depending on environment
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
  if (!app.isPackaged && process.env.NODE_ENV !== 'production') {
    mainWindow.loadURL(devServerUrl)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

// IPC Handlers for activity tracker
ipcMain.handle('activity:get-metrics', () => {
  return tracker.getMetrics()
})

ipcMain.handle('activity:start', () => {
  return tracker.start()
})

ipcMain.handle('activity:stop', () => {
  return tracker.stop()
})

ipcMain.handle('activity:reset', () => {
  tracker.reset()
})

// Electron app lifecycle
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('will-quit', () => {
  tracker.stop()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    tracker.stop()
    app.quit()
  }
})

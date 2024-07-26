const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fetch = require('node-fetch');

let mainWindow;
let loadingWindow;

function createWindow() {
  // Get the primary display's dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Calculate window dimensions
  const windowWidth = 800; // Static width
  const windowHeight = Math.floor(screenHeight * 0.7); // 70% of screen height

  // Create the loading window
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  loadingWindow.loadFile('loading.html');

  // Create the main window
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    show: false,  // Do not show until ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');

  // Once the main window is ready to show, close the loading window and show the main window
  mainWindow.once('ready-to-show', () => {
    loadingWindow.close();
    mainWindow.show();
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('fetch-shows', async (event, date) => {
  try {
    const response = await fetch('https://www.comedycellar.com/reservations/api/getShows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ date: date })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.data.showInfo.shows;
  } catch (error) {
    console.error('Error fetching shows:', error);
    throw error;
  }
});

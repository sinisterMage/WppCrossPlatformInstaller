const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const child_process = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
  });

  win.loadFile('src/index.html');
}

app.whenReady().then(() => {
  createWindow();
});

// 📁 Folder picker dialog
ipcMain.handle('select-install-path', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Installation Folder',
    properties: ['openDirectory', 'createDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

// 🧱 Installation handler
ipcMain.handle('install-wpp', async (event, customPath) => {
  try {
    const platform = os.platform();
    let binaryName;

    switch (platform) {
      case 'win32':
        binaryName = 'ingot.exe';
        break;
      case 'darwin':
        binaryName = 'ingot';
        break;
      case 'linux':
        binaryName = 'ingot-linux-x64';
        break;
      default:
        throw new Error('Unsupported platform');
    }

    const sourcePath = path.join(__dirname, 'public', binaryName);

    const destDir = customPath || (
      platform === 'win32'
        ? path.join(process.env.APPDATA, 'WPlusPlus')
        : path.join(os.homedir(), '.wplusplus')
    );

    const destPath = path.join(destDir, platform === 'win32' ? 'wpp.exe' : 'wpp');

    fs.mkdirSync(destDir, { recursive: true });

    for (let i = 1; i <= 100; i++) {
      event.sender.send('progress-update', i);
      await new Promise((r) => setTimeout(r, 15));
    }

    fs.copyFileSync(sourcePath, destPath);
    fs.chmodSync(destPath, 0o755);

    event.sender.send('install-complete', { success: true });
  } catch (err) {
    event.sender.send('install-complete', {
      success: false,
      error: err.message,
    });
  }
});

// ➕ Add install path to PATH (user-level on Windows)
ipcMain.handle('add-to-path', async (event, installPath) => {
  try {
    const platform = os.platform();
    const expandedPath = installPath.replace(/^~($|\/)/, `${os.homedir()}/`);
    const exportLine = `export PATH="$PATH:${expandedPath}"`;

    if (platform === 'win32') {
      const currentPath = process.env.PATH;
      if (!currentPath.includes(expandedPath)) {
        // Add to user-level PATH using setx
        child_process.execSync(`setx PATH "${currentPath};${expandedPath}"`);
      }

    } else if (platform === 'darwin') {
      const zshrc = path.join(os.homedir(), '.zshrc');
      if (fs.existsSync(zshrc)) {
        const contents = fs.readFileSync(zshrc, 'utf8');
        if (!contents.includes(exportLine)) {
          fs.appendFileSync(zshrc, `\n# Added by W++ installer\n${exportLine}\n`);
        }
      } else {
        fs.writeFileSync(zshrc, `# Created by W++ installer\n${exportLine}\n`);
      }

    } else if (platform === 'linux') {
      const profiles = ['.bashrc', '.profile'];
      let updated = false;
      for (const file of profiles) {
        const fullPath = path.join(os.homedir(), file);
        if (fs.existsSync(fullPath)) {
          const contents = fs.readFileSync(fullPath, 'utf8');
          if (!contents.includes(exportLine)) {
            fs.appendFileSync(fullPath, `\n# Added by W++ installer\n${exportLine}\n`);
            updated = true;
            break;
          }
        }
      }

      if (!updated) {
        // fallback: write to .bashrc
        fs.writeFileSync(path.join(os.homedir(), '.bashrc'), `# Created by W++ installer\n${exportLine}\n`);
      }
    }

    return { success: true };

  } catch (err) {
    return { success: false, error: err.message };
  }
});

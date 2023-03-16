// main.js
const { execFile } = require('node:child_process');
const { app, BrowserWindow, dialog, ipcMain, Notification, nativeTheme, shell, Tray, Menu } = require('electron')
const ProgressBar = require('electron-progressbar');
const pngquant = require('pngquant-bin')
const path = require('path')
const fs = require("fs");

const iconPath = path.join(__dirname, 'raw-icon.png')

let mainWindow;
let tray;

if (process.platform === 'win32')
{
    app.setAppUserModelId(app.name);
}

//function to handle the opening of a file selector dialog
const openFileSelector = async () => {
    let options = {
        title : "Choose pictures",
        defaultPath : process.env.userprofile + "\\Pictures",
        filters :[
            {name: 'Png Files', extensions: ['png']},
            {name: 'All Files', extensions: ['*']}
        ],
        properties: ['openFile','multiSelections']
    }
    const { canceled, filePaths } = await dialog.showOpenDialog(options)
    if (canceled) {
        return
    } else {
        return filePaths
    }
}

// function to openFileSelector then compress selected files and output them in a folder named output
const compress = async () => {
    // check if ouput directory exists and create it if not
    if (!fs.existsSync(path.join(app.getPath("temp"), 'compressed-files'))) {
        fs.mkdirSync(path.join(app.getPath("temp"), 'compressed-files'));
    }

    const files = await openFileSelector()
    // get only the file name from the path
    const fileNames = files.map(file => file.split('\\').pop())

    const numberOfFiles = files.length
    let numberOfFilesDone = 0

    let progressBar = new ProgressBar({
        indeterminate: false,
        text: 'Preparing data...',
        detail: 'Wait...',
        maxValue: numberOfFiles,
    });

    progressBar
        .on('completed', function() {
            console.info(`completed...`);
            progressBar.detail = 'Task completed. Exiting...';
        })
        .on('aborted', function(value) {
            console.info(`aborted... ${value}`);
        })
        .on('progress', function(value) {
            progressBar.detail = `Value ${value} out of ${progressBar.getOptions().maxValue}...`;
        });

    for(let i = 0; i < numberOfFiles; i++) {
        execFile(pngquant, ['--force', '-o', path.join(app.getPath("temp"), 'compressed-files', fileNames[i]), files[i]], async (error) => {
            console.log("pngquant error :", error)
            console.log('Image minified!');
            numberOfFilesDone++
            progressBar.value = numberOfFilesDone
            if (numberOfFilesDone === numberOfFiles) {
                console.log("all images optimized")
                new Notification({ title: "OPTIMIZATION", body: "Your pictures have been optimized" }).show()
                await shell.openPath(path.join(app.getPath("temp"), 'compressed-files'))
            }
        });
    }
    return fileNames.map(fileName => path.join(app.getPath("temp"), 'compressed-files', fileName))
}

const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    mainWindow.maximize()
    mainWindow.setTitle("Image Optimizer")
    mainWindow.loadFile('index.html')
    // open dev tools
    // mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {

    tray = new Tray(iconPath)
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Quit App', type: 'normal', click: () => app.quit() },
        { label: 'Open Interface', type: 'normal', click: () => {if (BrowserWindow.getAllWindows().length === 0) createWindow()} },
        { label: 'choose picture', type: 'normal', click: () => compress()}
    ])
    tray.setToolTip('Compressor App.')
    tray.setContextMenu(contextMenu)

    // handle ipcMain event to open file selector
    ipcMain.handle('dialog:open-file-selector', compress)
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    ipcMain.handle('dark-mode:toggle', () => {
        if (nativeTheme.shouldUseDarkColors) {
            nativeTheme.themeSource = 'light'
        } else {
            nativeTheme.themeSource = 'dark'
        }
        return nativeTheme.shouldUseDarkColors
    })

    ipcMain.handle('dark-mode:system', () => {
        nativeTheme.themeSource = 'system'
    })
})

app.on('window-all-closed', () => {
    return
})
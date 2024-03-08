const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const ffmpeg = require("fluent-ffmpeg");
const ProgressBar = require("electron-progressbar");
const path = require("path");
const fs = require("fs");

const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffprobePath = require("@ffprobe-installer/ffprobe").path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 605,
    webPreferences: {
      // Disable Node integration and enable context isolation
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("index.html");
  setupMenu();
}

function setupMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Open Video",
          click: () => openVideoDialog(),
        },
        { type: "separator" },
        {
          label: "Convert to",
          submenu: [
            {
              label: "MP4",
              click: () => convertCurrentVideo("mp4"),
            },
            {
              label: "FLV",
              click: () => convertCurrentVideo("flv"),
            },
          ],
        },
      ],
    },
    {
      label: "Developer",
      submenu: [
        {
          label: "Toggle Developer Tools",
          accelerator:
            process.platform === "darwin" ? "Cmd+Option+I" : "Ctrl+Shift+I",
          click: () => {
            mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    },
  ];
  // @4
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

let currentVideoPath = "";
// @5
function openVideoDialog() {
  dialog
    .showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "All Files", extensions: ["*"] }],
    })
    .then((result) => {
      if (!result.canceled && result.filePaths.length > 0) {
        currentVideoPath = result.filePaths[0];
        mainWindow.webContents.send("video-selected", currentVideoPath);
      }
    })
    .catch((err) => {
      console.log("File selection error:", err);
    });
}

// @5
function convertCurrentVideo(targetFormat) {
  if (!currentVideoPath) {
    dialog.showErrorBox("Error", "Please select a video file first.");
    return;
  }

  const outputDir = path.dirname(currentVideoPath);
  const outputFileName = `${path.basename(
    currentVideoPath,
    path.extname(currentVideoPath)
  )}.${targetFormat}`;
  const outputPath = path.join(outputDir, outputFileName);

  const conversionProgress = new ProgressBar({
    indeterminate: false,
    text: "Converting video...",
    detail: "Please wait...",
    browserWindow: {
      parent: mainWindow,
      modal: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    },
  });

  ffmpeg(currentVideoPath)
    .output(outputPath)
    .on("progress", (progress) => {
      conversionProgress.value = progress.percent;
    })
    .on("end", () => {
      conversionProgress.setCompleted();
      dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "Conversion Complete",
        message: `Video has been converted to ${targetFormat.toUpperCase()} format.`,
      });
    })
    .on("error", (err) => {
      console.error("Conversion error:", err);
      conversionProgress.close();
      dialog.showErrorBox("Conversion Error", "Failed to convert video.");
    })
    .run();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC listener to handle loading video in the main process
ipcMain.on("load-video", (event, filePath) => {
  // Log selected video file path
  console.log("Selected video file path:", filePath);
});

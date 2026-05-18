import { app, BrowserWindow, dialog } from "electron";
import { fork, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import { initDatabase } from "./db-init";
import { setupIpcHandlers } from "./ipc-handlers";
import { autoUpdater } from "electron-updater";

let nextServer: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;
const PORT = 3456;

function getAppDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app");
  }
  return path.join(__dirname, "..");
}

function loadProxyConfig(userDataPath: string): Record<string, string> {
  const configPath = path.join(userDataPath, "config.json");
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const proxy = config.proxy || {};
      const env: Record<string, string> = {};
      if (proxy.http) env.HTTP_PROXY = proxy.http;
      if (proxy.https) env.HTTPS_PROXY = proxy.https;
      return env;
    }
  } catch {}
  return {};
}

async function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const appDir = getAppDir();
    const serverEntry = path.join(appDir, "standalone", "server.js");
    const userDataPath = app.getPath("userData");
    const dbPath = path.join(userDataPath, "zhiliu.db");
    const uploadDir = path.join(userDataPath, "uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const env: NodeJS.ProcessEnv = {
      NODE_ENV: "production",
      PORT: String(PORT),
      DATABASE_URL: `file:${dbPath}`,
      AUTH_URL: `http://localhost:${PORT}`,
      AUTH_SECRET: "zhiliu-desktop-v1-secret-key",
      UPLOAD_DIR: uploadDir,
      NEXT_TELEMETRY_DISABLED: "1",
      ...loadProxyConfig(userDataPath),
    };

    nextServer = fork(serverEntry, [], {
      cwd: appDir,
      env,
      silent: true,
    });

    let started = false;

    nextServer.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      console.log("[Next.js]", text.trim());
      if (!started && (text.includes("localhost") || text.includes("Ready"))) {
        started = true;
        resolve();
      }
    });

    nextServer.stderr?.on("data", (data: Buffer) => {
      console.error("[Next.js Error]", data.toString().trim());
    });

    nextServer.on("error", (err) => {
      console.error("Failed to start Next.js server:", err);
      reject(err);
    });

    nextServer.on("exit", (code) => {
      console.log(`Next.js exited with code ${code}`);
      nextServer = null;
    });

    setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 15000);
  });
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hidden",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);
}

app.whenReady().then(async () => {
  setupIpcHandlers();

  try {
    await initDatabase(app.getPath("userData"), getAppDir());
    await startNextServer();
    await createWindow();

    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  } catch (err) {
    console.error("App initialization failed:", err);
    dialog.showErrorBox(
      "启动失败",
      `应用初始化失败：${err}\n请尝试重新安装。`
    );
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (nextServer) {
    try {
      nextServer.kill("SIGTERM");
    } catch {}
    nextServer = null;
  }
});

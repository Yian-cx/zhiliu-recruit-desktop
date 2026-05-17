import { ipcMain, dialog, app, BrowserWindow } from "electron";
import path from "path";
import fs from "fs";
import { autoUpdater } from "electron-updater";

export function setupIpcHandlers(): void {
  const userDataPath = app.getPath("userData");
  const configPath = path.join(userDataPath, "config.json");
  const dbPath = path.join(userDataPath, "zhiliu.db");

  ipcMain.handle("get-app-version", (): string => app.getVersion());

  ipcMain.handle("select-file", async (_event, filters) => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: filters || [{ name: "All Files", extensions: ["*"] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("get-upload-path", (): string => {
    const uploadDir = path.join(userDataPath, "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    return uploadDir;
  });

  ipcMain.handle("get-proxy-config", (): {
    http?: string;
    https?: string;
  } => {
    try {
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, "utf-8")).proxy || {};
      }
    } catch {}
    return {};
  });

  ipcMain.handle("set-proxy-config", async (_event, config) => {
    let existing: Record<string, unknown> = {};
    try {
      if (fs.existsSync(configPath)) {
        existing = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      }
    } catch {}
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        { ...existing, proxy: config, updatedAt: new Date().toISOString() },
        null,
        2
      )
    );
    const result = await dialog.showMessageBox({
      type: "info",
      title: "代理设置",
      message: "代理设置已更改",
      detail: "更改将在应用重启后生效。是否立即重启？",
      buttons: ["稍后重启", "立即重启"],
    });
    if (result.response === 1) {
      app.relaunch();
      app.exit(0);
    }
    return { success: true };
  });

  ipcMain.handle("backup-database", async (): Promise<string | null> => {
    if (!fs.existsSync(dbPath)) return null;
    const result = await dialog.showSaveDialog({
      defaultPath: `zhiliu-backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
    });
    if (result.canceled || !result.filePath) return null;
    fs.copyFileSync(dbPath, result.filePath);
    return result.filePath;
  });

  ipcMain.handle("export-database", async (): Promise<boolean> => {
    const result = await dialog.showSaveDialog({
      defaultPath: `zhiliu-data-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
    });
    if (result.canceled || !result.filePath) return false;
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, result.filePath);
    }
    return true;
  });

  ipcMain.handle("import-database", async (): Promise<boolean> => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
    });
    if (result.canceled || result.filePaths.length === 0) return false;
    const { response } = await dialog.showMessageBox({
      type: "warning",
      title: "导入数据库",
      message: "导入数据库将覆盖当前所有数据",
      detail: "此操作不可撤销。当前数据将在导入后丢失。是否继续？",
      buttons: ["取消", "确认导入"],
    });
    if (response !== 1) return false;
    fs.copyFileSync(result.filePaths[0], dbPath);
    app.relaunch();
    app.exit(0);
    return true;
  });

  ipcMain.handle("check-for-updates", async (): Promise<void> => {
    autoUpdater.checkForUpdates();
  });

  ipcMain.on("window-minimize", () =>
    BrowserWindow.getFocusedWindow()?.minimize()
  );
  ipcMain.on("window-maximize", () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win?.isMaximized()) win.unmaximize();
    else win?.maximize();
  });
  ipcMain.on("window-close", () => BrowserWindow.getFocusedWindow()?.close());

  autoUpdater.on("update-available", (info) => {
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send("update-available", info)
    );
  });
  autoUpdater.on("update-downloaded", (info) => {
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send("update-downloaded", info)
    );
  });
}

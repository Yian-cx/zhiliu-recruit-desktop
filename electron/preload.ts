import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke("get-app-version"),
  getPlatform: (): string => process.platform,

  selectFile: (
    filters?: { name: string; extensions: string[] }[]
  ): Promise<string | null> => ipcRenderer.invoke("select-file", filters),
  getUploadPath: (): Promise<string> => ipcRenderer.invoke("get-upload-path"),

  getProxyConfig: (): Promise<{ http?: string; https?: string }> =>
    ipcRenderer.invoke("get-proxy-config"),
  setProxyConfig: (config: {
    http?: string;
    https?: string;
  }): Promise<{ success: boolean }> =>
    ipcRenderer.invoke("set-proxy-config", config),

  backupDatabase: (): Promise<string | null> =>
    ipcRenderer.invoke("backup-database"),
  exportDatabase: (): Promise<boolean> => ipcRenderer.invoke("export-database"),
  importDatabase: (): Promise<boolean> => ipcRenderer.invoke("import-database"),

  checkForUpdates: (): Promise<void> =>
    ipcRenderer.invoke("check-for-updates"),
  onUpdateAvailable: (callback: (info: unknown) => void): void => {
    ipcRenderer.on("update-available", (_event, info) => callback(info));
  },
  onUpdateDownloaded: (callback: (info: unknown) => void): void => {
    ipcRenderer.on("update-downloaded", (_event, info) => callback(info));
  },

  minimizeWindow: (): void => ipcRenderer.send("window-minimize"),
  maximizeWindow: (): void => ipcRenderer.send("window-maximize"),
  closeWindow: (): void => ipcRenderer.send("window-close"),
});

export interface ElectronConfig {
  apiUrl: string;
  rendererUrl: string;
  platform: string;
  isElectron: boolean;
}

export interface ElectronSessionInfo {
  isActive: boolean;
  projectId: number | null;
  startTime: string | null;
}

export interface ElectronSessionTick {
  projectId: number | null;
  startTime: string;
  currentTime: string;
}

export interface ElectronLaunchResult {
  ok: boolean;
  error?: string;
  canceled?: boolean;
  launchId?: string;
}

export interface OfflineSessionItem {
  clientId: string;
  projectId: number;
  startTime: string;
  endTime?: string | null;
  meta?: Record<string, unknown>;
}

export interface ElectronAppExited {
  launchId: string;
  code: number | null;
  signal: string | null;
}

export interface ElectronImportDone {
  appId: number;
  ok: boolean;
  file: string;
  projectId?: number;
  media?: unknown;
  error?: string;
}

export interface ElectronWatchConfig {
  appId: number;
  folder: string;
  projectId: number;
  extensions?: string[];
}

export interface ElectronWatchResult {
  ok: boolean;
  error?: string;
}

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  apiUrl: string;
  getConfig(): Promise<ElectronConfig>;
  launchApp(appPath: string, args?: string[], launchId?: string): Promise<ElectronLaunchResult>;
  pickAppPath(): Promise<string | null>;
  pickFolder(): Promise<string | null>;
  onAppExited(callback: (data: ElectronAppExited) => void): void;
  offAppExited(): void;
  setApiContext(ctx: { apiUrl?: string; token?: string | null }): Promise<{ ok: boolean }>;
  watchFolder(config: ElectronWatchConfig): Promise<ElectronWatchResult>;
  unwatchFolder(appId: number): Promise<ElectronWatchResult>;
  listWatchers(): Promise<Array<{ appId: number; folder: string; projectId: number }>>;
  onImportDone(callback: (data: ElectronImportDone) => void): void;
  offImportDone(): void;
  startSession(projectId: number): Promise<{ ok: boolean; startTime?: string; error?: string }>;
  stopSession(): Promise<{ ok: boolean; startTime?: string; endTime?: string; projectId?: number | null; error?: string }>;
  getSessionStatus(): Promise<ElectronSessionInfo>;
  onSessionTick(callback: (data: ElectronSessionTick) => void): void;
  offSessionTick(): void;
  offlineGetQueue(): Promise<OfflineSessionItem[]>;
  offlineEnqueue(item: OfflineSessionItem): Promise<OfflineSessionItem[]>;
  offlineReplace(items: OfflineSessionItem[]): Promise<OfflineSessionItem[]>;
  offlineRemove(clientId: string): Promise<OfflineSessionItem[]>;
  offlineClear(): Promise<OfflineSessionItem[]>;
  onOfflineQueueChanged(callback: (queue: OfflineSessionItem[]) => void): void;
  offOfflineQueueChanged(): void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

/** Возвращает bridge Electron, если приложение запущено в десктопной оболочке. */
export function getElectron(): ElectronAPI | null {
  if (typeof window === "undefined") return null;
  return window.electronAPI ?? null;
}

export function isElectron(): boolean {
  return getElectron() !== null;
}

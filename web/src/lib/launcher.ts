import { api } from "./api";
import { getElectron, type ElectronAppExited, type ElectronImportDone } from "./electron";
import { newClientId, startTrackedSession, stopTrackedSession, type TrackedSession } from "./offline";
import type { AppEntry } from "../types";

export interface LaunchResult {
  ok: boolean;
  error?: string;
  canceled?: boolean;
}

const activeLaunches = new Map<string, { tracked: TrackedSession; appId: number }>();
let listenersBound = false;

function broadcast(name: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function bindListeners() {
  const electron = getElectron();
  if (!electron || listenersBound) return;
  listenersBound = true;

  electron.onAppExited((data: ElectronAppExited) => {
    const record = activeLaunches.get(data.launchId);
    if (!record) return;
    activeLaunches.delete(data.launchId);
    stopTrackedSession(record.tracked)
      .catch(() => undefined)
      .finally(() => broadcast("distort:sessions-changed", { appId: record.appId }));
  });

  electron.onImportDone((data: ElectronImportDone) => {
    broadcast("distort:media-imported", data);
  });
}

/** Запускает приложение; при необходимости стартует автосессию по связанному проекту. */
export async function launchAppEntry(entry: AppEntry): Promise<LaunchResult> {
  const electron = getElectron();
  if (!electron) return { ok: false, error: "Запуск доступен только в десктопном приложении" };
  bindListeners();

  const launchId = newClientId();
  const args = (entry.args || "").split(/\s+/).filter(Boolean);
  const result = await electron.launchApp(entry.path, args, launchId);
  if (!result.ok) return result;

  api.post(`/api/apps/${entry.id}/launch`).catch(() => undefined);

  if (entry.autoSession && entry.projectId) {
    try {
      const tracked = await startTrackedSession(entry.projectId);
      activeLaunches.set(launchId, { tracked, appId: entry.id });
      broadcast("distort:sessions-changed", { appId: entry.id });
    } catch {
      /* ignore */
    }
  }

  return result;
}

/** Приводит набор активных папковых watcher'ов в соответствие со списком приложений. */
export async function syncWatchers(apps: AppEntry[]): Promise<void> {
  const electron = getElectron();
  if (!electron) return;

  const desired = new Map(
    apps
      .filter((a) => a.autoImport && a.watchFolder && a.projectId)
      .map((a) => [a.id, a])
  );

  let existing: Array<{ appId: number }> = [];
  try {
    existing = await electron.listWatchers();
  } catch {
    existing = [];
  }

  for (const [id, app] of desired) {
    electron
      .watchFolder({
        appId: id,
        folder: app.watchFolder as string,
        projectId: app.projectId as number,
      })
      .catch(() => undefined);
  }

  for (const w of existing) {
    if (!desired.has(w.appId)) {
      electron.unwatchFolder(w.appId).catch(() => undefined);
    }
  }
}

/** Передаёт в Electron актуальный токен/URL API для автоимпорта. */
export function syncApiContext(): void {
  const electron = getElectron();
  if (!electron) return;
  let token: string | null = null;
  try {
    token = localStorage.getItem("token");
  } catch {
    token = null;
  }
  electron.setApiContext({ apiUrl: electron.apiUrl, token }).catch(() => undefined);
}

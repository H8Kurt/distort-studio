import { api } from "./api";
import { getElectron, type OfflineSessionItem } from "./electron";

const LS_KEY = "distort.offlineSessions";

type QueueListener = (queue: OfflineSessionItem[]) => void;
const listeners = new Set<QueueListener>();

function emit(queue: OfflineSessionItem[]) {
  listeners.forEach((cb) => cb(queue));
}

function readLocal(): OfflineSessionItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(items: OfflineSessionItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getQueue(): Promise<OfflineSessionItem[]> {
  const el = getElectron();
  if (el) return el.offlineGetQueue();
  return readLocal();
}

export async function enqueueSession(item: OfflineSessionItem): Promise<OfflineSessionItem[]> {
  const el = getElectron();
  if (el) return el.offlineEnqueue(item);
  const items = readLocal();
  const idx = items.findIndex((x) => x.clientId === item.clientId);
  if (idx >= 0) items[idx] = { ...items[idx], ...item };
  else items.push(item);
  writeLocal(items);
  emit(items);
  return items;
}

export async function replaceQueue(items: OfflineSessionItem[]): Promise<OfflineSessionItem[]> {
  const el = getElectron();
  if (el) return el.offlineReplace(items);
  writeLocal(items);
  emit(items);
  return items;
}

export async function clearQueue(): Promise<OfflineSessionItem[]> {
  const el = getElectron();
  if (el) return el.offlineClear();
  writeLocal([]);
  emit([]);
  return [];
}

/** Подписка на изменения очереди (в Electron — через main, иначе локально). */
export function onQueueChange(cb: QueueListener): () => void {
  const el = getElectron();
  if (el) {
    el.onOfflineQueueChanged(cb);
    return () => el.offOfflineQueueChanged();
  }
  listeners.add(cb);
  return () => listeners.delete(cb);
}

let flushing = false;

/** Отправляет очередь на сервер. Возвращает число синхронизированных или null при ошибке. */
export async function flushQueue(): Promise<{ synced: number } | null> {
  if (flushing) return null;
  const items = await getQueue();
  if (!items.length) return { synced: 0 };

  flushing = true;
  try {
    const res = await api.post<{ synced: number }>("/api/sessions/sync", { sessions: items });
    await clearQueue();
    return res;
  } catch {
    return null;
  } finally {
    flushing = false;
  }
}

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/** Сетевая ошибка (сервер недоступен) — в отличие от ответа API с status. */
export function isNetworkError(err: unknown): boolean {
  return !(err instanceof Error && "status" in err);
}

export interface TrackedSession {
  clientId: string;
  serverId: number | null;
  projectId: number;
  startTime: string;
}

interface ServerSession {
  id: number;
  startTime: string;
}

/** Стартует сессию (при оффлайне кладёт её в очередь). */
export async function startTrackedSession(projectId: number): Promise<TrackedSession> {
  const clientId = newClientId();
  const startTime = new Date().toISOString();
  try {
    const session = await api.post<ServerSession>("/api/sessions", { projectId, startTime, clientId });
    return { clientId, serverId: session.id, projectId, startTime: session.startTime || startTime };
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueSession({ clientId, projectId, startTime, endTime: null });
      return { clientId, serverId: null, projectId, startTime };
    }
    throw err;
  }
}

/** Завершает сессию (учитывает и серверную, и оффлайн-очередь). */
export async function stopTrackedSession(tracked: TrackedSession): Promise<void> {
  const endTime = new Date().toISOString();
  try {
    if (tracked.serverId) {
      await api.put(`/api/sessions/${tracked.serverId}/stop`, { endTime });
      return;
    }
    const queue = await getQueue();
    const item = queue.find((x) => x.clientId === tracked.clientId);
    await enqueueSession({
      clientId: tracked.clientId,
      projectId: tracked.projectId,
      startTime: item?.startTime || tracked.startTime,
      endTime,
    });
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueSession({
        clientId: tracked.clientId,
        projectId: tracked.projectId,
        startTime: tracked.startTime,
        endTime,
      });
      return;
    }
    throw err;
  }
}

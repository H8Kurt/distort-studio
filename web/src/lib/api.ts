import { io, type Socket } from "socket.io-client";

const ELECTRON_API_URL: string | undefined =
  typeof window !== "undefined" ? window.electronAPI?.apiUrl : undefined;

export const API_URL =
  ELECTRON_API_URL || import.meta.env.VITE_API_URL || "http://localhost:4000";

const ACCESS_KEY = "token";
const REFRESH_KEY = "refreshToken";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string | null, refresh?: string | null): void {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  else localStorage.removeItem(ACCESS_KEY);
  if (refresh !== undefined) {
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    else localStorage.removeItem(REFRESH_KEY);
  }
  pushElectronApiContext();
}

function pushElectronApiContext(): void {
  try {
    const electron = window.electronAPI;
    if (!electron) return;
    electron
      .setApiContext({ apiUrl: electron.apiUrl, token: localStorage.getItem(ACCESS_KEY) })
      .catch(() => undefined);
  } catch {
    /* ignore */
  }
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  pushElectronApiContext();
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  isForm?: boolean;
  auth?: boolean;
  retry?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        setTokens(data.token, data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, isForm = false, auth = true, retry = true } = options;

  const headers: Record<string, string> = {};
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (isForm) payload = body as FormData;
    else {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_URL}${path}`, { method, headers, body: payload });

  if (res.status === 401 && retry && getRefreshToken()) {
    const ok = await refreshAccessToken();
    if (ok) return request<T>(path, { ...options, retry: false });
  }

  if (!res.ok) {
    let message = `Ошибка ${res.status}`;
    try {
      const data = await res.json();
      message = data.error || data.message || message;
    } catch {
      /* ignore */
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T = unknown>(path: string) => request<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body }),
  del: <T = unknown>(path: string) => request<T>(path, { method: "DELETE" }),
  postForm: <T = unknown>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form, isForm: true }),
};

/* ---------------- Socket.IO ---------------- */
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, { auth: { token: getAccessToken() } });
  }
  return socket;
}

export function resetSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/* Передаём токен в Electron, если он уже сохранён (после перезагрузки окна). */
pushElectronApiContext();

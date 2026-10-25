import { API_URL } from "./api";

export type FeedMode = "list" | "grid";

export function resolve(url?: string | null): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL}${url}`;
}

export function timeAgo(input?: string): string {
  if (!input) return "";
  const then = new Date(input).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн назад`;
  return new Date(then).toLocaleDateString("ru-RU");
}

export function ratioStyle(width?: number | null, height?: number | null): React.CSSProperties | undefined {
  if (!width || !height) return undefined;
  return { aspectRatio: `${width} / ${height}` };
}

export const FEED_MODE_KEY = "feed-mode";

export function getFeedMode(): FeedMode {
  try {
    return localStorage.getItem(FEED_MODE_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

export function setFeedMode(mode: FeedMode) {
  try {
    localStorage.setItem(FEED_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

import { useEffect } from "react";
import { api } from "../lib/api";
import { getElectron } from "../lib/electron";
import { syncApiContext, syncWatchers } from "../lib/launcher";
import type { AppEntry } from "../types";

/** Служебный компонент: держит папковые watcher'ы автоимпорта в актуальном состоянии. */
export default function AppWatchers() {
  useEffect(() => {
    if (!getElectron()) return;
    syncApiContext();

    let alive = true;
    const load = async () => {
      try {
        const apps = await api.get<AppEntry[]>("/api/apps");
        if (alive) await syncWatchers(Array.isArray(apps) ? apps : []);
      } catch {
        /* сервер недоступен — оставим как есть */
      }
    };

    load();
    window.addEventListener("distort:apps-changed", load);
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      window.removeEventListener("distort:apps-changed", load);
      window.removeEventListener("focus", load);
    };
  }, []);

  return null;
}

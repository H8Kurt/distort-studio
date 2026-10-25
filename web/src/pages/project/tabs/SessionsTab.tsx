import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { PlayIcon, StopIcon, ClockIcon, CloudIcon } from "@heroicons/react/24/solid";
import { api } from "../../../lib/api";
import { getElectron, type ElectronSessionTick } from "../../../lib/electron";
import {
  enqueueSession,
  flushQueue,
  getQueue,
  isNetworkError,
  newClientId,
  onQueueChange,
} from "../../../lib/offline";
import type { Session } from "../../../types";

interface SessionsTabProps {
  projectId: number;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}

export default function SessionsTab({ projectId }: SessionsTabProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [activeStart, setActiveStart] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Session[]>("/api/sessions/my");
      setSessions((Array.isArray(data) ? data : []).filter((s) => s.projectId === projectId));
    } catch (err) {
      if (!isNetworkError(err)) setError(err instanceof Error ? err.message : "Ошибка загрузки");
    }
  }, [projectId]);

  const refreshPending = useCallback(async () => {
    try {
      const q = await getQueue();
      setPendingCount(q.length);
    } catch {
      /* ignore */
    }
  }, []);

  const sync = useCallback(async () => {
    const res = await flushQueue();
    if (res) {
      await refreshPending();
      await load();
      if (res.synced > 0) {
        setNotice(`Синхронизировано сессий: ${res.synced}`);
        window.setTimeout(() => setNotice(""), 3000);
      }
    }
  }, [load, refreshPending]);

  useEffect(() => {
    load();
    refreshPending();
    const off = onQueueChange((q) => setPendingCount(q.length));
    const onOnline = () => {
      sync();
    };
    const onSessionsChanged = () => {
      load();
      refreshPending();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("distort:sessions-changed", onSessionsChanged);
    return () => {
      off();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("distort:sessions-changed", onSessionsChanged);
    };
  }, [load, refreshPending, sync]);

  useEffect(() => {
    if (!activeStart) return;
    const electron = getElectron();
    if (electron) {
      const onTick = (data: ElectronSessionTick) => {
        const tickTime = Date.parse(data.currentTime);
        if (!Number.isNaN(tickTime)) setNow(tickTime);
      };
      electron.onSessionTick(onTick);
      return () => electron.offSessionTick();
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeStart]);

  const startSession = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    const clientId = newClientId();
    const startTime = new Date().toISOString();
    try {
      const session = await api.post<Session>("/api/sessions", { projectId, startTime, clientId });
      setActiveId(session.id);
      setActiveClientId(clientId);
      setActiveStart(session.startTime);
      setNow(Date.parse(session.startTime));
      getElectron()?.startSession(projectId).catch(() => undefined);
      load();
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueSession({ clientId, projectId, startTime, endTime: null });
        setActiveId(null);
        setActiveClientId(clientId);
        setActiveStart(startTime);
        setNow(Date.parse(startTime));
        getElectron()?.startSession(projectId).catch(() => undefined);
        setError("Нет связи с сервером — сессия сохранена локально и синхронизируется позже");
        refreshPending();
      } else {
        setError(err instanceof Error ? err.message : "Ошибка");
      }
    } finally {
      setBusy(false);
    }
  };

  const stopSession = async () => {
    if (!activeStart) return;
    setBusy(true);
    setError("");
    const endTime = new Date().toISOString();
    try {
      if (activeId) {
        await api.put(`/api/sessions/${activeId}/stop`, { endTime });
      } else if (activeClientId) {
        const q = await getQueue();
        const item = q.find((x) => x.clientId === activeClientId);
        await enqueueSession({
          clientId: activeClientId,
          projectId,
          startTime: item?.startTime || activeStart,
          endTime,
        });
      }
      getElectron()?.stopSession().catch(() => undefined);
      setActiveId(null);
      setActiveClientId(null);
      setActiveStart(null);
      load();
      refreshPending();
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueSession({
          clientId: activeClientId || newClientId(),
          projectId,
          startTime: activeStart,
          endTime,
        });
        getElectron()?.stopSession().catch(() => undefined);
        setActiveId(null);
        setActiveClientId(null);
        setActiveStart(null);
        setError("Нет связи — завершение сессии сохранено локально");
        refreshPending();
      } else {
        setError(err instanceof Error ? err.message : "Ошибка");
      }
    } finally {
      setBusy(false);
    }
  };

  const totalSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const elapsedSeconds = activeStart ? Math.max(0, Math.floor((now - Date.parse(activeStart)) / 1000)) : 0;
  const isActive = activeStart !== null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <ClockIcon style={{ width: 26, height: 26, color: "var(--accent-primary)" }} />

        {!isActive ? (
          <button className="btn btn-primary" onClick={startSession} disabled={busy}>
            <PlayIcon style={{ width: 16, height: 16 }} /> Начать сессию
          </button>
        ) : (
          <button className="btn btn-danger" onClick={stopSession} disabled={busy}>
            <StopIcon style={{ width: 16, height: 16 }} /> Завершить
          </button>
        )}

        {isActive && (
          <span className="badge badge-success" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
            <ClockIcon style={{ width: 14, height: 14 }} /> {formatDuration(elapsedSeconds)}
          </span>
        )}

        {pendingCount > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={sync} title="Синхронизировать оффлайн-сессии">
            <CloudIcon style={{ width: 15, height: 15 }} />
            {pendingCount} в очереди · Синхронизировать
          </button>
        )}

        <div style={{ marginLeft: "auto" }} className="text-text-secondary">
          Всего: <strong>{formatDuration(totalSeconds)}</strong>
        </div>
      </div>

      {notice && <div className="badge badge-success">{notice}</div>}
      {error && <div className="badge badge-warning">{error}</div>}

      {sessions.length === 0 ? (
        <div className="card empty-state">
          <p className="text-text-secondary">Сессий по этому проекту пока нет.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-hover)", textAlign: "left" }}>
                <th style={cellHead}>Начало</th>
                <th style={cellHead}>Длительность</th>
                <th style={cellHead}>Статус</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--border-color)" }}>
                  <td style={cellBody}>{new Date(s.startTime).toLocaleString("ru-RU")}</td>
                  <td style={cellBody}>{formatDuration(s.durationSeconds || 0)}</td>
                  <td style={cellBody}>
                    {s.endTime ? (
                      <span className="badge badge-neutral">Завершена</span>
                    ) : (
                      <span className="badge badge-success">Активна</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const cellHead: CSSProperties = { padding: "0.75rem 1rem", fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700 };
const cellBody: CSSProperties = { padding: "0.75rem 1rem", fontSize: "0.88rem" };

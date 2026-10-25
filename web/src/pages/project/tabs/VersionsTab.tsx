import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowUturnLeftIcon, CodeBracketSquareIcon, PlusIcon } from "@heroicons/react/24/solid";
import Avatar from "../../../components/ui/Avatar";
import { api } from "../../../lib/api";
import type { Branch, Version } from "../../../types";

interface VersionsTabProps {
  projectId: number;
  canEdit: boolean;
}

export default function VersionsTab({ projectId, canEdit }: VersionsTabProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [message, setMessage] = useState("");
  const [branchName, setBranchName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [v, b] = await Promise.all([
        api.get<Version[]>(`/api/projects/${projectId}/versions`),
        api.get<Branch[]>(`/api/projects/${projectId}/branches`),
      ]);
      setVersions(Array.isArray(v) ? v : []);
      setBranches(Array.isArray(b) ? b : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const createVersion = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    try {
      await api.post(`/api/projects/${projectId}/versions`, { message });
      setMessage("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const createBranch = async (e: FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;
    setBusy(true);
    try {
      await api.post(`/api/projects/${projectId}/branches`, { name: branchName });
      setBranchName("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const restore = async (versionId: number) => {
    try {
      await api.post(`/api/projects/${projectId}/versions/${versionId}/restore`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && <div className="badge badge-warning">{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.25rem", alignItems: "start" }} className="versions-layout">
        <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {canEdit && (
            <form onSubmit={createVersion} className="card" style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                placeholder="Сообщение версии, например «Добавил бас»"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button className="btn btn-primary" disabled={busy}>
                <PlusIcon style={{ width: 16, height: 16 }} /> Версия
              </button>
            </form>
          )}

          {versions.length === 0 ? (
            <div className="card empty-state">
              <p className="text-text-secondary">Версий пока нет.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {versions.map((v) => (
                <div key={v.id} className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div className="version-badge">#{v.id}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }} className="line-clamp-1">
                      {v.message}
                    </div>
                    <div className="text-text-tertiary" style={{ fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 6 }}>
                      {v.author && <Avatar username={v.author.username} url={v.author.avatarUrl || undefined} size="sm" />}
                      {v.author ? `@${v.author.username}` : "unknown"} · {new Date(v.createdAt).toLocaleString("ru-RU")}
                    </div>
                  </div>
                  {canEdit && (
                    <button className="btn btn-secondary btn-sm" onClick={() => restore(v.id)}>
                      <ArrowUturnLeftIcon style={{ width: 14, height: 14 }} /> Восстановить
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3 className="panel-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CodeBracketSquareIcon style={{ width: 20, height: 20, color: "var(--accent-primary)" }} />
            Ветки
          </h3>
          {canEdit && (
            <form onSubmit={createBranch} style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                placeholder="Имя ветки"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
              />
              <button className="btn btn-secondary btn-sm" disabled={busy}>
                <PlusIcon style={{ width: 15, height: 15 }} />
              </button>
            </form>
          )}
          {branches.length === 0 ? (
            <p className="text-text-tertiary" style={{ fontSize: "0.85rem" }}>Веток нет.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {branches.map((b) => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="badge badge-primary">{b.name}</span>
                  <span className="text-text-tertiary" style={{ fontSize: "0.78rem" }}>
                    {b.Version ? `#${b.Version.id}` : "пусто"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

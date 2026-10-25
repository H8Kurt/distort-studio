import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CpuChipIcon,
  RocketLaunchIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  FolderOpenIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckIcon,
} from "@heroicons/react/24/solid";
import { api, API_URL } from "../lib/api";
import { getElectron, type ElectronConfig } from "../lib/electron";
import { launchAppEntry } from "../lib/launcher";
import Modal from "./ui/Modal";
import { useConfirm } from "./ui/confirm";
import type { AppEntry, DiscoveredApp, Project } from "../types";

function notifyAppsChanged() {
  window.dispatchEvent(new Event("distort:apps-changed"));
}

export default function ElectronPanel() {
  const electron = getElectron();
  const confirm = useConfirm();

  const [config, setConfig] = useState<ElectronConfig | null>(null);
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [editing, setEditing] = useState<AppEntry | null>(null);
  const [launchingId, setLaunchingId] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appList, projectList] = await Promise.all([
        api.get<AppEntry[]>("/api/apps"),
        api.get<Project[]>("/api/projects"),
      ]);
      setApps(Array.isArray(appList) ? appList : []);
      setProjects(Array.isArray(projectList) ? projectList : []);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Ошибка загрузки приложений");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (electron) {
      electron
        .getConfig()
        .then(setConfig)
        .catch(() => undefined);
    }
    load();
  }, [electron, load]);

  const projectName = (id?: number | null) =>
    id ? projects.find((p) => p.id === id)?.title || `Проект #${id}` : null;

  const launch = async (entry: AppEntry) => {
    if (!electron) {
      setStatus("Запуск доступен только в десктопном приложении");
      return;
    }
    setLaunchingId(entry.id);
    setStatus("");
    try {
      const result = await launchAppEntry(entry);
      if (result.ok) {
        setStatus(
          entry.autoSession && entry.projectId
            ? `Запущено: ${entry.name} · сессия → ${projectName(entry.projectId)}`
            : `Запущено: ${entry.name}`
        );
        const updated = await api.get<AppEntry[]>("/api/apps").catch(() => null);
        if (updated) setApps(updated);
      } else if (!result.canceled) {
        setStatus(result.error || "Не удалось запустить");
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Ошибка запуска");
    } finally {
      setLaunchingId(null);
    }
  };

  const remove = async (entry: AppEntry) => {
    const ok = await confirm({
      title: "Удалить приложение",
      message: `Удалить «${entry.name}» из списка?`,
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/api/apps/${entry.id}`);
      setApps((prev) => prev.filter((a) => a.id !== entry.id));
      notifyAppsChanged();
      setStatus("Приложение удалено");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Ошибка удаления");
    }
  };

  const onSaved = (entry: AppEntry) => {
    setApps((prev) => {
      const exists = prev.some((a) => a.id === entry.id);
      return exists ? prev.map((a) => (a.id === entry.id ? entry : a)) : [entry, ...prev];
    });
    notifyAppsChanged();
    setShowAdd(false);
    setEditing(null);
    setStatus("Сохранено");
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CpuChipIcon style={{ width: 20, height: 20, color: "var(--accent-primary)" }} />
          Лаунчер приложений
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowScan(true)}>
            <MagnifyingGlassIcon style={{ width: 15, height: 15 }} /> Сканировать
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(true)}>
            <PlusIcon style={{ width: 15, height: 15 }} /> Добавить
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
        <span className="text-text-secondary">Подключение</span>
        <span className={`badge ${electron ? "badge-success" : "badge-neutral"}`}>
          {electron ? "Electron" : "Браузер"}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", gap: 12 }}>
        <span className="text-text-secondary">API</span>
        <span className="text-text-primary" style={{ fontFamily: "monospace", wordBreak: "break-all", textAlign: "right" }}>
          {config?.apiUrl || API_URL}
        </span>
      </div>

      {status && (
        <div className="badge badge-primary" style={{ alignSelf: "flex-start" }}>
          {status}
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 44 }} />
      ) : apps.length === 0 ? (
        <p className="text-text-tertiary" style={{ fontSize: "0.85rem" }}>
          Нет добавленных приложений. Нажмите «Сканировать», чтобы найти установленные.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {apps.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0.6rem 0.7rem",
                border: "1px solid var(--border-color)",
                borderRadius: 10,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{entry.name}</div>
                <div
                  className="text-text-tertiary"
                  style={{ fontSize: "0.75rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  title={entry.path}
                >
                  {entry.path}
                </div>
                {(entry.projectId || entry.watchFolder) && (
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    {entry.projectId && (
                      <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
                        {projectName(entry.projectId)}
                      </span>
                    )}
                    {entry.autoSession && entry.projectId && (
                      <span className="badge badge-primary" style={{ fontSize: "0.7rem" }}>автосессия</span>
                    )}
                    {entry.autoImport && entry.watchFolder && (
                      <span className="badge badge-success" style={{ fontSize: "0.7rem" }} title={entry.watchFolder || ""}>
                        автоимпорт
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => launch(entry)}
                disabled={launchingId === entry.id}
              >
                <RocketLaunchIcon style={{ width: 14, height: 14 }} />
                {launchingId === entry.id ? "…" : "Запустить"}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setEditing(entry)}
                aria-label="Изменить"
              >
                <PencilSquareIcon style={{ width: 15, height: 15 }} />
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => remove(entry)} aria-label="Удалить">
                <TrashIcon style={{ width: 15, height: 15 }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!electron && (
        <p className="text-text-tertiary" style={{ fontSize: "0.82rem" }}>
          Запуск, автосессия и автоимпорт работают в десктопной версии (Electron).
        </p>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Новое приложение">
        <AppForm
          projects={projects}
          canBrowse={!!electron}
          onBrowseFile={async () => (electron ? electron.pickAppPath() : null)}
          onBrowseFolder={async () => (electron ? electron.pickFolder() : null)}
          onClose={() => setShowAdd(false)}
          onSaved={onSaved}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Изменить приложение">
        {editing && (
          <AppForm
            entry={editing}
            projects={projects}
            canBrowse={!!electron}
            onBrowseFile={async () => (electron ? electron.pickAppPath() : null)}
            onBrowseFolder={async () => (electron ? electron.pickFolder() : null)}
            onClose={() => setEditing(null)}
            onSaved={onSaved}
          />
        )}
      </Modal>

      <Modal open={showScan} onClose={() => setShowScan(false)} title="Установленные приложения">
        <ScanModal
          existingPaths={apps.map((a) => a.path)}
          onAdded={(entries) => {
            setApps((prev) => [...entries, ...prev]);
            notifyAppsChanged();
            setStatus(`Добавлено приложений: ${entries.length}`);
          }}
        />
      </Modal>
    </div>
  );
}

interface AppFormProps {
  entry?: AppEntry;
  projects: Project[];
  canBrowse: boolean;
  onBrowseFile: () => Promise<string | null>;
  onBrowseFolder: () => Promise<string | null>;
  onClose: () => void;
  onSaved: (entry: AppEntry) => void;
}

function AppForm({ entry, projects, canBrowse, onBrowseFile, onBrowseFolder, onClose, onSaved }: AppFormProps) {
  const isEdit = !!entry;
  const [name, setName] = useState(entry?.name || "");
  const [path, setPath] = useState(entry?.path || "");
  const [args, setArgs] = useState(entry?.args || "");
  const [projectId, setProjectId] = useState<number | "">(entry?.projectId || "");
  const [watchFolder, setWatchFolder] = useState(entry?.watchFolder || "");
  const [autoSession, setAutoSession] = useState(entry?.autoSession ?? true);
  const [autoImport, setAutoImport] = useState(entry?.autoImport ?? false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const browseFile = async () => {
    const picked = await onBrowseFile();
    if (picked) {
      setPath(picked);
      if (!name.trim()) {
        const base = picked.split(/[\\/]/).pop() || "";
        setName(base.replace(/\.[^.]+$/, ""));
      }
    }
  };

  const browseFolder = async () => {
    const picked = await onBrowseFolder();
    if (picked) {
      setWatchFolder(picked);
      setAutoImport(true);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !path.trim()) {
      setError("Укажите название и путь");
      return;
    }
    if (autoImport && !watchFolder.trim()) {
      setError("Для автоимпорта укажите папку");
      return;
    }
    if ((autoImport || autoSession) && !projectId) {
      setError("Выберите проект для автосессии/автоимпорта");
      return;
    }
    setBusy(true);
    const payload = {
      name: name.trim(),
      path: path.trim(),
      args: args.trim() || undefined,
      projectId: projectId || null,
      watchFolder: watchFolder.trim() || null,
      autoSession,
      autoImport,
    };
    try {
      const saved = isEdit
        ? await api.put<AppEntry>(`/api/apps/${entry!.id}`, payload)
        : await api.post<AppEntry>("/api/apps", payload);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label>Название</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Krita" required />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label>Путь к исполняемому файлу</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/usr/bin/krita"
            required
          />
          {canBrowse && (
            <button type="button" className="btn btn-secondary" onClick={browseFile}>
              <FolderOpenIcon style={{ width: 15, height: 15 }} /> Обзор
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label>Аргументы (необязательно)</label>
        <input className="input" value={args} onChange={(e) => setArgs(e.target.value)} placeholder="--nosplash" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label>Проект (для автосессии и автоимпорта)</label>
        <select
          className="input"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">— не выбран —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label>Папка автоимпорта (сохранения/экспорт)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            value={watchFolder}
            onChange={(e) => setWatchFolder(e.target.value)}
            placeholder="~/Pictures/Krita"
          />
          {canBrowse && (
            <button type="button" className="btn btn-secondary" onClick={browseFolder}>
              <FolderOpenIcon style={{ width: 15, height: 15 }} /> Обзор
            </button>
          )}
        </div>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }}>
        <input type="checkbox" checked={autoSession} onChange={(e) => setAutoSession(e.target.checked)} />
        Автосессия: считать время от запуска до закрытия приложения
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }}>
        <input type="checkbox" checked={autoImport} onChange={(e) => setAutoImport(e.target.checked)} />
        Автоимпорт: загружать новые файлы из папки в проект
      </label>

      {error && <div className="badge badge-warning">{error}</div>}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Отмена
        </button>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Сохраняем…" : isEdit ? "Сохранить" : "Добавить"}
        </button>
      </div>
    </form>
  );
}

interface ScanModalProps {
  existingPaths: string[];
  onAdded: (entries: AppEntry[]) => void;
}

function ScanModal({ existingPaths, onAdded }: ScanModalProps) {
  const [found, setFound] = useState<DiscoveredApp[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);

  const added = new Set(existingPaths);

  const scan = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<DiscoveredApp[]>("/api/apps/discover");
      setFound(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сканирования");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    scan();
  }, [scan]);

  const addOne = async (item: DiscoveredApp) => {
    setBusyPath(item.path);
    try {
      const created = await api.post<AppEntry>("/api/apps", {
        name: item.name,
        path: item.path,
        args: item.args || undefined,
        icon: item.icon || undefined,
      });
      onAdded([created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка добавления");
    } finally {
      setBusyPath(null);
    }
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? found.filter((item) => `${item.name} ${item.path}`.toLowerCase().includes(q))
    : found;
  const remaining = filtered.filter((item) => !added.has(item.path)).length;

  const addAll = async () => {
    const pending = filtered.filter((item) => !added.has(item.path));
    if (!pending.length) return;
    setAddingAll(true);
    setError("");
    const created: AppEntry[] = [];
    for (const item of pending) {
      try {
        const entry = await api.post<AppEntry>("/api/apps", {
          name: item.name,
          path: item.path,
          args: item.args || undefined,
          icon: item.icon || undefined,
        });
        created.push(entry);
      } catch {
        /* skip */
      }
    }
    if (created.length) onAdded(created);
    setAddingAll(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", minWidth: "min(560px, 78vw)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <MagnifyingGlassIcon
            style={{ width: 15, height: 15, position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}
          />
          <input
            className="input"
            style={{ paddingLeft: 32 }}
            placeholder="Поиск: Krita, Blender, REAPER…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={scan} disabled={loading} title="Пересканировать">
          <ArrowPathIcon style={{ width: 15, height: 15 }} />
        </button>
      </div>

      {error && <div className="badge badge-warning">{error}</div>}

      {loading ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : filtered.length === 0 ? (
        <p className="text-text-tertiary" style={{ fontSize: "0.85rem" }}>
          {found.length === 0 ? "Приложения не найдены" : "Ничего не найдено по запросу"}
        </p>
      ) : (
        <div style={{ maxHeight: "46vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((item) => {
            const isAdded = added.has(item.path);
            return (
              <div
                key={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0.5rem 0.65rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: 10,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{item.name}</div>
                  <div
                    className="text-text-tertiary"
                    style={{ fontSize: "0.72rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={item.path}
                  >
                    {item.path}
                  </div>
                </div>
                {isAdded ? (
                  <span className="badge badge-success">
                    <CheckIcon style={{ width: 13, height: 13 }} /> Добавлено
                  </span>
                ) : (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => addOne(item)}
                    disabled={busyPath === item.path || addingAll}
                  >
                    {busyPath === item.path ? "…" : "Добавить"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {remaining > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span className="text-text-secondary" style={{ fontSize: "0.85rem" }}>
            Найдено: {found.length}, можно добавить: {remaining}
          </span>
          <button className="btn btn-primary btn-sm" onClick={addAll} disabled={addingAll}>
            {addingAll ? "Добавляем…" : "Добавить все"}
          </button>
        </div>
      )}
    </div>
  );
}

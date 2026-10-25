import { useState, type FormEvent } from "react";
import { TrashIcon, CheckIcon } from "@heroicons/react/24/solid";
import { api } from "../../../lib/api";
import type { Project, WorkspaceProject } from "../../../types";

interface SettingsTabProps {
  project: WorkspaceProject;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function SettingsTab({ project, onUpdated, onDeleted }: SettingsTabProps) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || "");
  const [visibility, setVisibility] = useState<NonNullable<Project["visibility"]>>(project.visibility || "PRIVATE");
  const [coverUrl, setCoverUrl] = useState(project.coverUrl || "");
  const [tags, setTags] = useState((project.tags || []).join(", "));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!project.isEditor) {
    return (
      <div className="card empty-state">
        <h3>Только для участников</h3>
        <p className="text-text-secondary" style={{ marginTop: 4 }}>
          Редактировать настройки проекта могут владелец и редакторы.
        </p>
      </div>
    );
  }

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSaved(false);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);
      await api.put<Project>(`/api/projects/${project.id}`, {
        title,
        description,
        visibility,
        coverUrl,
        tags: tagList,
      });
      setSaved(true);
      onUpdated();
      setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const removeProject = async () => {
    if (!window.confirm(`Удалить проект «${project.title}»? Это действие необратимо.`)) return;
    try {
      await api.del(`/api/projects/${project.id}`);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 720 }}>
      {error && <div className="badge badge-warning">{error}</div>}

      <form onSubmit={save} className="card" style={{ display: "grid", gap: "0.9rem" }}>
        <h3 className="panel-title">Основное</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label>Название</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label>Описание</label>
          <textarea className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }} className="settings-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label>Доступ</label>
            <select
              className="input"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as NonNullable<Project["visibility"]>)}
            >
              <option value="PRIVATE">Приватный</option>
              <option value="PUBLIC">Публичный</option>
              <option value="TEAM">Командный</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label>Теги (через запятую)</label>
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="synthwave, cover, remix" />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label>Обложка (URL)</label>
          <input className="input" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="Можно выбрать файл во вкладке «Файлы»" />
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn btn-primary" disabled={saving}>
            {saved ? <><CheckIcon style={{ width: 15, height: 15 }} /> Сохранено</> : saving ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </form>

      <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 className="panel-title" style={{ color: "var(--danger, #e5484d)" }}>Удалить проект</h3>
          <p className="text-text-tertiary" style={{ fontSize: "0.82rem", marginTop: 4 }}>
            Проект, файлы и версии будут удалены безвозвратно.
          </p>
        </div>
        <button className="btn btn-danger" onClick={removeProject}>
          <TrashIcon style={{ width: 15, height: 15 }} /> Удалить
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import ProjectList from "../components/ui/ProjectList";
import { api } from "../lib/api";
import type { Project } from "../types";

interface ProjectsPageProps {
  projects: Project[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
  refreshProjects: () => void;
}

const EMPTY = { title: "", description: "", visibility: "PRIVATE" as Project["visibility"] };

export default function ProjectsPage({ projects, setProjects, refreshProjects }: ProjectsPageProps) {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [shared, setShared] = useState<Project[]>([]);

  const loadShared = () => {
    api
      .get<Project[]>("/api/collabs/projects")
      .then((d) => setShared(Array.isArray(d) ? d : []))
      .catch(() => undefined);
  };

  useEffect(() => {
    loadShared();
  }, []);

  const createProject = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const project = await api.post<Project>("/api/projects", form);
      setProjects((prev) => [project, ...prev]);
      setForm(EMPTY);
      setShowCreate(false);
      refreshProjects();
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">studio // моя мастерская</span>
          <h2 className="page-title">Мои проекты</h2>
          <span className="page-sub">{projects.length} проектов в вашей студии</span>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? <XMarkIcon style={{ width: 16, height: 16 }} /> : <PlusIcon style={{ width: 16, height: 16 }} />}
            {showCreate ? "Отмена" : "Новый проект"}
          </button>
        </div>
      </div>

      {error && <div className="badge badge-warning">{error}</div>}

      {showCreate && (
        <form onSubmit={createProject} className="card animate-scale-in" style={{ display: "grid", gap: "0.85rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label>Название</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Например, Night Drive EP" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label>Описание</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="О чём этот проект?" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label>Доступ</label>
            <select className="input" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as Project["visibility"] })}>
              <option value="PRIVATE">Приватный</option>
              <option value="PUBLIC">Публичный</option>
              <option value="TEAM">Командный</option>
            </select>
          </div>
          <button className="btn btn-primary" disabled={saving} style={{ justifySelf: "start" }}>
            {saving ? "Создаём…" : "Создать проект"}
          </button>
        </form>
      )}

      <ProjectList projects={projects} onSelect={(id) => navigate(`/projects/${id}`)} />

      {shared.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
          <div className="page-heading">
            <span className="page-eyebrow">collab // совместно</span>
            <h3 className="page-title" style={{ fontSize: "1.25rem" }}>Совместные проекты</h3>
            <span className="page-sub">{shared.length} проектов, где вы участник</span>
          </div>
          <ProjectList projects={shared} onSelect={(id) => navigate(`/projects/${id}`)} />
        </div>
      )}
    </div>
  );
}

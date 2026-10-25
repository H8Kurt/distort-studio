import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, NavLink } from "react-router-dom";
import {
  InformationCircleIcon,
  FolderIcon,
  CodeBracketSquareIcon,
  UserGroupIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  LockClosedIcon,
  GlobeAltIcon,
  UsersIcon,
  ArrowPathRoundedSquareIcon,
  LinkIcon,
  StarIcon,
  ArrowLeftIcon,
  EyeSlashIcon,
  ShareIcon,
} from "@heroicons/react/24/solid";
import Avatar from "../../components/ui/Avatar";
import { api, API_URL, getSocket } from "../../lib/api";
import type { Project, User, WorkspaceProject } from "../../types";
import OverviewTab from "./tabs/OverviewTab";
import FilesTab from "./tabs/FilesTab";
import VersionsTab from "./tabs/VersionsTab";
import ForkTreeTab from "./tabs/ForkTreeTab";
import CollabsTab from "./tabs/CollabsTab";
import SessionsTab from "./tabs/SessionsTab";
import CommentsTab from "./tabs/CommentsTab";
import SettingsTab from "./tabs/SettingsTab";

interface ProjectWorkspacePageProps {
  currentUser: User;
  projects: Project[];
  refreshProjects: () => void;
}

const TABS = [
  { key: "overview", label: "Обзор", icon: InformationCircleIcon },
  { key: "files", label: "Файлы", icon: FolderIcon },
  { key: "versions", label: "Версии", icon: CodeBracketSquareIcon },
  { key: "forks", label: "Форки", icon: ShareIcon },
  { key: "collabs", label: "Коллабы", icon: UserGroupIcon },
  { key: "sessions", label: "Сессии", icon: ClockIcon },
  { key: "comments", label: "Комментарии", icon: ChatBubbleLeftRightIcon },
  { key: "settings", label: "Настройки", icon: Cog6ToothIcon },
];

function visibilityBadge(v?: string) {
  if (v === "PUBLIC") return { cls: "badge-success", icon: GlobeAltIcon, label: "Публичный" };
  if (v === "TEAM") return { cls: "badge-primary", icon: UsersIcon, label: "Командный" };
  return { cls: "badge-warning", icon: LockClosedIcon, label: "Приватный" };
}

export default function ProjectWorkspacePage({
  currentUser,
  projects,
  refreshProjects,
}: ProjectWorkspacePageProps) {
  const { id, tab } = useParams<{ id: string; tab?: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<WorkspaceProject | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const projectId = Number(id);
  const activeTab = tab || "overview";

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api.get<WorkspaceProject>(`/api/projects/${projectId}`);
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки проекта");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Подключаемся к комнате проекта для realtime-событий
  useEffect(() => {
    if (!Number.isFinite(projectId)) return;
    const socket = getSocket();
    socket.emit("join-project", projectId);
  }, [projectId]);

  // realtime обновления проекта
  useEffect(() => {
    const list = projects.find((p) => p.id === projectId);
    if (list) setProject((prev) => (prev ? { ...prev, ...list } : prev));
  }, [projects, projectId]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const fork = async () => {
    if (!project) return;
    try {
      const forked = await api.post<Project>(`/api/projects/${project.id}/fork`);
      refreshProjects();
      navigate(`/projects/${forked.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка форка");
    }
  };

  const setPublished = async (publish: boolean) => {
    if (!project) return;
    setPublishing(true);
    setError("");
    try {
      const updated = await api.post<WorkspaceProject>(
        `/api/projects/${project.id}/${publish ? "publish" : "unpublish"}`
      );
      setProject((prev) => (prev ? { ...prev, ...updated } : prev));
      refreshProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка публикации");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
        <p className="text-text-secondary">Загрузка проекта…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="card empty-state">
        <h3>Проект не найден</h3>
        <p className="text-text-secondary" style={{ marginTop: 4 }}>
          {error || "Возможно, он был удалён или у вас нет доступа."}
        </p>
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => navigate("/projects")}>
          <ArrowLeftIcon style={{ width: 15, height: 15 }} /> К проектам
        </button>
      </div>
    );
  }

  const badge = visibilityBadge(project.visibility);
  const cover =
    project.coverUrl &&
    (project.coverUrl.startsWith("http") ? project.coverUrl : `${API_URL}${project.coverUrl}`);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <button className="btn btn-ghost btn-sm workspace-back" onClick={() => navigate("/projects")}>
        <ArrowLeftIcon style={{ width: 14, height: 14 }} /> Все проекты
      </button>

      <div className="card workspace-hero">
        <div className="workspace-cover" style={cover ? { backgroundImage: `url(${cover})` } : undefined}>
          {!cover && <span className="workspace-cover-empty">нет обложки</span>}
        </div>

        <div className="workspace-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="page-eyebrow">project workspace</span>
            <h1 className="workspace-title">{project.title}</h1>
            <div className="workspace-meta">
              <span className={`badge ${badge.cls}`}>
                <badge.icon style={{ width: 12, height: 12 }} /> {badge.label}
              </span>
              {project.publishedAt && (
                <span className="badge badge-primary">
                  <GlobeAltIcon style={{ width: 12, height: 12 }} /> В ленте
                </span>
              )}
              {project.owner && (
                <button
                  className="workspace-owner"
                  onClick={() => navigate(`/u/${project.owner!.id}`)}
                  title="Профиль автора"
                >
                  <Avatar username={project.owner.username} url={project.owner.avatarUrl || undefined} size="sm" />
                  @{project.owner.username}
                </button>
              )}
              <span className="badge badge-neutral">
                <FolderIcon style={{ width: 12, height: 12 }} /> {project.mediaCount ?? 0}
              </span>
              <span className="badge badge-neutral">
                <CodeBracketSquareIcon style={{ width: 12, height: 12 }} /> {project.versionCount ?? 0}
              </span>
            </div>
            {project.tags && project.tags.length > 0 && (
              <div className="workspace-tags">
                {project.tags.map((t) => (
                  <span key={t} className="chip active">#{t}</span>
                ))}
              </div>
            )}
          </div>

          <div className="workspace-actions">
            <button className="btn btn-secondary btn-sm" onClick={copyLink}>
              <LinkIcon style={{ width: 14, height: 14 }} /> {copied ? "Скопировано" : "Ссылка"}
            </button>
            {project.isEditor && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setPublished(!project.publishedAt)}
                disabled={publishing}
                title={project.publishedAt ? "Убрать из ленты" : "Опубликовать в ленту"}
              >
                {project.publishedAt ? (
                  <>
                    <EyeSlashIcon style={{ width: 14, height: 14 }} /> Снять
                  </>
                ) : (
                  <>
                    <GlobeAltIcon style={{ width: 14, height: 14 }} /> Опубликовать
                  </>
                )}
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={fork}>
              <ArrowPathRoundedSquareIcon style={{ width: 14, height: 14 }} /> Форк
            </button>
            <button className="btn btn-primary btn-sm" disabled title="Подписки появятся позже">
              <StarIcon style={{ width: 14, height: 14 }} /> Следить
            </button>
          </div>
        </div>
      </div>

      {error && <div className="badge badge-warning">{error}</div>}

      <nav className="workspace-tabs" aria-label="Разделы проекта">
        {TABS.map((t) => (
          <NavLink
            key={t.key}
            to={`/projects/${project.id}/${t.key}`}
            className={`workspace-tab${activeTab === t.key ? " active" : ""}`}
          >
            <t.icon style={{ width: 16, height: 16 }} />
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="animate-fade-in">
        {activeTab === "overview" && <OverviewTab project={project} />}
        {activeTab === "files" && (
          <FilesTab projectId={project.id} canEdit={!!project.isEditor} onProjectChange={load} />
        )}
        {activeTab === "versions" && <VersionsTab projectId={project.id} canEdit={!!project.isEditor} />}
        {activeTab === "forks" && <ForkTreeTab projectId={project.id} canFork />}
        {activeTab === "collabs" && (
          <CollabsTab projectId={project.id} currentUser={currentUser} isOwner={!!project.isOwner} />
        )}
        {activeTab === "sessions" && <SessionsTab projectId={project.id} />}
        {activeTab === "comments" && (
          <CommentsTab projectId={project.id} currentUser={currentUser} canModerate={!!project.isEditor} />
        )}
        {activeTab === "settings" && (
          <SettingsTab
            project={project}
            onUpdated={load}
            onDeleted={() => {
              refreshProjects();
              navigate("/projects");
            }}
          />
        )}
      </div>
    </div>
  );
}

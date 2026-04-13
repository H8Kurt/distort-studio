import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  TrashIcon,
  PencilIcon,
  PlusIcon,
  UserGroupIcon,
  ClockIcon,
  FolderIcon,
  ArrowLeftOnRectangleIcon,
  SparklesIcon,
  PhotoIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  UserIcon
} from "@heroicons/react/24/solid";
import UploadForm from "./UploadForm";
import ProfileEditForm from "./ProfileEditForm";
import CollaborationPanel from "./CollaborationPanel";
import VersionsPanel from "./VersionsPanel";
import ThemeSwitcher from "./ThemeSwitcher";
import LandingPage from "./LandingPage";
import { io } from "socket.io-client";

const socket = io("http://localhost:4000");

// === Типы ===
interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  rebelRank?: number;
  createdAt?: string;
  location?: string;
  website?: string;
}

interface Project {
  id: number;
  title: string;
  description: string;
  UserId: number;
  visibility?: 'PRIVATE' | 'PUBLIC' | 'TEAM';
  coverImage?: string;
  mediaCount?: number;
  likesCount?: number;
  viewsCount?: number;
  updatedAt?: string;
}

interface UploadFile {
  filename?: string;
  originalName?: string;
  thumbUrl?: string;
  type: string;
  url: string;
}

interface Version {
  id: number;
  versionNumber: string;
  message: string;
  createdAt: string;
  author: {
    id: number;
    username: string;
  };
  isCurrent?: boolean;
}

interface Collaborator {
  id: number;
  username: string;
  email: string;
  role: "owner" | "editor" | "viewer";
}


// === Компонент аватара ===
function Avatar({ username, size = "md", url }: { username: string; size?: "sm" | "md" | "lg"; url?: string }) {
  const sizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-16 h-16" };
  const colors = ["from-purple-500 to-pink-500", "from-blue-500 to-cyan-500", "from-green-500 to-emerald-500"];
  const colorIndex = username.length % colors.length;
  
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-bold shadow-lg`}>
      {url ? (
        <img src={url} alt={username} className="w-full h-full rounded-full object-cover" />
      ) : (
        username.charAt(0).toUpperCase()
      )}
    </div>
  );
}

// === Компонент карточки проекта ===
function ProjectCard({ 
  project, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete,
  viewMode = "grid"
}: { 
  project: Project; 
  isSelected: boolean; 
  onSelect: () => void; 
  onEdit: () => void; 
  onDelete: () => void;
  viewMode?: "grid" | "list";
}) {
  const visibilityColors = {
    PRIVATE: "bg-gray-500",
    PUBLIC: "bg-green-500",
    TEAM: "bg-blue-500"
  };
  
  const visibilityLabels = {
    PRIVATE: "Приватный",
    PUBLIC: "Публичный",
    TEAM: "Командный"
  };

  if (viewMode === "list") {
    return (
      <div 
        className={`group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden flex items-center gap-4 ${
          isSelected 
            ? "bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-purple-500/50 shadow-lg shadow-purple-500/20" 
            : "bg-gray-800/50 border-gray-700/50 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10"
        }`}
        onClick={onSelect}
      >
        {/* Индикатор выбора */}
        {isSelected && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-blue-500 rounded-l-xl" />
        )}
        
        <FolderIcon className="w-8 h-8 text-purple-400 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-white truncate">{project.title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs text-white ${visibilityColors[project.visibility || 'PRIVATE']}`}>
              {visibilityLabels[project.visibility || 'PRIVATE']}
            </span>
          </div>
          {project.description && (
            <p className="text-sm text-gray-400 truncate">{project.description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 rounded-lg hover:bg-yellow-500/20 text-yellow-400 transition-colors"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
          <ChevronRightIcon className={`w-5 h-5 text-purple-400 transition-transform ${isSelected ? "rotate-90" : ""}`} />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden ${
        isSelected 
          ? "bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/50 shadow-lg shadow-purple-500/20" 
          : "bg-gray-800/50 border-gray-700/50 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10"
      }`}
      onClick={onSelect}
    >
      {/* Декоративный градиент */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FolderIcon className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <h3 className="text-lg font-semibold text-white truncate">{project.title}</h3>
          </div>
          <div className="flex items-center gap-2 ml-7 mb-2">
            <span className={`px-2 py-0.5 rounded-full text-xs text-white ${visibilityColors[project.visibility || 'PRIVATE']}`}>
              {visibilityLabels[project.visibility || 'PRIVATE']}
            </span>
          </div>
          {project.description && (
            <p className="text-sm text-gray-400 line-clamp-2 ml-7">{project.description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 rounded-lg hover:bg-yellow-500/20 text-yellow-400 transition-colors tooltip"
            data-tooltip="Редактировать"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors tooltip"
            data-tooltip="Удалить"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
          <ChevronRightIcon className={`w-5 h-5 text-purple-400 transition-transform ${isSelected ? "rotate-90" : ""}`} />
        </div>
      </div>
      
      {/* Индикатор выбора */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-blue-500 rounded-l-xl" />
      )}
    </div>
  );
}

// === Компонент медиа файла ===
function MediaCard({ media }: { media: UploadFile }) {
  return (
    <div className="group relative bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
      <div className="aspect-square flex items-center justify-center bg-gray-900/50">
        {media.type === "image" ? (
          <>
            <img
              src={`http://localhost:4000${media.thumbUrl || media.url}`}
              alt={media.originalName || "файл"}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <a
              href={`http://localhost:4000/api/projects/media/${media.filename}/download`}
              download
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50"
            >
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          </>
        ) : (
          <div className="text-center p-4">
            <DocumentTextIcon className="w-12 h-12 text-purple-400 mx-auto mb-2" />
            <a
              href={`http://localhost:4000/api/projects/media/${media.filename}/download`}
              download
              className="text-sm text-purple-400 hover:text-purple-300 underline decoration-purple-500/50"
            >
              {media.originalName || "Скачать файл"}
            </a>
          </div>
        )}
      </div>
      
      {/* Оверлей при наведении */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
        <span className="text-xs text-white truncate">{media.originalName || "Без названия"}</span>
      </div>
    </div>
  );
}

// === Страница проектов (главная) ===
function ProjectsPage({ 
  token, 
  projects, 
  setProjects, 
  projectId, 
  setProjectId,
  media,
  setMedia,
}: { 
  token: string | null; 
  projects: Project[]; 
  setProjects: any;
  projectId: number | null; 
  setProjectId: any;
  media: UploadFile[];
  setMedia: any;

}) {
  const [newProject, setNewProject] = useState({ title: "", description: "", visibility: "PRIVATE" as 'PRIVATE' | 'PUBLIC' | 'TEAM' });
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("");

  const addProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title) return;
    const res = await fetch("http://localhost:4000/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: newProject.title,
        description: newProject.description,
        visibility: newProject.visibility,
      }),
    });
    const created = await res.json();
    setNewProject({ title: "", description: "", visibility: "PRIVATE" });
    setShowNewProjectForm(false);
    setProjects((prev: Project[]) => [...prev, created]);
  };

  const deleteProject = async (id: number) => {
    await fetch(`http://localhost:4000/api/projects/${id}`, { 
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (projectId === id) {
      setProjectId(null);
      setMedia([]);
    }
    setProjects((prev: Project[]) => prev.filter(p => p.id !== id));
  };

  const editProject = async (
    id: number,
    newTitle: string,
    newDescription: string,
    newVisibility?: string
  ) => {
    await fetch(`http://localhost:4000/api/projects/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ 
        title: newTitle, 
        description: newDescription,
        visibility: newVisibility
      }),
    });
    setProjects((prev: Project[]) => prev.map(p => p.id === id ? { ...p, title: newTitle, description: newDescription, visibility: newVisibility || p.visibility } : p));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Левая колонка - Проекты */}
      <div className="lg:col-span-4 xl:col-span-3 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FolderIcon className="w-6 h-6 text-purple-400" />
            Проекты
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="btn btn-sm btn-secondary"
              data-tooltip={viewMode === "grid" ? "Список" : "Сетка"}
            >
              {viewMode === "grid" ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              )}
            </button>
            <button 
              onClick={() => setShowNewProjectForm(!showNewProjectForm)}
              className="btn btn-primary btn-icon"
              data-tooltip="Новый проект"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Фильтры */}
        <div className="flex gap-2 mb-4">
          <select
            className="input text-sm py-1"
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
          >
            <option value="">Все статусы</option>
            <option value="PUBLIC">Публичные</option>
            <option value="PRIVATE">Приватные</option>
            <option value="TEAM">Командные</option>
          </select>
        </div>
        
        {/* Форма нового проекта */}
        {showNewProjectForm && (
          <form onSubmit={addProject} className="mb-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 space-y-3 animate-fade-in">
            <input
              className="input"
              placeholder="Название проекта"
              value={newProject.title}
              onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
              autoFocus
            />
            <textarea
              className="input resize-none"
              placeholder="Описание (опционально)"
              rows={2}
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
            />
            <select
              className="input"
              value={newProject.visibility}
              onChange={(e) => setNewProject({ ...newProject, visibility: e.target.value as 'PRIVATE' | 'PUBLIC' | 'TEAM' })}
            >
              <option value="PRIVATE">Приватный</option>
              <option value="PUBLIC">Публичный</option>
              <option value="TEAM">Командный</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary flex-1">
                <PlusIcon className="w-4 h-4" />
                Создать
              </button>
              <button 
                type="button" 
                onClick={() => setShowNewProjectForm(false)}
                className="btn btn-secondary"
              >
                Отмена
              </button>
            </div>
          </form>
        )}
        
        {/* Список проектов */}
        <div className={`${viewMode === "grid" ? "grid grid-cols-1 gap-2" : "space-y-2"} max-h-[calc(100vh-350px)] overflow-y-auto pr-2`}>
          {projects
            .filter(p => !visibilityFilter || p.visibility === visibilityFilter)
            .map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              isSelected={projectId === p.id}
              onSelect={() => setProjectId(p.id)}
              onEdit={() => {
                const newTitle = prompt("Новое название", p.title) || p.title;
                const newDescription = prompt("Описание", p.description) || p.description;
                const newVisibility = prompt("Статус (PRIVATE/PUBLIC/TEAM)", p.visibility || "PRIVATE") || p.visibility;
                editProject(p.id, newTitle, newDescription, newVisibility);
              }}
              onDelete={() => {
                if (confirm(`Удалить проект "${p.title}"?`)) {
                  deleteProject(p.id);
                }
              }}
              viewMode={viewMode}
            />
          ))}
          
          {projects.filter(p => !visibilityFilter || p.visibility === visibilityFilter).length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <FolderIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Нет проектов</p>
              <p className="text-sm">Создайте первый проект!</p>
            </div>
          )}
        </div>
      </div>

      {/* Правая колонка - Контент проекта */}
      <div className="lg:col-span-8 xl:col-span-9">
        {projectId ? (
          <div className="animate-fade-in">
            {/* Заголовок проекта с вкладками */}
            <div className="card mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {projects.find(p => p.id === projectId)?.title || "Проект"}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {projects.find(p => p.id === projectId)?.description || "Нет описания"}
                  </p>
                </div>
              </div>

              {/* Вкладки навигации */}
              <div className="flex gap-2 border-t border-gray-700/50 pt-4">
                <button
                  onClick={() => {}}
                  className={`btn flex-1 ${true ? "btn-primary" : "btn-secondary"}`}
                >
                  <PhotoIcon className="w-4 h-4" />
                  Медиа
                </button>
                <a href={`/versions`} className="btn btn-secondary flex-1">
                  <FolderIcon className="w-4 h-4" />
                  Версии
                </a>
                <a href={`/collabs`} className="btn btn-secondary flex-1">
                  <UserGroupIcon className="w-4 h-4" />
                  Коллабы
                </a>
              </div>
            </div>

            {/* Контент вкладок - только медиа на главной */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <PhotoIcon className="w-6 h-6 text-purple-400" />
                Медиа проекта
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <ClockIcon className="w-4 h-4" />
                {media.length} файлов
              </div>
            </div>
            
            <div className="card mb-6">
              <UploadForm 
                projectId={projectId} 
                onUploaded={(mediaItem) => { 
                  setMedia((prev: UploadFile[]) => [mediaItem, ...prev]); 
                }} 
              />
            </div>
            
            {media.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {media.map((u, i) => (
                  <MediaCard key={i} media={u} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 card">
                <PhotoIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-lg mb-2">Нет медиафайлов</p>
                <p className="text-gray-500 text-sm">Загрузите первые файлы в этот проект</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <FolderIcon className="w-24 h-24 mx-auto mb-4 text-gray-700" />
              <h3 className="text-2xl font-semibold text-gray-500 mb-2">Выберите проект</h3>
              <p className="text-gray-600">Выберите проект из списка слева или создайте новый</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// === Страница версий ===
function VersionsPage({ token, projects, projectId, setProjectId }: { token: string | null; projects: Project[]; projectId: number | null; setProjectId: any; }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [showForkModal, setShowForkModal] = useState(false);
  const [forkName, setForkName] = useState("");
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchName, setBranchName] = useState("");

  const fetchProjectVersions = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:4000/api/projects/${id}/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch versions");
      const data = await res.json();
      setVersions(data);
    } catch (err) {
      console.error("Ошибка загрузки версий:", err);
      setVersions([]);
    }
  };

  const fetchProjectBranches = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:4000/api/projects/${id}/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch branches");
      const data = await res.json();
      setBranches(data);
    } catch (err) {
      console.error("Ошибка загрузки веток:", err);
      setBranches([]);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectVersions(projectId);
      fetchProjectBranches(projectId);
    }
  }, [projectId, token]);

  const createVersion = async (message: string) => {
    const res = await fetch(`http://localhost:4000/api/projects/${projectId}/versions`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error("Failed to create version");
    await fetchProjectVersions(projectId!);
  };

  const restoreVersion = async (versionId: number) => {
    if (!confirm("Восстановить эту версию? Текущие изменения будут сохранены как новая версия.")) return;
    const res = await fetch(`http://localhost:4000/api/projects/${projectId}/versions/${versionId}/restore`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to restore version");
    await fetchProjectVersions(projectId!);
  };

  const forkProject = async () => {
    if (!forkName.trim()) {
      alert("Введите название форка");
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/api/projects/${projectId}/fork`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name: forkName }),
      });
      if (!res.ok) throw new Error("Failed to fork project");
      const forkedProject = await res.json();
      alert(`Проект успешно форкнут! Новый проект ID: ${forkedProject.id}`);
      setShowForkModal(false);
      setForkName("");
      // Можно перенаправить на новый проект
    } catch (err: any) {
      alert(err.message || "Ошибка создания форка");
    }
  };

  const createBranch = async () => {
    if (!branchName.trim()) {
      alert("Введите название ветки");
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/api/projects/${projectId}/branches`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name: branchName }),
      });
      if (!res.ok) throw new Error("Failed to create branch");
      await fetchProjectBranches(projectId!);
      setShowBranchModal(false);
      setBranchName("");
    } catch (err: any) {
      alert(err.message || "Ошибка создания ветки");
    }
  };

  const compareVersions = (v1: number, v2: number) => {
    alert(`Сравнение версий ${v1} и ${v2}\n(Функционал в разработке)`);
  };

  if (!projectId) {
    return (
      <div className="text-center py-16">
        <FolderIcon className="w-24 h-24 mx-auto mb-4 text-gray-700" />
        <h3 className="text-2xl font-semibold text-gray-500 mb-2">Проект не выбран</h3>
        <p className="text-gray-600 mb-4">Выберите проект для работы с версиями</p>
        <button onClick={() => setProjectId(null)} className="btn btn-primary">
          К списку проектов
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button onClick={() => setProjectId(null)} className="btn btn-secondary mb-4">
          ← Назад к проектам
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {projects.find(p => p.id === projectId)?.title || "Проект"}
            </h2>
            <p className="text-gray-400">Управление версиями проекта</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForkModal(true)} className="btn btn-secondary">
              <FolderIcon className="w-4 h-4" />
              Форк проекта
            </button>
            <button onClick={() => setShowBranchModal(true)} className="btn btn-primary">
              <PlusIcon className="w-4 h-4" />
              Создать ветку
            </button>
          </div>
        </div>
      </div>
      
      {/* Модальное окно форка */}
      {showForkModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Создать форк проекта</h3>
            <input
              className="input w-full mb-4"
              placeholder="Название форка"
              value={forkName}
              onChange={(e) => setForkName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={forkProject} className="btn btn-primary flex-1">
                Создать форк
              </button>
              <button onClick={() => { setShowForkModal(false); setForkName(""); }} className="btn btn-secondary">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания ветки */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Создать ветку</h3>
            <input
              className="input w-full mb-4"
              placeholder="Название ветки"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={createBranch} className="btn btn-primary flex-1">
                Создать
              </button>
              <button onClick={() => { setShowBranchModal(false); setBranchName(""); }} className="btn btn-secondary">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список веток */}
      {branches.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <FolderIcon className="w-5 h-5 text-purple-400" />
            Ветки проекта
          </h3>
          <div className="flex flex-wrap gap-2">
            {branches.map((branch) => (
              <div key={branch.id} className="px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600">
                <span className="text-sm text-white font-medium">{branch.name}</span>
                {branch.Version && (
                  <span className="text-xs text-gray-400 ml-2">v{branch.Version.id}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <VersionsPanel
        versions={versions}
        onCreateVersion={createVersion}
        onRestoreVersion={restoreVersion}
        onCompareVersions={compareVersions}
      />
    </div>
  );
}

// === Страница коллабораций ===
function CollabsPage({ 
  token, 
  currentUser, 
  projects, 
  projectId,
  setProjectId 
}: { 
  token: string | null; 
  currentUser: User | null; 
  projects: Project[]; 
  projectId: number | null;
  setProjectId: any;
}) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  const fetchProjectCollaborators = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:4000/api/projects/${id}/collabs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch collaborators");
      const data = await res.json();
      setCollaborators(data);
    } catch (err) {
      console.error("Ошибка загрузки коллабораторов:", err);
      setCollaborators([]);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectCollaborators(projectId);
    }
  }, [projectId, token]);

  const inviteCollaborator = async (userId: number, role: "editor" | "viewer" | "owner") => {
    const res = await fetch(`http://localhost:4000/api/projects/${projectId}/collabs`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ userId, role }),
    });
    if (!res.ok) throw new Error("Failed to invite");
    await fetchProjectCollaborators(projectId!);
  };

  const removeCollaborator = async (userId: number) => {
    if (!confirm("Удалить участника из проекта?")) return;
    const res = await fetch(`http://localhost:4000/api/projects/${projectId}/collaborators/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to remove");
    await fetchProjectCollaborators(projectId!);
  };

  const changeRole = async (userId: number, role: "editor" | "viewer") => {
    const res = await fetch(`http://localhost:4000/api/projects/${projectId}/collaborators/${userId}/role`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error("Failed to change role");
    await fetchProjectCollaborators(projectId!);
  };

  if (!projectId) {
    return (
      <div className="text-center py-16">
        <FolderIcon className="w-24 h-24 mx-auto mb-4 text-gray-700" />
        <h3 className="text-2xl font-semibold text-gray-500 mb-2">Проект не выбран</h3>
        <p className="text-gray-600 mb-4">Выберите проект для управления участниками</p>
        <button onClick={() => setProjectId(null)} className="btn btn-primary">
          К списку проектов
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button onClick={() => setProjectId(null)} className="btn btn-secondary mb-4">
          ← Назад к проектам
        </button>
        <h2 className="text-2xl font-bold text-white">
          {projects.find(p => p.id === projectId)?.title || "Проект"}
        </h2>
        <p className="text-gray-400">Участники проекта</p>
      </div>
      
      <CollaborationPanel
        currentUserId={currentUser!.id}
        collaborators={collaborators}
        onInvite={inviteCollaborator}
        onRemove={removeCollaborator}
        onRoleChange={changeRole}
      />
    </div>
  );
}

// === Страница профиля ===
function ProfilePage({ 
  token, 
  currentUser, 
  setCurrentUser 
}: { 
  token: string | null; 
  currentUser: User | null; 
  setCurrentUser: any;
}) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const updateProfile = async (data: Partial<User>) => {
    const res = await fetch(`http://localhost:4000/api/users/${currentUser?.id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update profile");
    const updated = await res.json();
    setCurrentUser(updated);
    setIsEditingProfile(false);
  };

  if (!currentUser) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Ваш профиль</h2>
      
      {isEditingProfile ? (
        <ProfileEditForm
          user={currentUser}
          onSave={updateProfile}
          onCancel={() => setIsEditingProfile(false)}
        />
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <UserIcon className="w-6 h-6 text-purple-400" />
              Информация о профиле
            </h3>
            <button
              onClick={() => setIsEditingProfile(true)}
              className="btn btn-primary"
            >
              <PencilIcon className="w-4 h-4" />
              Редактировать
            </button>
          </div>
          
          <div className="flex items-center gap-6 mb-6">
            <Avatar username={currentUser.username} size="lg" url={currentUser.avatarUrl} />
            <div>
              <h4 className="text-2xl font-bold text-white">{currentUser.username}</h4>
              <p className="text-gray-400">{currentUser.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <SparklesIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Rebel Rank</span>
              </div>
              <p className="text-3xl font-bold text-white">{currentUser.rebelRank || 1}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <ClockIcon className="w-5 h-5" />
                <span className="text-sm font-medium">В проекте</span>
              </div>
              <p className="text-lg text-white">
                {currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('ru-RU') : '—'}
              </p>
            </div>
          </div>

          {currentUser.bio && (
            <div className="mt-6 pt-6 border-t border-gray-700/50">
              <h5 className="text-sm font-medium text-gray-300 mb-2">О себе</h5>
              <p className="text-gray-400">{currentUser.bio}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === Layout с навигацией ===
function MainLayout({ 
  children, 
  currentUser, 
  logout
}: { 
  children: React.ReactNode; 
  currentUser: User | null; 
  logout: () => void;
}) {
  return (
    <div className="min-h-screen gradient-bg">
      {/* Верхняя панель */}
      <header className="sticky top-0 z-50 glass-strong border-b border-gray-800/50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gradient">Distort Studio</h1>
                  <p className="text-xs text-gray-400">Добро пожаловать, {currentUser?.username}</p>
                </div>
              </div>
              
              {/* Навигация в навбаре */}
              <nav className="hidden md:flex items-center gap-2 ml-8">
                <a href="/" className="btn btn-sm btn-secondary">Проекты</a>
                <a href="/sessions" className="btn btn-sm btn-secondary">Сессии</a>
              </nav>
            </div>
            
            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <a href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar username={currentUser?.username || ""} url={currentUser?.avatarUrl} />
                <span className="text-sm text-gray-300 hidden lg:inline">{currentUser?.username}</span>
              </a>
              <button
                onClick={logout}
                className="btn btn-danger"
              >
                <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Основной контент */}
      <main className="max-w-[1800px] mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}

// === Главный компонент с роутингом ===
function App() {
  // Авторизация
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Данные
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [media, setMedia] = useState<UploadFile[]>([]);

  // === Проверка токена ===
  const checkToken = async (t: string | null) => {
    if (!t) return;
    try {
      const res = await fetch("http://localhost:4000/api/auth/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error("Token invalid");
      const data = await res.json();
      setCurrentUser(data);
    } catch {
      logout();
    }
  };

  const handleLogin = (t: string) => {
    localStorage.setItem("token", t);
    setToken(t);
    checkToken(t);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setCurrentUser(null);
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/projects", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          logout();
          return;
        }
        throw new Error(`Ошибка загрузки проектов: ${res.status}`);
      }
      
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setProjects([]);
    }
  };

  const fetchProjectMedia = async (id: number) => {
    try {
      const res = await fetch(
        `http://localhost:4000/api/projects/${id}/media`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Ошибка загрузки медиа");

      const data = await res.json();
      setMedia(data);
    } catch (err) {
      console.error(err);
      setMedia([]);
    }
  };

  // === Подписка на медиа выбранного проекта ===
  useEffect(() => {
    if (!projectId) {
      return;
    }

    socket.emit("join-project", projectId);
    fetchProjectMedia(projectId);

    const handleMediaAdded = (newMedia: UploadFile) => {
      // Проверяем, не добавили ли мы уже этот файл (чтобы избежать дубликатов)
      setMedia((prev: UploadFile[]) => {
        const exists = prev.some(m => m.filename === newMedia.filename);
        if (exists) return prev;
        return [newMedia, ...prev];
      });
    };

    socket.on("media:added", handleMediaAdded);

    return () => {
      socket.off("media:added", handleMediaAdded);
    };
  }, [projectId]);

  // === Загрузка начальных данных ===
  useEffect(() => {
    if (token) checkToken(token);

    Promise.all([fetchProjects()]).then(() =>
      setLoading(false)
    );

    socket.on("project:created", (project) => {
      setProjects((prev: Project[]) => [...prev, project]);
    });

    return () => {
      socket.off("project:created");
    };
  }, [token]);

  // === Загрузка ===
  if (loading)
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 animate-pulse">Загрузка Distort Studio...</p>
        </div>
      </div>
    );

  // === Если не авторизован - показываем лендинг ===
  if (!token || !currentUser) {
    return <LandingPage onLogin={handleLogin} />;
  }

  // === Основной интерфейс с роутингом ===
  return (
    <BrowserRouter>
      <MainLayout 
        currentUser={currentUser} 
        logout={logout}
      >
        <Routes>
          <Route 
            path="/" 
            element={
              <ProjectsPage 
                token={token}
                projects={projects}
                setProjects={setProjects}
                projectId={projectId}
                setProjectId={setProjectId}
                media={media}
                setMedia={setMedia}
              />
            } 
          />
          <Route 
            path="/versions" 
            element={
              <VersionsPage 
                token={token}
                projects={projects}
                projectId={projectId}
                setProjectId={setProjectId}
              />
            } 
          />
          <Route 
            path="/collabs" 
            element={
              <CollabsPage 
                token={token}
                currentUser={currentUser}
                projects={projects}
                projectId={projectId}
                setProjectId={setProjectId}
              />
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProfilePage 
                token={token}
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
              />
            } 
          />
          <Route 
            path="/sessions" 
            element={
              <SessionsPage 
                token={token}
                projects={projects}
              />
            } 
          />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

// === Страница сессий ===
function SessionsPage({ 
  token, 
  projects
}: { 
  token: string | null; 
  projects: Project[]; 
}) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [showStartModal, setShowStartModal] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const fetchMySessions = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/sessions/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error("Ошибка загрузки сессий:", err);
      setSessions([]);
    }
  };

  useEffect(() => {
    fetchMySessions();
  }, [token]);

  const startSession = async () => {
    if (!selectedProjectId || !startTime) {
      alert("Выберите проект и укажите время начала");
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/api/sessions`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          projectId: selectedProjectId, 
          startTime,
          endTime: endTime || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to start session");
      await fetchMySessions();
      setShowStartModal(false);
      setStartTime("");
      setEndTime("");
      setSelectedProjectId(null);
    } catch (err: any) {
      alert(err.message || "Ошибка создания сессии");
    }
  };

  const stopSession = async (sessionId: number) => {
    if (!confirm("Завершить эту сессию?")) return;
    try {
      const res = await fetch(`http://localhost:4000/api/sessions/${sessionId}/stop`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ endTime: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to stop session");
      await fetchMySessions();
    } catch (err: any) {
      alert(err.message || "Ошибка завершения сессии");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Мои сессии</h2>
          <p className="text-gray-400">История рабочих сессий</p>
        </div>
        <button onClick={() => setShowStartModal(true)} className="btn btn-primary">
          <ClockIcon className="w-4 h-4" />
          Начать сессию
        </button>
      </div>

      {/* Модальное окно начала сессии */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Начать сессию</h3>
            
            <label className="block text-sm text-gray-300 mb-1">Проект</label>
            <select
              className="input w-full mb-4"
              value={selectedProjectId || ""}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
            >
              <option value="">Выберите проект</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>

            <label className="block text-sm text-gray-300 mb-1">Время начала</label>
            <input
              type="datetime-local"
              className="input w-full mb-4"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />

            <label className="block text-sm text-gray-300 mb-1">Время окончания (опционально)</label>
            <input
              type="datetime-local"
              className="input w-full mb-4"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />

            <div className="flex gap-2">
              <button onClick={startSession} className="btn btn-primary flex-1">
                Начать
              </button>
              <button onClick={() => { setShowStartModal(false); setStartTime(""); setEndTime(""); setSelectedProjectId(null); }} className="btn btn-secondary">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список сессий */}
      {sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <ClockIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">{session.Project?.title || "Проект"}</h4>
                  <p className="text-sm text-gray-400">
                    {new Date(session.startTime).toLocaleString('ru-RU')}
                    {session.endTime && ` - ${new Date(session.endTime).toLocaleString('ru-RU')}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    Длительность: {Math.floor(session.durationSeconds / 60)} мин.
                  </p>
                </div>
              </div>
              {!session.endTime && (
                <button onClick={() => stopSession(session.id)} className="btn btn-danger">
                  Завершить
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 card">
          <ClockIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-lg mb-2">Нет сессий</p>
          <p className="text-gray-500 text-sm">Начните свою первую рабочую сессию</p>
        </div>
      )}
    </div>
  );
}

export default App;

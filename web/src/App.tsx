import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
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
  UserIcon,
  SwatchIcon,
  HomeIcon,
  CubeIcon,
  Cog6ToothIcon,
  BellIcon,
  SearchIcon,
  GridIcon,
  ListBulletIcon,
  HeartIcon,
  EyeIcon,
  ShareIcon,
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  FireIcon,
  TrophyIcon,
  CalendarIcon,
  LinkIcon,
  MapPinIcon,
  CameraIcon,
  XMarkIcon
} from "@heroicons/react/24/solid";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import UploadForm from "./UploadForm";
import ProfileEditForm from "./ProfileEditForm";
import CollaborationPanel from "./CollaborationPanel";
import VersionsPanel from "./VersionsPanel";
import ThemeSwitcher from "./ThemeSwitcher";
import { io } from "socket.io-client";
import "./styles/globals.css";

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
  onDelete 
}: { 
  project: Project; 
  isSelected: boolean; 
  onSelect: () => void; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
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
          <img
            src={`http://localhost:4000${media.thumbUrl || media.url}`}
            alt={media.originalName || "файл"}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="text-center p-4">
            <DocumentTextIcon className="w-12 h-12 text-purple-400 mx-auto mb-2" />
            <a
              href={`http://localhost:4000${media.url}`}
              target="_blank"
              rel="noopener noreferrer"
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
  currentUser, 
  projects, 
  setProjects, 
  projectId, 
  setProjectId,
  media,
  setMedia,
  setActiveTab
}: { 
  token: string | null; 
  currentUser: User | null; 
  projects: Project[]; 
  setProjects: any;
  projectId: number | null; 
  setProjectId: any;
  media: UploadFile[];
  setMedia: any;
  setActiveTab: any;
}) {
  const [newProject, setNewProject] = useState({ title: "", description: "" });
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);

  const addProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title) return;
    await fetch("http://localhost:4000/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: newProject.title,
        description: newProject.description,
        UserId: currentUser?.id || 1,
      }),
    });
    setNewProject({ title: "", description: "" });
    setShowNewProjectForm(false);
    setProjects((prev: Project[]) => [...prev, { ...newProject, id: Date.now(), UserId: currentUser?.id }]);
  };

  const deleteProject = async (id: number) => {
    await fetch(`http://localhost:4000/api/projects/${id}`, { method: "DELETE" });
    if (projectId === id) {
      setProjectId(null);
      setMedia([]);
    }
    setProjects((prev: Project[]) => prev.filter(p => p.id !== id));
  };

  const editProject = async (
    id: number,
    newTitle: string,
    newDescription: string
  ) => {
    await fetch(`http://localhost:4000/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, description: newDescription }),
    });
    setProjects((prev: Project[]) => prev.map(p => p.id === id ? { ...p, title: newTitle, description: newDescription } : p));
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
          <button 
            onClick={() => setShowNewProjectForm(!showNewProjectForm)}
            className="btn btn-primary btn-icon"
            data-tooltip="Новый проект"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
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
        <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              isSelected={projectId === p.id}
              onSelect={() => setProjectId(p.id)}
              onEdit={() => editProject(
                p.id,
                prompt("Новое название", p.title) || p.title,
                prompt("Описание", p.description) || p.description
              )}
              onDelete={() => {
                if (confirm(`Удалить проект "${p.title}"?`)) {
                  deleteProject(p.id);
                }
              }}
            />
          ))}
          
          {projects.length === 0 && (
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
                  onClick={() => setActiveTab("media")}
                  className={`btn flex-1 ${true ? "btn-primary" : "btn-secondary"}`}
                >
                  <PhotoIcon className="w-4 h-4" />
                  Медиа
                </button>
                <button
                  onClick={() => window.location.href = '/versions'}
                  className="btn btn-secondary flex-1"
                >
                  <FolderIcon className="w-4 h-4" />
                  Версии
                </button>
                <button
                  onClick={() => window.location.href = '/collabs'}
                  className="btn btn-secondary flex-1"
                >
                  <UserGroupIcon className="w-4 h-4" />
                  Коллабы
                </button>
                <button
                  onClick={() => window.location.href = '/profile'}
                  className="btn btn-secondary flex-1"
                >
                  <UserIcon className="w-4 h-4" />
                  Профиль
                </button>
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
function VersionsPage({ token, currentUser, projects, projectId, setProjectId }: { token: string | null; currentUser: User | null; projects: Project[]; projectId: number | null; setProjectId: any; }) {
  const [versions, setVersions] = useState<Version[]>([]);

  const fetchProjectVersions = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:4000/api/projects/${id}/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (err) {
      console.error("Ошибка загрузки версий:", err);
      setVersions([]);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectVersions(projectId);
    }
  }, [projectId]);

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
        <h2 className="text-2xl font-bold text-white">
          {projects.find(p => p.id === projectId)?.title || "Проект"}
        </h2>
        <p className="text-gray-400">Управление версиями проекта</p>
      </div>
      
      <VersionsPanel
        projectId={projectId}
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
      const res = await fetch(`http://localhost:4000/api/projects/${id}/collaborators`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data);
      }
    } catch (err) {
      console.error("Ошибка загрузки коллабораторов:", err);
      setCollaborators([]);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectCollaborators(projectId);
    }
  }, [projectId]);

  const inviteCollaborator = async (email: string, role: "editor" | "viewer") => {
    const res = await fetch(`http://localhost:4000/api/projects/${projectId}/invite`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ email, role }),
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
        projectId={projectId}
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
  logout,
  activeTab,
  setActiveTab,
  projectId,
  setProjectId
}: { 
  children: React.ReactNode; 
  currentUser: User | null; 
  logout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  projectId: number | null;
  setProjectId: (id: number | null) => void;
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
            </div>
            
            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <Avatar username={currentUser?.username || ""} url={currentUser?.avatarUrl} />
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
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(true);

  // Данные
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [media, setMedia] = useState<UploadFile[]>([]);
  const [activeTab, setActiveTab] = useState<"media" | "versions" | "collabs" | "profile">("media");

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
    const res = await fetch("http://localhost:4000/api/projects");
    const data = await res.json();
    setProjects(data);
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

  // === Если не авторизован ===
  if (!token || !currentUser) {
    return (
      <div className="min-h-screen gradient-bg flex flex-col justify-center py-12 px-4">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gradient mb-2">Distort Studio</h1>
          <p className="text-gray-400">Платформа для цифровых творцов</p>
        </div>
        
        {!showRegister ? (
          <>
            <LoginForm onLogin={handleLogin} />
            <p className="text-center mt-6 text-gray-400">
              Нет аккаунта?{" "}
              <button
                onClick={() => setShowRegister(true)}
                className="text-purple-400 hover:text-purple-300 underline decoration-purple-500/50"
              >
                Зарегистрироваться
              </button>
            </p>
          </>
        ) : (
          <>
            <RegisterForm />
            <p className="text-center mt-6 text-gray-400">
              Уже есть аккаунт?{" "}
              <button
                onClick={() => setShowRegister(false)}
                className="text-purple-400 hover:text-purple-300 underline decoration-purple-500/50"
              >
                Войти
              </button>
            </p>
          </>
        )}
      </div>
    );
  }

  // === Основной интерфейс с роутингом ===
  return (
    <BrowserRouter>
      <MainLayout 
        currentUser={currentUser} 
        logout={logout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projectId={projectId}
        setProjectId={setProjectId}
      >
        <Routes>
          <Route 
            path="/" 
            element={
              <ProjectsPage 
                token={token}
                currentUser={currentUser}
                projects={projects}
                setProjects={setProjects}
                projectId={projectId}
                setProjectId={setProjectId}
                media={media}
                setMedia={setMedia}
                setActiveTab={setActiveTab}
              />
            } 
          />
          <Route 
            path="/versions" 
            element={
              <VersionsPage 
                token={token}
                currentUser={currentUser}
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
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;

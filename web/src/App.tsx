import { useEffect, useState } from "react";
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
  ChevronRightIcon
} from "@heroicons/react/24/solid";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import UploadForm from "./UploadForm";
import { io } from "socket.io-client";
import "./styles/globals.css";

const socket = io("http://localhost:4000");

// === Типы ===
interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface Project {
  id: number;
  title: string;
  description: string;
  UserId: number;
}

interface UploadFile {
  filename?: string;
  originalName?: string;
  thumbUrl?: string;
  type: string;
  url: string;
}

// === Компонент аватара ===
function Avatar({ username, size = "md" }: { username: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-16 h-16" };
  const colors = ["from-purple-500 to-pink-500", "from-blue-500 to-cyan-500", "from-green-500 to-emerald-500"];
  const colorIndex = username.length % colors.length;
  
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-bold shadow-lg`}>
      {username.charAt(0).toUpperCase()}
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

// === Главный компонент ===
function App() {
  // Авторизация
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  // Данные
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Текущее состояние проекта и его медиа
  const [projectId, setProjectId] = useState<number | null>(null);
  const [media, setMedia] = useState<UploadFile[]>([]);

  // Новые данные для форм
  const [newUser, setNewUser] = useState({ username: "", email: "" });
  const [newProject, setNewProject] = useState({ title: "", description: "" });
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);

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

  // === Получение данных ===
  const fetchUsers = async () => {
    const res = await fetch("http://localhost:4000/api/users");
    const data = await res.json();
    setUsers(data);
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

  const fetchProjects = async () => {
    const res = await fetch("http://localhost:4000/api/projects");
    const data = await res.json();
    setProjects(data);
  };

  // === Подписка на медиа выбранного проекта ===
  useEffect(() => {
    if (!projectId) return;

    socket.emit("join-project", projectId);
    fetchProjectMedia(projectId);

    const handleMediaAdded = (newMedia: UploadFile) => {
      setMedia((prev) => [newMedia, ...prev]);
    };

    socket.on("media:added", handleMediaAdded);

    return () => {
      socket.off("media:added", handleMediaAdded);
    };
  }, [projectId]);

  // === Загрузка начальных данных ===
  useEffect(() => {
    if (token) checkToken(token);

    Promise.all([fetchUsers(), fetchProjects()]).then(() =>
      setLoading(false)
    );

    socket.on("project:created", (project) => {
      setProjects((prev) => [...prev, project]);
    });

    return () => {
      socket.off("project:created");
    };
  }, [token]);

  // === Добавление пользователя ===
  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.email) return;
    await fetch("http://localhost:4000/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newUser),
    });
    setNewUser({ username: "", email: "" });
    fetchUsers();
  };

  // === Добавление проекта ===
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
    fetchProjects();
  };

  const deleteProject = async (id: number) => {
    await fetch(`http://localhost:4000/api/projects/${id}`, { method: "DELETE" });
    if (projectId === id) {
      setProjectId(null);
      setMedia([]);
    }
    fetchProjects();
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
    fetchProjects();
  };

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

  // === Основной интерфейс ===
  return (
    <div className="min-h-screen gradient-bg">
      {/* === Верхняя панель === */}
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
                  <p className="text-xs text-gray-400">Добро пожаловать, {currentUser.username}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Avatar username={currentUser.username} />
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

      {/* === Основной контент === */}
      <main className="max-w-[1800px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* === Левая колонка - Проекты === */}
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

          {/* === Правая колонка - Медиа === */}
          <div className="lg:col-span-8 xl:col-span-9">
            {projectId ? (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <PhotoIcon className="w-6 h-6 text-purple-400" />
                    Медиа проекта
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <ClockIcon className="w-4 h-4" />
                    {media.length} файлов
                  </div>
                </div>
                
                <div className="card mb-6">
                  <UploadForm 
                    projectId={projectId} 
                    onUploaded={(mediaItem) => { 
                      setMedia((prev) => [mediaItem, ...prev]); 
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

        {/* === Разделитель === */}
        <div className="divider my-8" />

        {/* === Секция пользователей === */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <UserGroupIcon className="w-6 h-6 text-purple-400" />
            Пользователи
          </h2>
          
          <form onSubmit={addUser} className="card mb-4">
            <div className="flex gap-3">
              <input
                className="input flex-1"
                placeholder="Имя пользователя"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              />
              <input
                className="input flex-1"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
              <button type="submit" className="btn btn-primary">
                <PlusIcon className="w-4 h-4" />
                Добавить
              </button>
            </div>
          </form>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="card flex items-center gap-3 group hover:border-purple-500/30 transition-all"
              >
                <Avatar username={u.username} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{u.username}</p>
                  <p className="text-sm text-gray-400 truncate">{u.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

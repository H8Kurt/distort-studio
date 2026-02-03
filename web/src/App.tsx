import { useEffect, useState } from "react";
import { TrashIcon, PencilIcon } from "@heroicons/react/24/solid";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import UploadForm from "./UploadForm";
import { io } from "socket.io-client";

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
  name?: string;
  url: string;
  thumb?: string;
}

// === Компонент ===
function App() {
  // Авторизация
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );
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
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
  });

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
 // Подгрузка медиа выбранного проекта
useEffect(() => {
  if (!projectId) return;

  // Соединяемся с сокетом
  socket.emit("join-project", projectId);

  // Загружаем существующие медиа
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
    fetchProjects();
  };

 const uploadToProject = async (file: File) => {
  if (!projectId) return alert("Проект не выбран");

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(
    `http://localhost:4000/api/projects/${projectId}/media`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: fd,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  const media = await res.json();
  setMedia((prev) => [media, ...prev]);
};


  // === Удаление / редактирование ===
  const deleteUser = async (id: number) => {
    await fetch(`http://localhost:4000/api/users/${id}`, { method: "DELETE" });
    fetchUsers();
  };

  const deleteProject = async (id: number) => {
    await fetch(`http://localhost:4000/api/projects/${id}`, { method: "DELETE" });
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
      <div className="text-center text-white mt-20 text-2xl">Загрузка...</div>
    );

  // === Если не авторизован ===
  if (!token || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col justify-center">
        {!showRegister ? (
          <>
            <LoginForm onLogin={handleLogin} />
            <p className="text-center mt-4">
              Нет аккаунта?{" "}
              <button
                onClick={() => setShowRegister(true)}
                className="text-purple-400 underline"
              >
                Зарегистрироваться
              </button>
            </p>
          </>
        ) : (
          <>
            <RegisterForm />
            <p className="text-center mt-4">
              Уже есть аккаунт?{" "}
              <button
                onClick={() => setShowRegister(false)}
                className="text-purple-400 underline"
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
    <div className="min-h-screen bg-gray-950 text-white p-8">
      {/* === Верхняя панель === */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-purple-400">
          Distort Studio — привет, {currentUser.username}
        </h1>
        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
        >
          Выйти
        </button>
      </div>

      {/* === Пользователи === */}
      <h2 className="text-2xl font-semibold mb-3 text-white">Пользователи</h2>
      <form onSubmit={addUser} className="mb-6 flex gap-2">
        <input
          className="bg-gray-800 p-2 rounded text-white flex-1"
          placeholder="Имя пользователя"
          value={newUser.username}
          onChange={(e) =>
            setNewUser({ ...newUser, username: e.target.value })
          }
        />
        <input
          className="bg-gray-800 p-2 rounded text-white flex-1"
          placeholder="Email"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
        />
        <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded">
          Добавить
        </button>
      </form>

      <ul className="space-y-2 mb-10">
        {users.map((u) => (
          <li
            key={u.id}
            className="bg-gray-800 p-3 rounded-lg flex justify-between items-center"
          >
            <span>
              {u.username} — {u.email}
            </span>
            <TrashIcon
              className="w-5 h-5 text-red-500 cursor-pointer hover:scale-110"
              onClick={() => deleteUser(u.id)}
            />
          </li>
        ))}
      </ul>

      {/* === Проекты === */}
      <h2 className="text-2xl font-semibold mb-3 text-white">Проекты</h2>
      <form onSubmit={addProject} className="mb-6 flex gap-2">
        <input
          className="bg-gray-800 p-2 rounded text-white flex-1"
          placeholder="Название проекта"
          value={newProject.title}
          onChange={(e) =>
            setNewProject({ ...newProject, title: e.target.value })
          }
        />
        <input
          className="bg-gray-800 p-2 rounded text-white flex-1"
          placeholder="Описание"
          value={newProject.description}
          onChange={(e) =>
            setNewProject({ ...newProject, description: e.target.value })
          }
        />
        <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">
          Добавить проект
        </button>
      </form>

      <ul className="space-y-2 mb-10">
        {projects.map((p) => (
          <li
            key={p.id}
            className={`bg-gray-800 p-3 rounded-lg flex justify-between items-center cursor-pointer ${
              projectId === p.id ? "border-2 border-purple-400" : ""
            }`}
            onClick={() => setProjectId(p.id)}
          >
            <div>
              <b className="text-lg text-purple-400">{p.title}</b>
              {p.description && (
                <p className="text-gray-400 text-sm mt-1">{p.description}</p>
              )}
            </div>
            <div className="flex space-x-2">
              <PencilIcon
                className="w-5 h-5 text-yellow-400 cursor-pointer hover:scale-110"
                onClick={(e) => {
                  e.stopPropagation();
                  editProject(
                    p.id,
                    prompt("Новое имя", p.title) || p.title,
                    prompt("Описание", p.description) || p.description
                  );
                }}
              />
              <TrashIcon
                className="w-5 h-5 text-red-500 cursor-pointer hover:scale-110"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteProject(p.id);
                }}
              />
            </div>
          </li>
        ))}
      </ul>

     {/* === Медиа выбранного проекта === */}
{projectId && (
  <div className="mt-10">
    <h2 className="text-2xl font-semibold mb-4 text-white">
      Медиа проекта
    </h2>
    <UploadForm projectId={projectId} onUploaded={uploadToProject} />
 <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
  {media.map((u, i) => (
    <div key={i} className="bg-gray-800 p-2 rounded-lg text-center">
      {u.type === "image" ? (
        <img
          src={`http://localhost:4000${u.thumbUrl || u.url}`} // берём thumb если есть
          alt={u.originalName || "файл"}
          className="rounded shadow-lg mx-auto w-32 h-32 object-cover"
        />
      ) : (
        <a
          href={`http://localhost:4000${u.url}`}
          target="_blank"
          className="text-purple-400 underline"
        >
          {u.originalName || "Скачать файл"}
        </a>
      )}
    </div>
  ))}
</div>
  </div>
)}
    </div>
  );
}

export default App;

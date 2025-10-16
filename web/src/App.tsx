import { useEffect, useState } from "react";
import { TrashIcon, PencilIcon } from "@heroicons/react/24/solid";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import UploadForm from "./UploadForm";

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

// === Компонент ===
function App() {
  // Авторизация
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  // Данные
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Новые данные для форм
  const [newUser, setNewUser] = useState({ username: "", email: "" });
  const [newProject, setNewProject] = useState({ title: "", description: "" });

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

  const fetchProjects = async () => {
    const res = await fetch("http://localhost:4000/api/projects");
    const data = await res.json();
    setProjects(data);
  };

  useEffect(() => {
    if (token) checkToken(token);
    Promise.all([fetchUsers(), fetchProjects()]).then(() => setLoading(false));
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
    fetchProjects();
  };

  // === Удаление / редактирование ===
  const deleteUser = async (id: number) => {
    await fetch(`http://localhost:4000/api/users/${id}`, {
      method: "DELETE",
    });
    fetchUsers();
  };

  const deleteProject = async (id: number) => {
    await fetch(`http://localhost:4000/api/projects/${id}`, {
      method: "DELETE",
    });
    fetchProjects();
  };

  const editProject = async (id: number, newTitle: string, newDescription: string) => {
    await fetch(`http://localhost:4000/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, description: newDescription }),
    });
    fetchProjects();
  };

  // === Загрузка ===
  if (loading)
    return <div className="text-center text-white mt-20 text-2xl">Загрузка...</div>;

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

  // === Если вошёл ===
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
          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
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
            <span>{u.username} — {u.email}</span>
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
          onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
        />
        <input
          className="bg-gray-800 p-2 rounded text-white flex-1"
          placeholder="Описание"
          value={newProject.description}
          onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
        />
        <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">
          Добавить проект
        </button>
      </form>

      <ul className="space-y-2">
        {projects.map((p) => (
          <li
            key={p.id}
            className="bg-gray-800 p-3 rounded-lg flex justify-between items-center"
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
                onClick={() =>
                  editProject(
                    p.id,
                    prompt("Новое имя", p.title) || p.title,
                    prompt("Описание", p.description) || p.description
                  )
                }
              />
              <TrashIcon
                className="w-5 h-5 text-red-500 cursor-pointer hover:scale-110"
                onClick={() => deleteProject(p.id)}
              />
            </div>
          </li>
        ))}
      </ul>

      {/* === Загрузка файлов === */}
      <div className="mt-10">
        <h2 className="text-2xl font-semibold mb-4 text-white">Загрузка файлов</h2>
        <UploadForm onUploaded={(m) => setUploads((prev) => [...prev, m])} />
        {uploads.length > 0 && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {uploads.map((u, i) => (
              <img
                key={i}
                src={`http://localhost:4000${u.thumb || u.url}`}
                className="rounded shadow-lg"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

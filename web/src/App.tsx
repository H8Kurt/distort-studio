import { useEffect, useState } from "react";

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

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // поля для пользователя
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  // поля для проекта
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // ===========================
  // Загрузка пользователей и проектов
  // ===========================
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
    fetchUsers();
    fetchProjects();
  }, []);

  // ===========================
  // Добавить пользователя
  // ===========================
  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("http://localhost:4000/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email }),
    });
    setUsername("");
    setEmail("");
    fetchUsers();
  };

  // ===========================
  // Добавить проект
  // ===========================
  const addProject = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("http://localhost:4000/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        UserId: 1, // временно привязываем к первому пользователю
      }),
    });
    setTitle("");
    setDescription("");
    fetchProjects();
  };

  // ===========================
  // Отображение
  // ===========================
  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold text-purple-600 mb-6">
        Distort Studio Dashboard
      </h1>

      {/* === Добавление пользователя === */}
      <form onSubmit={addUser} className="mb-8 space-x-2">
        <input
          className="border border-gray-400 p-2 rounded"
          type="text"
          placeholder="Имя"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="border border-gray-400 p-2 rounded"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          type="submit"
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          Добавить пользователя
        </button>
      </form>

      {/* === Список пользователей === */}
      <h2 className="text-2xl font-semibold mb-3 text-white">Пользователи</h2>
      <ul className="space-y-2 mb-10">
        {users.map((u) => (
          <li key={u.id} className="bg-gray-800 text-white p-2 rounded-md">
            {u.username} — {u.email}
          </li>
        ))}
      </ul>

      {/* === Добавление проекта === */}
      <form onSubmit={addProject} className="mb-8 space-x-2">
        <input
          className="border border-gray-400 p-2 rounded w-60"
          type="text"
          placeholder="Название проекта"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          className="border border-gray-400 p-2 rounded w-80"
          type="text"
          placeholder="Описание"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Добавить проект
        </button>
      </form>

      {/* === Список проектов === */}
      <h2 className="text-2xl font-semibold mb-3 text-white">Проекты</h2>
      <ul className="space-y-2">
        {projects.length > 0 ? (
          projects.map((p) => (
            <li key={p.id} className="bg-gray-700 text-white p-2 rounded-md">
              <b>{p.title}</b>
              {p.description && (
                <span className="text-gray-300"> — {p.description}</span>
              )}
            </li>
          ))
        ) : (
          <p className="text-gray-400">Пока нет проектов 😴</p>
        )}
      </ul>
    </div>
  );
}

export default App;

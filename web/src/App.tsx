import { useEffect, useState } from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/solid";

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
const [loading, setLoading] = useState(true);

useEffect(() => {
  Promise.all([fetchUsers(), fetchProjects()]).then(() => setLoading(false));
}, []);

if (loading) {
  return <div className="text-center text-white mt-20 text-2xl">Загрузка...</div>;
}

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
  const deleteUser = async (id: number) => {
    await fetch(`http://localhost:4000/api/users/${id}`, {
      method: "DELETE",
    });
    fetchUsers(); // обновляем список
  };

  const deleteProject = async (id: number) => {
    await fetch(`http://localhost:4000/api/projects/${id}`, {
      method: "DELETE",
    });
    fetchProjects(); // обновляем список
  };
const editProject = async (id: number, newTitle: string, newDescription: string) => {
  await fetch(`http://localhost:4000/api/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: newTitle, description: newDescription }),
  });
  fetchProjects();
};

  // ===========================
  // Отображение
  // ===========================
  return (
    <div className="p-8 text-center">
     <h1 className="text-4xl font-extrabold text-purple-500 mb-8">
  Distort Studio Dashboard 🎨
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
          <li key={u.id}  className="bg-gray-900 border border-gray-700 text-white p-4 rounded-xl flex justify-between items-center">
            {u.username} — {u.email}
          </li>
        ))}
      </ul>
      <div className="flex space-x-2">

</div>

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
  {projects.map((p) => (
    <li
      key={p.id}
      className="bg-gray-800 border border-gray-700 text-white p-3 rounded-lg flex justify-between items-center"
    >
      {/* Левая часть — инфо о проекте */}
      <div>
        <b className="text-lg text-purple-400">{p.title}</b>
        {p.description && (
          <p className="text-gray-400 text-sm mt-1">{p.description}</p>
        )}
      </div>

      {/* Правая часть — иконка удаления */}
      <TrashIcon
        className="w-5 h-5 text-red-500 cursor-pointer hover:scale-110 transition"
        onClick={() => deleteProject(p.id)}
        title="Удалить проект"
      />
      <PencilIcon
  className="w-5 h-5 text-yellow-400 cursor-pointer hover:scale-110"
  onClick={() => editProject(p.id, prompt("Новое имя", p.title) || p.title, prompt("Описание", p.description) || p.description)}
/>
    </li>
  ))}
</ul>


    </div>
  );
}

export default App;

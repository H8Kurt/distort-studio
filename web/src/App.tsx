import { useEffect, useState } from "react";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  // Загружаем список пользователей
  const fetchUsers = async () => {
    const res = await fetch("http://localhost:4000/api/users");
    const data = await res.json();
    setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Добавляем пользователя
  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("http://localhost:4000/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email }),
    });
    setUsername("");
    setEmail("");
    fetchUsers(); // обновляем список
  };

  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold text-purple-600 mb-4">
        Distort Studio Users
      </h1>

      <form onSubmit={addUser} className="mb-6 space-x-2">
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
          Добавить
        </button>
      </form>

      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id} className="bg-gray-800 text-white p-2 rounded-md">
            {u.username} — {u.email}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;

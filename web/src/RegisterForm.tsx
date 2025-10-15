import { useState } from "react";

export default function RegisterForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("http://localhost:4000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка регистрации");
      setMessage("Регистрация успешна! Теперь войдите.");
      setUsername("");
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Ошибка регистрации");
    }
  };

  return (
    <form onSubmit={handleRegister} className="max-w-md mx-auto p-4 bg-gray-900 rounded-lg shadow-md mt-6">
      <h3 className="text-2xl font-semibold mb-4 text-white text-center">Регистрация</h3>
      <input
        className="w-full mb-3 p-2 rounded bg-gray-800 text-white"
        placeholder="Имя пользователя"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <input
        className="w-full mb-3 p-2 rounded bg-gray-800 text-white"
        placeholder="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="w-full mb-3 p-2 rounded bg-gray-800 text-white"
        placeholder="Пароль"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <div className="text-red-400 mb-2 text-center">{error}</div>}
      {message && <div className="text-green-400 mb-2 text-center">{message}</div>}
      <button
        type="submit"
        className="bg-purple-600 hover:bg-purple-700 w-full py-2 rounded text-white transition"
      >
        Зарегистрироваться
      </button>
    </form>
  );
}

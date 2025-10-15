import { useState } from "react";

export default function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка входа");
      localStorage.setItem("token", data.token);
      onLogin(data.token);
    } catch (err: any) {
      setError(err.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 bg-gray-900 rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold mb-4 text-white text-center">Вход</h3>
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
      <button
        type="submit"
        disabled={loading}
        className="bg-purple-600 hover:bg-purple-700 w-full py-2 rounded text-white transition"
      >
        {loading ? "Вхожу..." : "Войти"}
      </button>
    </form>
  );
}

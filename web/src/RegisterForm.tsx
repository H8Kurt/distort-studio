import { useState, type FormEvent } from "react";
import { api, setTokens } from "./lib/api";
import type { User } from "./types";

interface RegisterFormProps {
  onAuthenticated: (user: User) => void;
}

interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export default function RegisterForm({ onAuthenticated }: RegisterFormProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post<AuthResponse>("/api/auth/register", {
        username,
        email,
        password,
      });
      setTokens(data.token, data.refreshToken);
      onAuthenticated(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <h2 style={{ fontSize: "1.3rem" }}>Создать аккаунт</h2>
        <p className="text-text-secondary" style={{ fontSize: "0.85rem" }}>Присоединяйтесь к Distort Studio</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="reg-username">Имя пользователя</label>
        <input
          id="reg-username"
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="producer_01"
          minLength={3}
          required
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="reg-email">Email</label>
        <input
          id="reg-email"
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="reg-password">Пароль</label>
        <input
          id="reg-password"
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Минимум 8 символов, буквы и цифры"
          minLength={8}
          required
        />
      </div>

      {error && <div className="badge badge-warning" style={{ alignSelf: "flex-start" }}>{error}</div>}

      <button className="btn btn-primary btn-lg w-full" disabled={loading}>
        {loading ? "Создаём…" : "Зарегистрироваться"}
      </button>
    </form>
  );
}

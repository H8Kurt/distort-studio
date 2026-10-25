import { useEffect, useState, type FormEvent } from "react";
import { api, setTokens } from "./lib/api";
import type { User } from "./types";

interface LoginFormProps {
  onAuthenticated: (user: User) => void;
}

interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

type View = "login" | "forgot" | "reset";

export default function LoginForm({ onAuthenticated }: LoginFormProps) {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const [resetToken, setResetToken] = useState("");
  const [resetPw, setResetPw] = useState("");
  const [resetPw2, setResetPw2] = useState("");

  const [devLink, setDevLink] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reset = params.get("reset");
    if (reset) {
      setResetToken(reset);
      setView("reset");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post<AuthResponse>("/api/auth/login", { email, password });
      setTokens(data.token, data.refreshToken);
      onAuthenticated(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setDevLink("");
    setLoading(true);
    try {
      const res = await api.post<{ message: string; devResetLink?: string }>(
        "/api/auth/forgot-password",
        { email }
      );
      setNotice(res.message);
      if (res.devResetLink) setDevLink(res.devResetLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка запроса");
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (resetPw !== resetPw2) {
      setError("Пароли не совпадают");
      return;
    }
    if (resetPw.length < 8 || !/[A-Za-z]/.test(resetPw) || !/[0-9]/.test(resetPw)) {
      setError("Пароль: минимум 8 символов, буквы и цифры");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token: resetToken, password: resetPw });
      setView("login");
      setNotice("Пароль обновлён. Войдите с новым паролем.");
      setResetPw("");
      setResetPw2("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сбросить пароль");
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = () => {
    setView("login");
    setError("");
    setNotice("");
    setDevLink("");
  };

  const header = (title: string, subtitle: string) => (
    <div>
      <h2 style={{ fontSize: "1.3rem" }}>{title}</h2>
      <p className="text-text-secondary" style={{ fontSize: "0.85rem" }}>{subtitle}</p>
    </div>
  );

  if (view === "forgot") {
    return (
      <form onSubmit={submitForgot} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {header("Сброс пароля", "Укажите почту — пришлём ссылку для сброса")}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        {notice && <div className="badge badge-success" style={{ alignSelf: "flex-start" }}>{notice}</div>}
        {devLink && (
          <a className="text-accent-primary" style={{ fontSize: "0.82rem", wordBreak: "break-all" }} href={devLink}>
            Ссылка для сброса (dev): {devLink}
          </a>
        )}
        {error && <div className="badge badge-warning" style={{ alignSelf: "flex-start" }}>{error}</div>}
        <button className="btn btn-primary btn-lg w-full" disabled={loading}>
          {loading ? "Отправляем…" : "Отправить ссылку"}
        </button>
        <button type="button" className="btn btn-ghost w-full" onClick={backToLogin}>
          Назад ко входу
        </button>
      </form>
    );
  }

  if (view === "reset") {
    return (
      <form onSubmit={submitReset} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {header("Новый пароль", "Придумайте новый пароль для аккаунта")}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="reset-pw">Новый пароль</label>
          <input
            id="reset-pw"
            className="input"
            type="password"
            value={resetPw}
            onChange={(e) => setResetPw(e.target.value)}
            placeholder="Минимум 8 символов, буквы и цифры"
            minLength={8}
            required
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="reset-pw2">Повторите пароль</label>
          <input
            id="reset-pw2"
            className="input"
            type="password"
            value={resetPw2}
            onChange={(e) => setResetPw2(e.target.value)}
            minLength={8}
            required
          />
        </div>
        {error && <div className="badge badge-warning" style={{ alignSelf: "flex-start" }}>{error}</div>}
        <button className="btn btn-primary btn-lg w-full" disabled={loading}>
          {loading ? "Сохраняем…" : "Сохранить пароль"}
        </button>
        <button type="button" className="btn btn-ghost w-full" onClick={backToLogin}>
          Назад ко входу
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {header("С возвращением", "Войдите, чтобы продолжить работу")}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label htmlFor="login-password">Пароль</label>
          <button
            type="button"
            className="text-accent-primary"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", padding: 0 }}
            onClick={() => {
              setNotice("");
              setError("");
              setView("forgot");
            }}
          >
            Забыли пароль?
          </button>
        </div>
        <input
          id="login-password"
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>

      {notice && <div className="badge badge-success" style={{ alignSelf: "flex-start" }}>{notice}</div>}
      {error && <div className="badge badge-warning" style={{ alignSelf: "flex-start" }}>{error}</div>}

      <button className="btn btn-primary btn-lg w-full" disabled={loading}>
        {loading ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}

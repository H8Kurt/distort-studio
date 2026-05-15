import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { io } from "socket.io-client";
import LandingPage from "./LandingPage";
import MainLayout from "./components/layout/MainLayout";
import ProjectsPage from "./pages/ProjectsPage";
import VersionsPage from "./pages/VersionsPage";
import CollabsPage from "./pages/CollabsPage";
import ProfilePage from "./pages/ProfilePage";
import SessionsPage from "./pages/SessionsPage";
import type { User, Project, UploadFile } from "./types";
import "./styles/globals.css";

const socket = io("http://localhost:4000");

function App() {
  // Авторизация
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Данные
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [media, setMedia] = useState<UploadFile[]>([]);

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

  const fetchProjects = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/projects", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        if (res.status === 401) {
          logout();
          return;
        }
        throw new Error(`Ошибка загрузки проектов: ${res.status}`);
      }

      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setProjects([]);
    }
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

  // === Подписка на медиа выбранного проекта ===
  useEffect(() => {
    if (!projectId) {
      return;
    }

    socket.emit("join-project", projectId);
    fetchProjectMedia(projectId);

    const handleMediaAdded = (newMedia: UploadFile) => {
      // Проверяем, не добавили ли мы уже этот файл (чтобы избежать дубликатов)
      setMedia((prev: UploadFile[]) => {
        const exists = prev.some(m => m.filename === newMedia.filename);
        if (exists) return prev;
        return [newMedia, ...prev];
      });
    };

    socket.on("media:added", handleMediaAdded);

    return () => {
      socket.off("media:added", handleMediaAdded);
    };
  }, [projectId]);

  // === Загрузка начальных данных ===
  useEffect(() => {
    if (token) checkToken(token);

    Promise.all([fetchProjects()]).then(() =>
      setLoading(false)
    );

    socket.on("project:created", (project) => {
      setProjects((prev: Project[]) => [...prev, project]);
    });

    return () => {
      socket.off("project:created");
    };
  }, [token]);

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

  // === Если не авторизован - показываем лендинг ===
  if (!token || !currentUser) {
    return <LandingPage onLogin={handleLogin} />;
  }

  // === Основной интерфейс с роутингом ===
  return (
    <BrowserRouter>
      <MainLayout
        currentUser={currentUser}
        logout={logout}
      >
        <Routes>
          <Route
            path="/"
            element={
              <ProjectsPage
                token={token}
                currentUser={currentUser}
                projects={projects}
                setProjects={setProjects}
                projectId={projectId}
                setProjectId={setProjectId}
                media={media}
                setMedia={setMedia}
              />
            }
          />
          <Route
            path="/versions"
            element={
              <VersionsPage
                token={token}
                projects={projects}
                projectId={projectId}
                setProjectId={setProjectId}
              />
            }
          />
          <Route
            path="/collabs"
            element={
              <CollabsPage
                token={token}
                currentUser={currentUser}
                projects={projects}
                projectId={projectId}
                setProjectId={setProjectId}
              />
            }
          />
          <Route
            path="/profile"
            element={
              <ProfilePage
                token={token}
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
              />
            }
          />
          <Route
            path="/sessions"
            element={
              <SessionsPage
                token={token}
                projects={projects}
              />
            }
          />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;

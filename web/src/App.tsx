import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./LandingPage";
import MainLayout from "./components/layout/MainLayout";
import FeedPage from "./pages/FeedPage";
import DiscoverPage from "./pages/DiscoverPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProfilePage from "./pages/ProfilePage";
import UserProfilePage from "./pages/UserProfilePage";
import MarketplacePage from "./pages/MarketplacePage";
import FriendsPage from "./pages/FriendsPage";
import ChatPage from "./pages/ChatPage";
import LibraryPage from "./pages/LibraryPage";
import RoomsPage from "./pages/RoomsPage";
import RoomPage from "./pages/RoomPage";
import ChallengesPage from "./pages/ChallengesPage";
import ChallengePage from "./pages/ChallengePage";
import AdminModerationPage from "./pages/AdminModerationPage";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminContentPage from "./pages/admin/AdminContentPage";
import AdminChallengesPage from "./pages/admin/AdminChallengesPage";
import AdminAnnouncementsPage from "./pages/admin/AdminAnnouncementsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import ProjectWorkspacePage from "./pages/project/ProjectWorkspacePage";
import AuthNotice, { type AuthNoticeData } from "./components/ui/AuthNotice";
import type { Project, SiteSettings, User } from "./types";
import {
  api,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getSocket,
  resetSocket,
} from "./lib/api";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [authNotice, setAuthNotice] = useState<AuthNoticeData | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const logout = () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      api.post("/api/auth/logout", { refreshToken }).catch(() => undefined);
    }
    clearTokens();
    resetSocket();
    setCurrentUser(null);
    setProjects([]);
  };

  const fetchProjects = async () => {
    try {
      const data = await api.get<Project[]>("/api/projects");
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    }
  };

  const handleAuthenticated = (user: User) => {
    setCurrentUser(user);
    fetchProjects();
  };

  // Обработка ссылки подтверждения почты (?verify=...) — работает и для залогиненных
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verify = params.get("verify");
    if (!verify) return;
    window.history.replaceState({}, "", window.location.pathname);
    api
      .post("/api/auth/verify-email", { token: verify })
      .then(async () => {
        if (getAccessToken()) {
          try {
            const user = await api.get<User>("/api/auth/me");
            setCurrentUser(user);
          } catch {
            /* ignore */
          }
        }
        setAuthNotice({ type: "success", text: "Почта подтверждена" });
      })
      .catch((err) => {
        setAuthNotice({
          type: "error",
          text: err instanceof Error ? err.message : "Не удалось подтвердить почту",
        });
      });
  }, []);

  // Проверка токена при старте
  useEffect(() => {
    let active = true;
    (async () => {
      if (getAccessToken()) {
        try {
          const user = await api.get<User>("/api/auth/me");
          if (active) setCurrentUser(user);
        } catch {
          clearTokens();
        }
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Загрузка проектов после входа
  useEffect(() => {
    if (!currentUser) return;
    fetchProjects();
    const socket = getSocket();
    const onCreated = (project: Project) => {
      setProjects((prev) => (prev.some((p) => p.id === project.id) ? prev : [project, ...prev]));
    };
    socket.on("project:created", onCreated);
    socket.on("project:updated", fetchProjects);
    socket.on("project:deleted", fetchProjects);
    return () => {
      socket.off("project:created", onCreated);
      socket.off("project:updated", fetchProjects);
      socket.off("project:deleted", fetchProjects);
    };
  }, [currentUser]);

  // Публичные настройки сайта (техрежим, баннер, витрина)
  useEffect(() => {
    api
      .get<SiteSettings>("/api/settings/public")
      .then(setSiteSettings)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const socket = getSocket();
    const onSettings = () => {
      api.get<SiteSettings>("/api/settings/public").then(setSiteSettings).catch(() => undefined);
    };
    socket.on("settings:changed", onSettings);
    return () => {
      socket.off("settings:changed", onSettings);
    };
  }, [currentUser]);

  const noticeEl = <AuthNotice notice={authNotice} onClose={() => setAuthNotice(null)} />;

  if (loading) {
    return (
      <>
        {noticeEl}
        <div className="gradient-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div className="brand-logo" style={{ margin: "0 auto 1rem", width: 52, height: 52, fontSize: 22 }}>D</div>
            <p className="text-text-secondary">Загрузка Distort Studio…</p>
          </div>
        </div>
      </>
    );
  }

  const isAdmin = currentUser?.role === "admin";
  const maintenanceOn = siteSettings?.maintenance?.enabled ?? false;
  if (maintenanceOn && !isAdmin) {
    if (!currentUser && showAdminLogin) {
      return (
        <>
          {noticeEl}
          <LandingPage onAuthenticated={handleAuthenticated} />
        </>
      );
    }
    return (
      <>
        {noticeEl}
        <div className="maintenance-screen gradient-bg">
          <div className="brand-logo">D</div>
          <h1 className="page-title">Техническое обслуживание</h1>
          <p className="text-text-secondary" style={{ maxWidth: 420 }}>
            Скоро вернёмся — мы обновляем Distort Studio.
          </p>
          {!currentUser ? (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAdminLogin(true)}>
              Вход для администратора
            </button>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={logout}>
              Выйти
            </button>
          )}
        </div>
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        {noticeEl}
        <LandingPage onAuthenticated={handleAuthenticated} />
      </>
    );
  }

  return (
    <BrowserRouter>
      {noticeEl}
      <MainLayout
        currentUser={currentUser}
        projects={projects}
        logout={logout}
        announcement={siteSettings?.announcement ?? null}
        maintenance={maintenanceOn}
      >
        <Routes>
          <Route path="/" element={<FeedPage currentUser={currentUser} />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route
            path="/projects"
            element={
              <ProjectsPage
                projects={projects}
                setProjects={setProjects}
                refreshProjects={fetchProjects}
              />
            }
          />
          <Route
            path="/projects/:id/:tab?"
            element={
              <ProjectWorkspacePage
                currentUser={currentUser}
                projects={projects}
                refreshProjects={fetchProjects}
              />
            }
          />
          <Route path="/profile" element={<ProfilePage currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
          <Route path="/u/:id" element={<UserProfilePage currentUserId={currentUser.id} />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/music" element={<LibraryPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/rooms/:id" element={<RoomPage currentUser={currentUser} />} />
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route path="/challenges/:id" element={<ChallengePage />} />
          <Route path="/chat" element={<ChatPage currentUser={currentUser} />} />
          <Route path="/marketplace" element={<MarketplacePage currentUser={currentUser} />} />
          <Route
            path="/admin"
            element={isAdmin ? <AdminLayout /> : <Navigate to="/" replace />}
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="content" element={<AdminContentPage />} />
            <Route path="reports" element={<AdminModerationPage />} />
            <Route path="challenges" element={<AdminChallengesPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
          <Route path="/admin/moderation" element={<Navigate to="/admin/reports" replace />} />
          <Route path="/versions" element={<Navigate to="/projects" replace />} />
          <Route path="/collabs" element={<Navigate to="/projects" replace />} />
          <Route path="/sessions" element={<Navigate to="/projects" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

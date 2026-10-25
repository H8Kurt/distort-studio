import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  FolderIcon,
  ShoppingBagIcon,
  UserCircleIcon,
  GlobeAmericasIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  MusicalNoteIcon,
  SignalIcon,
  TrophyIcon,
  MegaphoneIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import Atmosphere from "../ui/Atmosphere";
import AppWatchers from "../AppWatchers";
import TopNav from "./TopNav";
import Sidebar from "./Sidebar";
import CommandPalette from "./CommandPalette";
import ConfirmProvider from "../ui/ConfirmDialog";
import EmailVerificationBanner from "./EmailVerificationBanner";
import PlayerProvider from "../player/PlayerProvider";
import PlayerDock from "../player/PlayerDock";
import LiveRoomProvider from "../room/LiveRoomProvider";
import { getSkin, type Skin } from "../../lib/skin";
import type { AnnouncementSetting, Project, User } from "../../types";

interface MainLayoutProps {
  children: React.ReactNode;
  currentUser: User;
  projects: Project[];
  logout: () => void;
  announcement?: AnnouncementSetting | null;
  maintenance?: boolean;
}

const MOBILE_NAV = [
  { to: "/", label: "Лента", icon: HomeIcon, end: true },
  { to: "/discover", label: "Обзор", icon: GlobeAmericasIcon },
  { to: "/projects", label: "Проекты", icon: FolderIcon },
  { to: "/rooms", label: "Комнаты", icon: SignalIcon },
  { to: "/challenges", label: "Челленджи", icon: TrophyIcon },
  { to: "/music", label: "Музыка", icon: MusicalNoteIcon },
  { to: "/friends", label: "Друзья", icon: UsersIcon },
  { to: "/chat", label: "Чат", icon: ChatBubbleLeftRightIcon },
  { to: "/marketplace", label: "Магазин", icon: ShoppingBagIcon },
  { to: "/profile", label: "Профиль", icon: UserCircleIcon },
];

const MainLayout: React.FC<MainLayoutProps> = ({ children, currentUser, projects, logout, announcement, maintenance }) => {
  const [skin, setSkin] = useState<Skin>(getSkin);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Ctrl/Cmd+K — командная палитра
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ConfirmProvider>
      <PlayerProvider>
      <LiveRoomProvider currentUserId={currentUser.id}>
      <div className="app-shell">
      <Atmosphere />
      <AppWatchers />

      <Sidebar currentUser={currentUser} />

      <div className="app-main">
        <TopNav
          currentUser={currentUser}
          skin={skin}
          onSkinChange={setSkin}
          logout={logout}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <main className="app-content">
          <div className="app-container">
            {maintenance && (
              <div className="site-announcement warning">
                <ExclamationTriangleIcon style={{ width: 16, height: 16, flex: "0 0 auto" }} />
                <span>Включён режим техобслуживания — обычные пользователи видят заглушку.</span>
              </div>
            )}
            {announcement?.enabled && announcement.text && (
              <div className={`site-announcement ${announcement.level || "info"}`}>
                <MegaphoneIcon style={{ width: 16, height: 16, flex: "0 0 auto" }} />
                <span>{announcement.text}</span>
                {announcement.link && (
                  <a href={announcement.link} target="_blank" rel="noreferrer" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
                    Подробнее
                  </a>
                )}
              </div>
            )}
            <EmailVerificationBanner currentUser={currentUser} />
            {children}
          </div>
        </main>
      </div>

      <nav className="mobile-nav">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <item.icon />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        projects={projects}
      />

      <PlayerDock />
      </div>
      </LiveRoomProvider>
      </PlayerProvider>
    </ConfirmProvider>
  );
};

export default MainLayout;

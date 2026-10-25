import { useEffect, useState } from "react";
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
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  RocketLaunchIcon,
  PlusIcon,
  TrophyIcon,
} from "@heroicons/react/24/solid";
import FramedAvatar from "../ui/FramedAvatar";
import { api, getSocket } from "../../lib/api";
import { getElectron } from "../../lib/electron";
import { launchAppEntry } from "../../lib/launcher";
import type { AppEntry, ConversationSummary, User } from "../../types";

interface SidebarProps {
  currentUser: User;
}

const LINKS = [
  { to: "/", label: "Лента", icon: HomeIcon, end: true },
  { to: "/discover", label: "Обзор", icon: GlobeAmericasIcon, end: false },
  { to: "/projects", label: "Проекты", icon: FolderIcon, end: false },
  { to: "/music", label: "Музыка", icon: MusicalNoteIcon, end: false },
  { to: "/rooms", label: "Комнаты", icon: SignalIcon, end: false },
  { to: "/challenges", label: "Челленджи", icon: TrophyIcon, end: false },
  { to: "/marketplace", label: "Магазин", icon: ShoppingBagIcon, end: false },
  { to: "/friends", label: "Друзья", icon: UsersIcon, end: false },
];

function useChatUnread() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () => {
      api
        .get<ConversationSummary[]>("/api/chat/conversations")
        .then((list) => {
          if (!alive) return;
          const safe = Array.isArray(list) ? list : [];
          setUnread(safe.reduce((sum, c) => sum + (c.unread || 0), 0));
        })
        .catch(() => undefined);
    };
    load();
    const socket = getSocket();
    socket.on("chat:message", load);
    socket.on("chat:read", load);
    return () => {
      alive = false;
      socket.off("chat:message", load);
      socket.off("chat:read", load);
    };
  }, []);
  return unread;
}

function useApps() {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [launchingId, setLaunchingId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      api
        .get<AppEntry[]>("/api/apps")
        .then((list) => {
          if (alive) setApps(Array.isArray(list) ? list : []);
        })
        .catch(() => undefined);
    };
    load();
    window.addEventListener("distort:apps-changed", load);
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      window.removeEventListener("distort:apps-changed", load);
      window.removeEventListener("focus", load);
    };
  }, []);

  const launch = async (entry: AppEntry) => {
    if (!getElectron()) return;
    setLaunchingId(entry.id);
    try {
      await launchAppEntry(entry);
    } finally {
      setLaunchingId(null);
    }
  };

  return { apps, launch, launchingId };
}

const COLLAPSE_KEY = "sidebar-collapsed";

export default function Sidebar({ currentUser }: SidebarProps) {
  const unread = useChatUnread();
  const { apps, launch, launchingId } = useApps();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggle = () =>
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  return (
    <aside className={`app-sidebar side-nav${collapsed ? " collapsed" : ""}`}>
      <button
        type="button"
        className="side-collapse"
        onClick={toggle}
        title={collapsed ? "Развернуть" : "Свернуть"}
        aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
      >
        {collapsed ? <ChevronDoubleRightIcon /> : <ChevronDoubleLeftIcon />}
      </button>

      <nav className="side-links" aria-label="Основная навигация">
        {LINKS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            title={item.label}
          >
            <item.icon />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
        <NavLink
          to="/chat"
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          title="Чат"
        >
          <ChatBubbleLeftRightIcon />
          <span className="nav-label">Чат</span>
          {unread > 0 && <span className="nav-badge">{unread > 9 ? "9+" : unread}</span>}
        </NavLink>

        {apps.length > 0 && (
          <>
            <div className="side-section-head">
              <span className="nav-label">Приложения</span>
              <NavLink to="/profile" className="side-section-add" title="Управлять приложениями">
                <PlusIcon />
              </NavLink>
            </div>
            {apps.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="nav-item side-app"
                onClick={() => launch(entry)}
                title={entry.path}
                disabled={launchingId === entry.id}
              >
                <RocketLaunchIcon />
                <span className="nav-label">{entry.name}</span>
                {launchingId === entry.id && <span className="nav-sub">…</span>}
              </button>
            ))}
          </>
        )}
      </nav>

      <NavLink to="/profile" className="side-user" title={`@${currentUser.username}`}>
        <FramedAvatar
          username={currentUser.username}
          url={currentUser.avatarUrl || undefined}
          frameId={currentUser.frameId}
          size="sm"
        />
        <span className="side-user-info">
          <span className="side-user-name">@{currentUser.username}</span>
          <span className="side-user-sub">Мой профиль</span>
        </span>
        <UserCircleIcon className="side-user-icon" />
      </NavLink>
    </aside>
  );
}

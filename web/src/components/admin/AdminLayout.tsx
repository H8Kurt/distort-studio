import { NavLink, Outlet } from "react-router-dom";
import {
  ChartBarIcon,
  UsersIcon,
  Squares2X2Icon,
  FlagIcon,
  TrophyIcon,
  MegaphoneIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/solid";

const NAV = [
  { to: "/admin", label: "обзор", icon: ChartBarIcon, end: true },
  { to: "/admin/users", label: "пользователи", icon: UsersIcon },
  { to: "/admin/content", label: "контент", icon: Squares2X2Icon },
  { to: "/admin/reports", label: "жалобы", icon: FlagIcon },
  { to: "/admin/challenges", label: "челленджи", icon: TrophyIcon },
  { to: "/admin/announcements", label: "объявления", icon: MegaphoneIcon },
  { to: "/admin/settings", label: "настройки", icon: Cog6ToothIcon },
];

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <div className="admin-nav">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}
          >
            <item.icon />
            {item.label}
          </NavLink>
        ))}
      </div>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ChevronDownIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/solid";
import Avatar from "../ui/Avatar";
import ThemeSwitcher from "./ThemeSwitcher";
import PaletteSwitcher from "./PaletteSwitcher";
import SkinSwitcher from "./SkinSwitcher";
import type { User } from "../../types";
import type { Skin } from "../../lib/skin";

interface UserMenuProps {
  currentUser: User;
  skin: Skin;
  onSkinChange: (skin: Skin) => void;
  logout: () => void;
}

export default function UserMenu({ currentUser, skin, onSkinChange, logout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar username={currentUser.username} url={currentUser.avatarUrl || undefined} size="sm" />
        <span className="user-menu-name">{currentUser.username}</span>
        <ChevronDownIcon style={{ width: 14, height: 14, opacity: 0.7 }} />
      </button>

      {open && (
        <div className="user-menu-pop" role="menu">
          <NavLink to="/profile" className="user-menu-item" onClick={() => setOpen(false)}>
            <UserCircleIcon /> Профиль
          </NavLink>

          {currentUser.role === "admin" && (
            <NavLink to="/admin" className="user-menu-item" onClick={() => setOpen(false)}>
              <ShieldCheckIcon /> Админ-панель
            </NavLink>
          )}

          <div className="user-menu-divider" />

          <div className="user-menu-section">
            <span className="tech-label">
              <PaintBrushIcon style={{ width: 12, height: 12 }} /> оформление
            </span>
            <SkinSwitcher full onChange={onSkinChange} />
            {skin !== "webcore" && <PaletteSwitcher />}
            <ThemeSwitcher />
          </div>

          <div className="user-menu-divider" />

          <button type="button" className="user-menu-item danger" onClick={logout} role="menuitem">
            <ArrowLeftOnRectangleIcon /> Выйти
          </button>
        </div>
      )}
    </div>
  );
}

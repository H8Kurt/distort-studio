import { NavLink } from "react-router-dom";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import JpText from "../ui/JpText";
import { PixelCat } from "../ui/WebcoreBits";
import { PixelBat } from "../ui/GothicBits";
import CreateStudio from "../studio/CreateStudio";
import NotificationsBell from "./NotificationsBell";
import UserMenu from "./UserMenu";
import type { Skin } from "../../lib/skin";
import type { User } from "../../types";

interface TopNavProps {
  currentUser: User;
  skin: Skin;
  onSkinChange: (skin: Skin) => void;
  logout: () => void;
  onOpenPalette: () => void;
}

export default function TopNav({
  currentUser,
  skin,
  onSkinChange,
  logout,
  onOpenPalette,
}: TopNavProps) {
  const webcore = skin === "webcore";

  return (
    <header className="app-topbar">
      <NavLink to="/" className="brand topbar-brand" aria-label="Distort Studio">
        <div className="brand-logo">D</div>
        <div className="topbar-brand-text">
          <div className="brand-name">DISTORT STUDIO</div>
          {webcore ? (
            <JpText className="brand-sub">ディストート ♡</JpText>
          ) : (
            <span className="brand-sub latin">requiem aeternam</span>
          )}
        </div>
        <span aria-hidden className="topbar-brand-mascot">
          {webcore ? <PixelCat size={32} /> : <PixelBat size={24} className="float-slow" />}
        </span>
      </NavLink>

      <div className="topnav-actions">
        <CreateStudio />

        <button
          type="button"
          className="topnav-search"
          onClick={onOpenPalette}
          aria-label="Поиск"
        >
          <MagnifyingGlassIcon style={{ width: 16, height: 16 }} />
          <span className="topnav-search-label">Поиск…</span>
          <span className="topnav-kbd">⌘K</span>
        </button>

        <NotificationsBell />

        <UserMenu
          currentUser={currentUser}
          skin={skin}
          onSkinChange={onSkinChange}
          logout={logout}
        />
      </div>
    </header>
  );
}

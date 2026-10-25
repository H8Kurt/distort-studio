import { useCallback, useEffect, useState } from "react";
import {
  PencilSquareIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  TrophyIcon,
  SparklesIcon,
  UserCircleIcon,
  SwatchIcon,
  HeartIcon,
  FolderOpenIcon,
  UsersIcon,
  UserPlusIcon,
  ShieldExclamationIcon,
  NoSymbolIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/solid";
import FramedAvatar from "../components/ui/FramedAvatar";
import LevelBar from "../components/ui/LevelBar";
import AchievementsGrid from "../components/ui/AchievementsGrid";
import Avatar from "../components/ui/Avatar";
import ElectronPanel from "../components/ElectronPanel";
import ProfileEditForm from "../ProfileEditForm";
import { useConfirm } from "../components/ui/confirm";
import { api } from "../lib/api";
import { bannerStyle } from "../lib/cosmetics";
import type { BlockedEntry, User, UserProfile } from "../types";

interface ProfilePageProps {
  currentUser: User;
  setCurrentUser: (user: User) => void;
}

type Tab = "profile" | "appearance" | "achievements" | "moderation";

export default function ProfilePage({ currentUser, setCurrentUser }: ProfilePageProps) {
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [blocks, setBlocks] = useState<BlockedEntry[]>([]);
  const [mutes, setMutes] = useState<BlockedEntry[]>([]);
  const [modBusy, setModBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<UserProfile>(`/api/users/${currentUser.id}`);
      setProfile(data);
    } catch {
      setProfile(null);
    }
  }, [currentUser.id]);

  useEffect(() => {
    load();
  }, [load]);

  const loadModeration = useCallback(async () => {
    try {
      const [b, m] = await Promise.all([
        api.get<BlockedEntry[]>("/api/moderation/blocks"),
        api.get<BlockedEntry[]>("/api/moderation/mutes"),
      ]);
      setBlocks(Array.isArray(b) ? b : []);
      setMutes(Array.isArray(m) ? m : []);
    } catch {
      setBlocks([]);
      setMutes([]);
    }
  }, []);

  useEffect(() => {
    if (tab === "moderation") loadModeration();
  }, [tab, loadModeration]);

  const unblock = async (userId: number) => {
    setModBusy(userId);
    try {
      await api.del(`/api/moderation/blocks/${userId}`);
      setBlocks((prev) => prev.filter((b) => b.user?.id !== userId));
    } catch {
      /* ignore */
    } finally {
      setModBusy(null);
    }
  };

  const unmute = async (userId: number) => {
    setModBusy(userId);
    try {
      await api.del(`/api/moderation/mutes/${userId}`);
      setMutes((prev) => prev.filter((m) => m.user?.id !== userId));
    } catch {
      /* ignore */
    } finally {
      setModBusy(null);
    }
  };

  const confirmUnblock = async (userId: number) => {
    const ok = await confirm({
      title: "Снять блокировку",
      message: "Пользователь снова сможет писать вам и видеть ваш контент.",
      confirmLabel: "Разблокировать",
    });
    if (ok) unblock(userId);
  };

  const confirmUnmute = async (userId: number) => {
    const ok = await confirm({
      title: "Показывать контент",
      message: "Контент пользователя снова появится в вашей ленте.",
      confirmLabel: "Показать",
    });
    if (ok) unmute(userId);
  };

  const handleSaved = (user: User) => {
    setCurrentUser(user);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    load();
    setTab("profile");
  };

  const stats = profile?.stats;
  const me = { ...currentUser, ...(profile || {}) };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">profile // личный кабинет</span>
          <h2 className="page-title">Профиль</h2>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab${tab === "profile" ? " active" : ""}`} onClick={() => setTab("profile")}>
          <UserCircleIcon style={{ width: 16, height: 16 }} /> Профиль
        </button>
        <button className={`tab${tab === "appearance" ? " active" : ""}`} onClick={() => setTab("appearance")}>
          <SwatchIcon style={{ width: 16, height: 16 }} /> Оформление
        </button>
        <button className={`tab${tab === "achievements" ? " active" : ""}`} onClick={() => setTab("achievements")}>
          <TrophyIcon style={{ width: 16, height: 16 }} /> Достижения
        </button>
        <button className={`tab${tab === "moderation" ? " active" : ""}`} onClick={() => setTab("moderation")}>
          <ShieldExclamationIcon style={{ width: 16, height: 16 }} /> Модерация
        </button>
      </div>

      {tab === "profile" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }} className="profile-layout">
          <div className="profile-hero card">
            <div className="profile-banner" style={bannerStyle(me.bannerUrl)} />
            <div className="profile-hero-inner" style={{ flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <FramedAvatar username={me.username} url={me.avatarUrl || undefined} frameId={me.frameId} size="xl" />
              <div>
                <h2>{me.username}</h2>
                <div className="badge badge-primary" style={{ marginTop: 6 }}>@{me.username}</div>
              </div>
              <p className="text-text-secondary" style={{ maxWidth: 320 }}>
                {me.bio || "Пока нет описания профиля."}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", marginTop: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }} className="text-text-secondary">
                  <EnvelopeIcon style={{ width: 16, height: 16 }} /> {me.email}
                </div>
                {me.createdAt && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }} className="text-text-secondary">
                    <CalendarDaysIcon style={{ width: 16, height: 16 }} />
                    С нами с {new Date(me.createdAt).toLocaleDateString("ru-RU")}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }} className="text-text-secondary">
                  <TrophyIcon style={{ width: 16, height: 16 }} /> Ранг: {me.rebelRank ?? 0}
                </div>
              </div>
              <button className="btn btn-primary w-full" onClick={() => setTab("appearance")}>
                <PencilSquareIcon style={{ width: 16, height: 16 }} /> Редактировать профиль
              </button>
              {saved && <div className="badge badge-success">Профиль обновлён</div>}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {stats && (
              <div className="card">
                <LevelBar level={stats.level} xp={stats.xp} xpToNext={stats.xpToNext} progress={stats.progress} />
              </div>
            )}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 className="panel-title">Статистика</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{profile?.projectsCount ?? 0}</div>
                  <div className="stat-label"><FolderOpenIcon style={{ width: 12, height: 12 }} /> Проекты</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{profile?.followersCount ?? 0}</div>
                  <div className="stat-label"><UsersIcon style={{ width: 12, height: 12 }} /> Подписчики</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{profile?.followingCount ?? 0}</div>
                  <div className="stat-label"><UserPlusIcon style={{ width: 12, height: 12 }} /> Подписки</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{profile?.likesCount ?? 0}</div>
                  <div className="stat-label"><HeartIcon style={{ width: 12, height: 12 }} /> Лайки</div>
                </div>
              </div>
              <p className="text-text-tertiary" style={{ fontSize: "0.85rem" }}>
                Совет: сделайте проект публичным, чтобы он появился в общей ленте.
              </p>
            </div>
            <ElectronPanel />
          </div>
        </div>
      )}

      {tab === "appearance" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }} className="profile-layout">
          <ProfileEditForm user={me} onSaved={handleSaved} onCancel={() => setTab("profile")} />
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="card">
              <h3 className="panel-title" style={{ marginBottom: "0.75rem" }}>Предпросмотр</h3>
              <div className="profile-hero" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--border-color)", borderRadius: 14 }}>
                <div className="profile-banner" style={bannerStyle(me.bannerUrl)} />
                <div className="profile-hero-inner" style={{ flexDirection: "column", alignItems: "center", textAlign: "center", padding: "1rem" }}>
                  <FramedAvatar username={me.username} url={me.avatarUrl || undefined} frameId={me.frameId} size="lg" />
                  <strong>{me.username}</strong>
                </div>
              </div>
            </div>
            <ElectronPanel />
          </div>
        </div>
      )}

      {tab === "achievements" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {stats && (
            <div className="card">
              <LevelBar level={stats.level} xp={stats.xp} xpToNext={stats.xpToNext} progress={stats.progress} />
              <p className="text-text-tertiary" style={{ marginTop: 10, fontSize: "0.85rem" }}>
                <SparklesIcon style={{ width: 13, height: 14, verticalAlign: "-2px" }} /> Опыт начисляется за публикации, лайки, подписчиков и активность.
              </p>
            </div>
          )}
          {stats ? (
            <AchievementsGrid achievements={stats.achievements} />
          ) : (
            <div className="card empty-state"><HeartIcon className="empty-state-icon" /><p>Загрузка достижений…</p></div>
          )}
        </div>
      )}

      {tab === "moderation" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }} className="profile-layout">
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <h3 className="panel-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <NoSymbolIcon style={{ width: 16, height: 16 }} /> Заблокированные ({blocks.length})
            </h3>
            {blocks.length === 0 ? (
              <p className="text-text-tertiary" style={{ fontSize: "0.85rem" }}>Вы никого не блокировали.</p>
            ) : (
              blocks.map((b) => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar username={b.user?.username || "?"} url={b.user?.avatarUrl || undefined} size="sm" />
                  <strong style={{ flex: 1, minWidth: 0 }}>@{b.user?.username || "unknown"}</strong>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={modBusy === b.user?.id}
                    onClick={() => b.user && confirmUnblock(b.user.id)}
                  >
                    Разблокировать
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <h3 className="panel-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <EyeSlashIcon style={{ width: 16, height: 16 }} /> Скрытые из ленты ({mutes.length})
            </h3>
            {mutes.length === 0 ? (
              <p className="text-text-tertiary" style={{ fontSize: "0.85rem" }}>Нет скрытых пользователей.</p>
            ) : (
              mutes.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar username={m.user?.username || "?"} url={m.user?.avatarUrl || undefined} size="sm" />
                  <strong style={{ flex: 1, minWidth: 0 }}>@{m.user?.username || "unknown"}</strong>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={modBusy === m.user?.id}
                    onClick={() => m.user && confirmUnmute(m.user.id)}
                  >
                    Показывать
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

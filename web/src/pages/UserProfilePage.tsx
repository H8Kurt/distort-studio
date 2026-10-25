import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  UserPlusIcon,
  UserMinusIcon,
  HeartIcon,
  FolderOpenIcon,
  UsersIcon,
  CakeIcon,
  TrophyIcon,
  SparklesIcon,
  CheckIcon,
  ChatBubbleLeftIcon,
  EllipsisHorizontalIcon,
  FlagIcon,
  NoSymbolIcon,
  EyeSlashIcon,
  EyeIcon,
  LockClosedIcon,
} from "@heroicons/react/24/solid";
import FramedAvatar from "../components/ui/FramedAvatar";
import LevelBar from "../components/ui/LevelBar";
import AchievementsGrid from "../components/ui/AchievementsGrid";
import ProjectList from "../components/ui/ProjectList";
import ReportDialog from "../components/ui/ReportDialog";
import { useConfirm } from "../components/ui/confirm";
import { api } from "../lib/api";
import { bannerStyle } from "../lib/cosmetics";
import type { UserProfile } from "../types";

interface UserProfilePageProps {
  currentUserId: number;
}

export default function UserProfilePage({ currentUserId }: UserProfilePageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [friendBusy, setFriendBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [modBusy, setModBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api.get<UserProfile>(`/api/users/${id}`);
      setProfile(data);
      setBlocked(!!data.isBlocked);
      setMuted(!!data.isMuted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить профиль");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const blockUser = async () => {
    if (!profile) return;
    setMenuOpen(false);
    const ok = await confirm({
      title: "Блокировка пользователя",
      message: `Заблокировать @${profile.username}? Пользователь не сможет писать вам и видеть ваш контент.`,
      confirmLabel: "Заблокировать",
      danger: true,
    });
    if (!ok) return;
    setModBusy(true);
    try {
      await api.post(`/api/moderation/blocks/${profile.id}`);
      setBlocked(true);
      setProfile((p) => (p ? { ...p, isFollowing: false, friendStatus: "none" } : p));
    } catch {
      /* ignore */
    } finally {
      setModBusy(false);
    }
  };

  const unblockUser = async () => {
    if (!profile) return;
    setMenuOpen(false);
    setModBusy(true);
    try {
      await api.del(`/api/moderation/blocks/${profile.id}`);
      setBlocked(false);
      await load();
    } catch {
      /* ignore */
    } finally {
      setModBusy(false);
    }
  };

  const toggleMute = async () => {
    if (!profile) return;
    setMenuOpen(false);
    setModBusy(true);
    try {
      if (muted) await api.del(`/api/moderation/mutes/${profile.id}`);
      else await api.post(`/api/moderation/mutes/${profile.id}`);
      setMuted((v) => !v);
    } catch {
      /* ignore */
    } finally {
      setModBusy(false);
    }
  };

  const toggleFollow = async () => {
    if (!profile) return;
    setBusy(true);
    const following = !profile.isFollowing;
    setProfile({
      ...profile,
      isFollowing: following,
      followersCount: Math.max(0, profile.followersCount + (following ? 1 : -1)),
    });
    try {
      if (following) await api.post(`/api/users/${profile.id}/follow`);
      else await api.del(`/api/users/${profile.id}/follow`);
    } catch {
      await load();
    } finally {
      setBusy(false);
    }
  };

  const setFriendStatus = (status: UserProfile["friendStatus"]) =>
    setProfile((p) => (p ? { ...p, friendStatus: status } : p));

  const sendFriendRequest = async () => {
    if (!profile) return;
    setFriendBusy(true);
    try {
      const r = await api.post<{ status: UserProfile["friendStatus"] }>(`/api/friends/request/${profile.id}`);
      setFriendStatus(r.status);
    } catch {
      /* ignore */
    } finally {
      setFriendBusy(false);
    }
  };

  const acceptFriend = async () => {
    if (!profile) return;
    setFriendBusy(true);
    try {
      await api.post(`/api/friends/accept/${profile.id}`);
      setFriendStatus("friends");
    } catch {
      /* ignore */
    } finally {
      setFriendBusy(false);
    }
  };

  const removeFriend = async () => {
    if (!profile) return;
    setFriendBusy(true);
    try {
      await api.del(`/api/friends/${profile.id}`);
      setFriendStatus("none");
    } catch {
      /* ignore */
    } finally {
      setFriendBusy(false);
    }
  };

  const openChat = async () => {
    if (!profile) return;
    setFriendBusy(true);
    try {
      const c = await api.post<{ id: number }>("/api/chat/conversations", { userId: profile.id });
      navigate(`/chat?c=${c.id}`);
    } catch {
      /* ignore */
    } finally {
      setFriendBusy(false);
    }
  };

  if (error) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
        <h3>Профиль недоступен</h3>
        <p className="text-text-secondary" style={{ marginTop: 4 }}>{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
        <p className="text-text-secondary">Загрузка профиля…</p>
      </div>
    );
  }

  const isSelf = profile.isSelf || profile.id === currentUserId;
  const stats = profile.stats;

  if (blocked && !isSelf) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <LockClosedIcon style={{ width: 20, height: 20 }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong>Пользователь заблокирован</strong>
            <p className="text-text-secondary" style={{ margin: "2px 0 0" }}>
              Вы заблокировали @{profile.username}. Содержимое профиля скрыто.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={unblockUser} disabled={modBusy}>
            Снять блокировку
          </button>
        </div>
        <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={profile.id} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="profile-hero card">
        <div className="profile-banner" style={bannerStyle(profile.bannerUrl)} />
        <div className="profile-hero-inner">
          <FramedAvatar
            username={profile.username}
            url={profile.avatarUrl || undefined}
            frameId={profile.frameId}
            size="xl"
          />
          <div className="profile-hero-main">
            <h2 className="page-title" style={{ margin: 0 }}>{profile.username}</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              <span className="badge badge-primary">@{profile.username}</span>
              {profile.role && <span className="badge badge-neutral">{profile.role}</span>}
              {stats && (
                <span className="badge badge-accent">
                  <SparklesIcon style={{ width: 12, height: 12 }} /> Уровень {stats.level}
                </span>
              )}
              <span className="badge badge-neutral">
                <TrophyIcon style={{ width: 12, height: 12 }} /> Ранг {profile.rebelRank ?? 1}
              </span>
            </div>
            <p className="text-text-secondary" style={{ marginTop: 10, maxWidth: 560 }}>
              {profile.bio || "Пользователь пока не рассказал о себе."}
            </p>
            {profile.createdAt && (
              <div className="text-text-tertiary profile-since">
                <CakeIcon style={{ width: 14, height: 14 }} /> С {new Date(profile.createdAt).toLocaleDateString("ru-RU")}
              </div>
            )}
          </div>

          <div className="profile-actions">
            {isSelf ? (
              <button className="btn btn-secondary" onClick={() => navigate("/profile")}>
                <FolderOpenIcon style={{ width: 16, height: 16 }} /> Мой кабинет
              </button>
            ) : (
              <>
                <button
                  className={`btn btn-follow ${profile.isFollowing ? "btn-secondary following" : "btn-primary"}`}
                  onClick={toggleFollow}
                  disabled={busy}
                >
                  {profile.isFollowing ? (
                    <>
                      <UserMinusIcon style={{ width: 16, height: 16 }} /> Отписаться
                    </>
                  ) : (
                    <>
                      <UserPlusIcon style={{ width: 16, height: 16 }} /> Подписаться
                    </>
                  )}
                </button>

                {(profile.friendStatus ?? "none") === "none" && (
                  <button className="btn btn-secondary" onClick={sendFriendRequest} disabled={friendBusy}>
                    <UserPlusIcon style={{ width: 16, height: 16 }} /> В друзья
                  </button>
                )}
                {profile.friendStatus === "outgoing" && (
                  <button className="btn btn-secondary" onClick={removeFriend} disabled={friendBusy} title="Отменить заявку">
                    Заявка отправлена
                  </button>
                )}
                {profile.friendStatus === "incoming" && (
                  <button className="btn btn-primary" onClick={acceptFriend} disabled={friendBusy}>
                    <CheckIcon style={{ width: 16, height: 16 }} /> Принять заявку
                  </button>
                )}
                {profile.friendStatus === "friends" && (
                  <button className="btn btn-secondary" onClick={openChat} disabled={friendBusy}>
                    <ChatBubbleLeftIcon style={{ width: 16, height: 16 }} /> Написать
                  </button>
                )}

                <div className="mod-menu-wrap" ref={menuRef}>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setMenuOpen((v) => !v)}
                    disabled={modBusy}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label="Действия"
                    title="Действия"
                  >
                    <EllipsisHorizontalIcon style={{ width: 18, height: 18 }} />
                  </button>
                  {menuOpen && (
                    <div className="mod-menu" role="menu">
                      <button type="button" className="mod-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); setReportOpen(true); }}>
                        <FlagIcon /> Пожаловаться
                      </button>
                      <button type="button" className="mod-menu-item" role="menuitem" onClick={toggleMute} disabled={modBusy}>
                        {muted ? <EyeIcon /> : <EyeSlashIcon />}
                        {muted ? "Показывать снова" : "Скрыть контент"}
                      </button>
                      {blocked ? (
                        <button type="button" className="mod-menu-item" role="menuitem" onClick={unblockUser} disabled={modBusy}>
                          <NoSymbolIcon /> Разблокировать
                        </button>
                      ) : (
                        <button type="button" className="mod-menu-item danger" role="menuitem" onClick={blockUser} disabled={modBusy}>
                          <NoSymbolIcon /> Заблокировать
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={profile.id} />

      {stats && (
        <div className="card">
          <LevelBar level={stats.level} xp={stats.xp} xpToNext={stats.xpToNext} progress={stats.progress} />
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{profile.projectsCount}</div>
          <div className="stat-label"><FolderOpenIcon style={{ width: 12, height: 12 }} /> Проекты</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{profile.followersCount}</div>
          <div className="stat-label"><UsersIcon style={{ width: 12, height: 12 }} /> Подписчики</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{profile.followingCount}</div>
          <div className="stat-label"><UserPlusIcon style={{ width: 12, height: 12 }} /> Подписки</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{profile.likesCount}</div>
          <div className="stat-label"><HeartIcon style={{ width: 12, height: 12 }} /> Лайки</div>
        </div>
      </div>

      {stats && (
        <>
          <div className="panel-head">
            <h3 className="panel-title">Достижения</h3>
          </div>
          <AchievementsGrid achievements={stats.achievements} />
        </>
      )}

      <div className="panel-head">
        <h3 className="panel-title">Публичные проекты</h3>
      </div>
      {profile.projects.length === 0 ? (
        <div className="card empty-state">
          <FolderOpenIcon className="empty-state-icon" />
          <h3>Нет публичных проектов</h3>
          <p className="text-text-secondary" style={{ marginTop: 4 }}>
            Автор ещё не опубликовал работы.
          </p>
        </div>
      ) : (
        <ProjectList projects={profile.projects} onSelect={(pid) => navigate(`/projects/${pid}`)} />
      )}
    </div>
  );
}

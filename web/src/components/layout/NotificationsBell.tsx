import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellIcon,
  UserPlusIcon,
  FolderPlusIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  BanknotesIcon,
  FlagIcon,
  TrophyIcon,
  SignalIcon,
} from "@heroicons/react/24/solid";
import { api, getSocket } from "../../lib/api";
import Avatar from "../ui/Avatar";
import type { AppNotification } from "../../types";

function iconFor(type: string) {
  if (type === "follow" || type === "friend_request" || type === "friend_accept")
    return <UserPlusIcon style={{ width: 13, height: 13 }} />;
  if (type === "like" || type === "post_like") return <HeartIcon style={{ width: 13, height: 13 }} />;
  if (type === "collab_invite" || type === "collab_accept")
    return <FolderPlusIcon style={{ width: 13, height: 13 }} />;
  if (type === "order_paid") return <BanknotesIcon style={{ width: 13, height: 13 }} />;
  if (type === "challenge_entry") return <FlagIcon style={{ width: 13, height: 13 }} />;
  if (type === "challenge_vote") return <TrophyIcon style={{ width: 13, height: 13 }} />;
  if (type === "room_invite") return <SignalIcon style={{ width: 13, height: 13 }} />;
  return <ChatBubbleLeftIcon style={{ width: 13, height: 13 }} />;
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unread = items.filter((n) => !n.read).length;

  const load = useCallback(async () => {
    try {
      const data = await api.get<AppNotification[]>("/api/notifications");
      setItems(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const socket = getSocket();
    const onNew = (n: AppNotification) => setItems((prev) => [n, ...prev]);
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.post("/api/notifications/read-all");
    } catch {
      /* ignore */
    }
  };

  const remove = async (id: number) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.del(`/api/notifications/${id}`);
    } catch {
      /* ignore */
    }
  };

  const openItem = async (n: AppNotification) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      api.post(`/api/notifications/${n.id}/read`).catch(() => undefined);
    }
    if (n.type === "follow" && n.actor) {
      navigate(`/u/${n.actor.id}`);
    } else if (n.type === "friend_accept" && n.actor) {
      navigate(`/u/${n.actor.id}`);
    } else if (n.type === "collab_invite") {
      // приглашение требует ответа — не переходим
    } else if (n.type === "order_paid") {
      navigate("/marketplace");
    } else if (n.type === "challenge_entry" || n.type === "challenge_vote") {
      navigate("/challenges");
    } else if (n.type === "room_invite") {
      navigate("/rooms");
    } else if (n.projectId) {
      navigate(`/projects/${n.projectId}`);
    } else if (n.postId) {
      navigate("/");
    }
    setOpen(false);
  };

  const respondFriend = async (n: AppNotification, action: "accept" | "decline") => {
    if (!n.actor) return;
    setBusy(n.id);
    try {
      await api.post(`/api/friends/${action}/${n.actor.id}`);
      api.post(`/api/notifications/${n.id}/read`).catch(() => undefined);
      setItems((prev) => prev.filter((x) => x.id !== n.id));
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  };

  const respondCollab = async (n: AppNotification, action: "accept" | "decline") => {
    if (!n.projectId) return;
    setBusy(n.id);
    try {
      await api.post(`/api/collabs/project/${n.projectId}/${action}`);
      api.post(`/api/notifications/${n.id}/read`).catch(() => undefined);
      setItems((prev) => prev.filter((x) => x.id !== n.id));
      if (action === "accept") {
        setOpen(false);
        navigate(`/projects/${n.projectId}`);
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="user-menu" ref={ref}>
      <button
        className="icon-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Уведомления"
        title="Уведомления"
      >
        <BellIcon style={{ width: 18, height: 18 }} />
        {unread > 0 && <span className="icon-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="user-menu-pop notifications-panel">
          <div className="notifications-head">
            <strong>Уведомления</strong>
            {unread > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
                <CheckIcon style={{ width: 13, height: 13 }} /> Прочитать всё
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="notifications-empty">Пока пусто. Здесь появятся подписки, лайки и комментарии.</div>
          ) : (
            <div className="notifications-list">
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`notification-item${n.read ? "" : " unread"}`}
                  onClick={() => openItem(n)}
                  role="button"
                  tabIndex={0}
                >
                  {n.actor ? (
                    <Avatar username={n.actor.username} url={n.actor.avatarUrl || undefined} size="sm" />
                  ) : (
                    <span className="notification-icon">{iconFor(n.type)}</span>
                  )}
                  <div className="notification-body">
                    <div className="notification-text">
                      <strong>@{n.actor?.username || "кто-то"}</strong>{" "}
                      {n.message || "оставил уведомление"}
                      {n.Project ? ` — «${n.Project.title}»` : ""}
                    </div>
                    {n.actor && n.type === "friend_request" && (
                      <div className="notification-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={busy === n.id}
                          onClick={() => respondFriend(n, "accept")}
                        >
                          <CheckIcon style={{ width: 12, height: 12 }} /> Принять
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={busy === n.id}
                          onClick={() => respondFriend(n, "decline")}
                        >
                          <XMarkIcon style={{ width: 12, height: 12 }} /> Отклонить
                        </button>
                      </div>
                    )}
                    {n.type === "collab_invite" && (
                      <div className="notification-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={busy === n.id}
                          onClick={() => respondCollab(n, "accept")}
                        >
                          <CheckIcon style={{ width: 12, height: 12 }} /> Принять
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={busy === n.id}
                          onClick={() => respondCollab(n, "decline")}
                        >
                          <XMarkIcon style={{ width: 12, height: 12 }} /> Отклонить
                        </button>
                      </div>
                    )}
                    <span className="notification-time">
                      {new Date(n.createdAt).toLocaleString("ru-RU")}
                    </span>
                  </div>
                  <button
                    className="icon-btn sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(n.id);
                    }}
                    aria-label="Удалить"
                  >
                    <TrashIcon style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

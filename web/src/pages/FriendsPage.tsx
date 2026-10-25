import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlusIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import FramedAvatar from "../components/ui/FramedAvatar";
import { api, getSocket } from "../lib/api";
import { timeAgo } from "../lib/feed";
import type { FriendRequests, FriendUser } from "../types";

type Tab = "all" | "online" | "incoming" | "outgoing";

export default function FriendsPage() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [requests, setRequests] = useState<FriendRequests>({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState<Record<number, boolean>>({});

  const load = async () => {
    setError("");
    try {
      const [f, r] = await Promise.all([
        api.get<FriendUser[]>("/api/friends"),
        api.get<FriendRequests>("/api/friends/requests"),
      ]);
      setFriends(Array.isArray(f) ? f : []);
      setRequests(r && Array.isArray(r.incoming) ? r : { incoming: [], outgoing: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const onPresence = ({ userId, online: isOnline }: { userId: number; online: boolean }) => {
      setOnline((prev) => ({ ...prev, [userId]: isOnline }));
    };
    socket.on("presence", onPresence);
    return () => {
      socket.off("presence", onPresence);
    };
  }, []);

  const accept = async (userId: number) => {
    setBusy(userId);
    try {
      await api.post(`/api/friends/accept/${userId}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  };

  const decline = async (userId: number) => {
    setBusy(userId);
    try {
      await api.post(`/api/friends/decline/${userId}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (userId: number) => {
    setBusy(userId);
    try {
      await api.del(`/api/friends/${userId}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  };

  const write = async (userId: number) => {
    try {
      const convo = await api.post<{ id: number }>("/api/chat/conversations", { userId });
      navigate(`/chat?c=${convo.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const filteredFriends = useMemo(() => {
    const q = query.trim().toLowerCase();
    return friends.filter((f) => {
      if (tab === "online" && !online[f.id]) return false;
      if (q && !f.username.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [friends, query, tab, online]);

  const filteredIncoming = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.incoming.filter((r) => !q || r.user.username.toLowerCase().includes(q));
  }, [requests.incoming, query]);

  const filteredOutgoing = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.outgoing.filter((r) => !q || r.user.username.toLowerCase().includes(q));
  }, [requests.outgoing, query]);

  const UserCard = ({ user, actions }: { user: FriendUser; actions: React.ReactNode }) => (
    <div className="creator-card" onClick={() => navigate(`/u/${user.id}`)}>
      <FramedAvatar username={user.username} url={user.avatarUrl || undefined} frameId={user.frameId} size="sm" />
      <div className="creator-info">
        <strong className="creator-name">
          {user.username}
          {online[user.id] && <span className="chat-online-dot" />}
        </strong>
        <span className="creator-status">
          {online[user.id] ? "в сети" : user.lastSeenAt ? `был(а) ${timeAgo(user.lastSeenAt)}` : "не в сети"}
        </span>
      </div>
      <div className="friend-actions" onClick={(e) => e.stopPropagation()}>
        {actions}
      </div>
    </div>
  );

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "Все", count: friends.length },
    { key: "online", label: "Онлайн", count: friends.filter((f) => online[f.id]).length },
    { key: "incoming", label: "Входящие", count: requests.incoming.length },
    { key: "outgoing", label: "Исходящие", count: requests.outgoing.length },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="panel-head">
        <h3 className="panel-title">
          <UserPlusIcon style={{ width: 16, height: 16 }} /> Друзья
        </h3>
      </div>

      <div className="feed-toolbar">
        <div className="feed-chips">
          {TABS.map((t) => (
            <button key={t.key} className={`chip${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
              {t.label}
              {t.count > 0 && <span className="chip-count">{t.count}</span>}
            </button>
          ))}
        </div>
        <div className="feed-search" style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <MagnifyingGlassIcon
            style={{ width: 16, height: 16, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
          />
          <input
            className="input"
            style={{ paddingLeft: "2.1rem" }}
            placeholder="Поиск по друзьям…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="badge badge-neutral">{error}</div>}

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem 1rem" }}>
          <p className="text-text-secondary">Загрузка…</p>
        </div>
      ) : tab === "incoming" ? (
        filteredIncoming.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <p className="text-text-secondary">Входящих заявок нет.</p>
          </div>
        ) : (
          <div className="creator-grid">
            {filteredIncoming.map(({ user }) => (
              <UserCard
                key={user.id}
                user={user}
                actions={
                  <>
                    <button className="btn btn-primary btn-sm" disabled={busy === user.id} onClick={() => accept(user.id)}>
                      <CheckIcon style={{ width: 14, height: 14 }} /> Принять
                    </button>
                    <button className="btn btn-secondary btn-sm" disabled={busy === user.id} onClick={() => decline(user.id)}>
                      <XMarkIcon style={{ width: 14, height: 14 }} />
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )
      ) : tab === "outgoing" ? (
        filteredOutgoing.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <p className="text-text-secondary">Исходящих заявок нет.</p>
          </div>
        ) : (
          <div className="creator-grid">
            {filteredOutgoing.map(({ user }) => (
              <UserCard
                key={user.id}
                user={user}
                actions={
                  <button className="btn btn-ghost btn-sm" disabled={busy === user.id} onClick={() => remove(user.id)}>
                    Отменить
                  </button>
                }
              />
            ))}
          </div>
        )
      ) : filteredFriends.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
          <UserPlusIcon style={{ width: 40, height: 40, color: "var(--accent-primary)", margin: "0 auto 0.5rem" }} />
          <p className="text-text-secondary">
            {tab === "online" ? "Никто из друзей сейчас не в сети." : query ? "Ничего не найдено." : "У вас пока нет друзей."}
          </p>
        </div>
      ) : (
        <div className="creator-grid">
          {filteredFriends.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              actions={
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => write(user.id)}>
                    <ChatBubbleLeftIcon style={{ width: 14, height: 14 }} /> Написать
                  </button>
                  <button className="icon-btn sm danger" disabled={busy === user.id} onClick={() => remove(user.id)} title="Удалить из друзей">
                    <TrashIcon style={{ width: 14, height: 14 }} />
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

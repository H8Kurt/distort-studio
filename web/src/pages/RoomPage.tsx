import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { ComponentType } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  PaperAirplaneIcon,
  ArrowRightOnRectangleIcon,
  MusicalNoteIcon,
  UsersIcon,
  LockClosedIcon,
  GlobeAltIcon,
  FilmIcon,
  ViewColumnsIcon,
  PencilIcon,
  UserPlusIcon,
  CheckIcon,
} from "@heroicons/react/24/solid";
import { api, getSocket } from "../lib/api";
import { useLiveRoom, type RoomCursor, type RoomReaction } from "../lib/liveRoom";
import Avatar from "../components/ui/Avatar";
import Modal from "../components/ui/Modal";
import MusicStage from "../components/room/MusicStage";
import WatchStage from "../components/room/WatchStage";
import BoardStage from "../components/room/BoardStage";
import DrawStage from "../components/room/DrawStage";
import type { FriendUser, RoomMessage, RoomMode, User } from "../types";

const EMOJIS = ["🔥", "💜", "😂", "😮", "💀", "🎧"];

const MODE_META: Record<RoomMode, { label: string; icon: ComponentType<{ className?: string }> }> = {
  music: { label: "Слушаем музыку", icon: MusicalNoteIcon },
  watch: { label: "Смотрим YouTube", icon: FilmIcon },
  board: { label: "Канбан-доска", icon: ViewColumnsIcon },
  draw: { label: "Рисуем вместе", icon: PencilIcon },
};

function hashLeft(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 1000;
  return 8 + (h % 84);
}

export default function RoomPage({ currentUser }: { currentUser: User }) {
  const { id } = useParams();
  const roomId = Number(id);
  const navigate = useNavigate();
  const { room, members, mode, connected, joinRoom, leaveRoom, sendChat, sendReaction, sendCursor } =
    useLiveRoom();

  const [error, setError] = useState("");
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [reactions, setReactions] = useState<RoomReaction[]>([]);
  const [cursors, setCursors] = useState<Record<number, RoomCursor>>({});

  const [inviteOpen, setInviteOpen] = useState(false);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [inviting, setInviting] = useState<number | null>(null);
  const [invited, setInvited] = useState<number[]>([]);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const lastCursorRef = useRef(0);

  // Вход в комнату при открытии страницы
  useEffect(() => {
    if (!Number.isInteger(roomId)) {
      navigate("/rooms");
      return;
    }
    if (room?.id === roomId) return;
    joinRoom(roomId).catch((e) => setError(e instanceof Error ? e.message : "Не удалось войти"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // История чата
  const joinedRoomId = room?.id;
  useEffect(() => {
    if (joinedRoomId !== roomId) return;
    let alive = true;
    api
      .get<RoomMessage[]>(`/api/rooms/${roomId}/messages`)
      .then((m) => {
        if (alive) setMessages(Array.isArray(m) ? m : []);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [joinedRoomId, roomId]);

  // Покидаем комнату при закрытии вкладки (best-effort)
  useEffect(() => {
    if (joinedRoomId !== roomId) return;
    const onUnload = () => {
      try {
        getSocket().emit("room:leave", { roomId });
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [joinedRoomId, roomId]);

  // Транзиентные события (чат/реакции/курсоры)
  useEffect(() => {
    const socket = getSocket();
    const onChat = (m: RoomMessage) => {
      if (m.roomId === roomId) setMessages((prev) => [...prev, m]);
    };
    const onReaction = (r: RoomReaction) => {
      setReactions((prev) => [...prev, r]);
      window.setTimeout(() => setReactions((prev) => prev.filter((x) => x.id !== r.id)), 2600);
    };
    const onCursor = (c: RoomCursor) => {
      setCursors((prev) => ({ ...prev, [c.userId]: c }));
    };
    socket.on("room:chat", onChat);
    socket.on("room:reaction", onReaction);
    socket.on("room:cursor", onCursor);
    return () => {
      socket.off("room:chat", onChat);
      socket.off("room:reaction", onReaction);
      socket.off("room:cursor", onCursor);
    };
  }, [roomId]);

  // Убираем «зависшие» курсоры
  useEffect(() => {
    const t = window.setInterval(() => {
      setCursors((prev) => {
        const now = Date.now();
        let changed = false;
        const next: Record<number, RoomCursor> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.at > 4000) changed = true;
          else next[Number(k)] = v;
        }
        return changed ? next : prev;
      });
    }, 1500);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const onClosed = () => navigate("/rooms");
    window.addEventListener("distort:room-closed", onClosed);
    return () => window.removeEventListener("distort:room-closed", onClosed);
  }, [navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onStageMove = (e: ReactMouseEvent) => {
    const el = stageRef.current;
    if (!el) return;
    const now = Date.now();
    if (now - lastCursorRef.current < 70) return;
    lastCursorRef.current = now;
    const rect = el.getBoundingClientRect();
    sendCursor((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
  };

  const sendMsg = () => {
    const t = chatText.trim();
    if (!t) return;
    sendChat(t);
    setChatText("");
  };

  const leave = () => {
    leaveRoom();
    navigate("/rooms");
  };

  const openInvite = async () => {
    setInviteOpen(true);
    try {
      const list = await api.get<FriendUser[]>("/api/friends");
      setFriends(Array.isArray(list) ? list : []);
    } catch {
      setFriends([]);
    }
  };

  const invite = async (userId: number) => {
    setInviting(userId);
    try {
      await api.post(`/api/rooms/${roomId}/invite`, { userId });
      setInvited((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    } catch {
      /* ignore */
    } finally {
      setInviting(null);
    }
  };

  if (!Number.isInteger(roomId)) return null;

  if (error || !room || room.id !== roomId) {
    return (
      <div className="room-page">
        <div className="library-empty">
          <p>{error || "Подключаемся к комнате…"}</p>
          <button type="button" className="btn" onClick={() => navigate("/rooms")}>
            К списку комнат
          </button>
        </div>
      </div>
    );
  }

  const knownMembers = members.length
    ? members
    : (room.members || []).map((m) => ({
        userId: m.userId,
        username: m.user?.username || "?",
        avatarUrl: m.user?.avatarUrl ?? null,
      }));

  const roomMode: RoomMode = mode || room.mode || "music";
  const meta = MODE_META[roomMode] || MODE_META.music;
  const ModeIcon = meta.icon;

  const stage =
    roomMode === "watch" ? (
      <WatchStage />
    ) : roomMode === "board" ? (
      <BoardStage />
    ) : roomMode === "draw" ? (
      <DrawStage currentUser={currentUser} />
    ) : (
      <MusicStage />
    );

  return (
    <div className="room-page" ref={stageRef} onMouseMove={onStageMove}>
      {Object.values(cursors).map((c) => (
        <div key={c.userId} className="room-cursor" style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}>
          <span className="room-cursor-dot" />
          <span className="room-cursor-name">{c.username}</span>
        </div>
      ))}

      <div className="room-reactions-layer" aria-hidden>
        {reactions.map((r) => (
          <span key={r.id} className="room-reaction" style={{ left: `${hashLeft(r.id)}%` }} title={r.username}>
            {r.emoji}
          </span>
        ))}
      </div>

      <header className="room-header">
        <div className="room-header-info">
          <span className="room-live">
            <span className="room-live-dot" /> {connected ? "LIVE" : "…"}
          </span>
          <div>
            <h1 className="room-title">{room.name}</h1>
            <p className="room-sub">
              <span className={`room-mode-badge m-${roomMode}`}>
                <ModeIcon /> {meta.label}
              </span>
              <span className="room-sub-dot">·</span>
              {room.isPublic ? <GlobeAltIcon /> : <LockClosedIcon />}
              ведёт @{room.hostName || room.host?.username || "хост"} · {knownMembers.length} в комнате
            </p>
          </div>
        </div>
        <div className="room-header-actions">
          {room.hostId === currentUser.id && (
            <button type="button" className="btn btn-primary" onClick={openInvite}>
              <UserPlusIcon /> Пригласить
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={leave}>
            <ArrowRightOnRectangleIcon /> Выйти
          </button>
        </div>
      </header>
      <div className="room-body">
        {stage}

        <aside className="room-side">
          <div className="room-members">
            <div className="room-section-title">
              <UsersIcon /> В комнате
            </div>
            <div className="room-member-list">
              {knownMembers.map((m) => (
                <span key={m.userId} className="room-member">
                  <Avatar username={m.username} url={m.avatarUrl || undefined} size="sm" />
                  @{m.username}
                  {m.userId === room.hostId && <span className="room-host-tag">хост</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="room-chat">
            <div className="room-section-title">
              <PaperAirplaneIcon /> Чат
            </div>
            <div className="room-chat-log">
              {messages.map((m) => (
                <div key={m.id} className={`room-msg${m.author?.id === currentUser.id ? " mine" : ""}`}>
                  <span className="room-msg-author">@{m.author?.username || "?"}</span>
                  <span className="room-msg-text">{m.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="room-chat-input">
              <input
                className="input"
                value={chatText}
                maxLength={1000}
                placeholder="Сообщение…"
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMsg();
                  }
                }}
              />
              <button type="button" className="btn btn-primary sm" onClick={sendMsg} title="Отправить">
                <PaperAirplaneIcon />
              </button>
            </div>
            <div className="room-reactions-bar">
              {EMOJIS.map((e) => (
                <button key={e} type="button" className="room-emoji" onClick={() => sendReaction(e)} title={`Реакция ${e}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Позвать в комнату">
        {friends.length === 0 ? (
          <div className="library-empty">Нет друзей для приглашения. Добавь друзей — и зови их слушать и творить.</div>
        ) : (
          <div className="room-invite-list">
            {friends.map((f) => {
              const already = invited.includes(f.id) || knownMembers.some((m) => m.userId === f.id);
              return (
                <div key={f.id} className="room-invite-row">
                  <Avatar username={f.username} url={f.avatarUrl || undefined} size="sm" />
                  <span className="room-invite-name">@{f.username}</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={already || inviting === f.id}
                    onClick={() => invite(f.id)}
                  >
                    {already ? (
                      <>
                        <CheckIcon style={{ width: 13, height: 13 }} /> В комнате
                      </>
                    ) : inviting === f.id ? (
                      "Приглашаем…"
                    ) : (
                      <>
                        <UserPlusIcon style={{ width: 13, height: 13 }} /> Позвать
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}

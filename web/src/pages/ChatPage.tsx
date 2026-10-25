import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  XMarkIcon,
  ArrowUturnLeftIcon,
  FaceSmileIcon,
  MapPinIcon,
  CheckIcon,
  PlusIcon,
  PaperClipIcon,
  PencilSquareIcon,
  TrashIcon,
  UserGroupIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/solid";
import FramedAvatar from "../components/ui/FramedAvatar";
import ChatSettingsPanel from "../components/chat/ChatSettingsPanel";
import GroupCreateDialog from "../components/chat/GroupCreateDialog";
import GroupInfoPanel from "../components/chat/GroupInfoPanel";
import { useConfirm } from "../components/ui/confirm";
import { api, getSocket, API_URL } from "../lib/api";
import { timeAgo } from "../lib/feed";
import {
  applyChatSettings,
  loadChatSettings,
  saveChatSettings,
  type ChatSettings,
} from "../lib/chatSettings";
import type {
  ChatMessage,
  ConversationDetail,
  ConversationSummary,
  FriendUser,
  User,
} from "../types";

interface ChatPageProps {
  currentUser: User;
}

interface IncomingPayload {
  message: ChatMessage;
  conversation: {
    id: number;
    type?: "direct" | "group";
    title?: string | null;
    user?: FriendUser | null;
    lastMessage: string;
    lastMessageAt?: string;
  };
}

interface PendingAttachment {
  url: string;
  type: "image" | "video" | "audio" | "file";
  name: string;
  mime?: string;
  size?: number;
}

function attachmentIcon(type?: string | null) {
  if (type === "image") return "🖼️";
  if (type === "video") return "🎬";
  if (type === "audio") return "🎵";
  return "📎";
}

function humanSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function AttachmentView({ m }: { m: ChatMessage }) {
  if (!m.attachmentUrl) return null;
  const url = /^https?:\/\//.test(m.attachmentUrl) ? m.attachmentUrl : `${API_URL}${m.attachmentUrl}`;
  if (m.attachmentType === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="chat-attach-image">
        <img src={url} alt={m.attachmentName || "Изображение"} loading="lazy" />
      </a>
    );
  }
  if (m.attachmentType === "video") {
    return <video className="chat-attach-video" src={url} controls preload="metadata" />;
  }
  if (m.attachmentType === "audio") {
    return <audio className="chat-attach-audio" src={url} controls preload="metadata" />;
  }
  return (
    <a
      className="chat-attach-file"
      href={url}
      target="_blank"
      rel="noreferrer"
      download={m.attachmentName || undefined}
    >
      <DocumentIcon style={{ width: 20, height: 20, flexShrink: 0 }} />
      <span className="chat-attach-file-name line-clamp-1">{m.attachmentName || "Файл"}</span>
      {m.attachmentSize ? <span className="chat-attach-file-size">{humanSize(m.attachmentSize)}</span> : null}
      <ArrowDownTrayIcon style={{ width: 16, height: 16, flexShrink: 0 }} />
    </a>
  );
}

const REACTION_PALETTE = ["❤️", "👍", "🔥", "😂", "😮", "😢"];

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Сегодня";
  if (d.toDateString() === yesterday.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function loadMap<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveMap(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export default function ChatPage({ currentUser }: ChatPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [convos, setConvos] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [mobileChat, setMobileChat] = useState(false);
  const [listQuery, setListQuery] = useState("");
  const [msgQuery, setMsgQuery] = useState("");
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>(() => loadChatSettings());
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [pinned, setPinned] = useState<number[]>(() => loadMap<number[]>("chat-pinned", []));
  const [drafts, setDrafts] = useState<Record<number, string>>(() => loadMap<Record<number, string>>("chat-drafts", {}));
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState<Record<number, boolean>>({});
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [groupDetail, setGroupDetail] = useState<ConversationDetail | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<number[]>([]);

  const confirm = useConfirm();

  const scrollRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef<number | null>(null);
  const convosRef = useRef<ConversationSummary[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const active = convos.find((c) => c.id === activeId) || null;
  const isGroup = active?.type === "group";
  const activeUser = active?.user;
  const groupMembers = useMemo(
    () => groupDetail?.members || active?.members || [],
    [groupDetail, active]
  );
  const activeTitle = isGroup ? active?.title || "Группа" : activeUser?.username || "Пользователь";
  const memberName = useCallback(
    (userId: number) => {
      if (userId === currentUser.id) return "Вы";
      if (!isGroup) return activeUser?.username || "Пользователь";
      return groupMembers.find((m) => m.id === userId)?.username || active?.members?.find((m) => m.id === userId)?.username || "Пользователь";
    },
    [currentUser.id, isGroup, activeUser, groupMembers, active?.members]
  );

  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    convosRef.current = convos;
  }, [convos]);

  useEffect(() => {
    saveChatSettings(settings);
    applyChatSettings(mainRef.current, settings);
  }, [settings]);

  useEffect(() => {
    if (activeId && drafts[activeId]) setText(drafts[activeId]);
    else setText("");
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const openConversation = useCallback(
    async (id: number) => {
      setActiveId(id);
      setMobileChat(true);
      setSearchParams({ c: String(id) }, { replace: true });
      setLoadingMessages(true);
      setError("");
      setReplyTo(null);
      setShowMsgSearch(false);
      setMsgQuery("");
      setEditingId(null);
      setAttachment(null);
      try {
        const rows = await api.get<ChatMessage[]>(`/api/chat/conversations/${id}/messages`);
        setMessages(Array.isArray(rows) ? rows : []);
        setConvos((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
        api.post(`/api/chat/conversations/${id}/read`).catch(() => undefined);
        const convo = convosRef.current.find((c) => c.id === id);
        if (convo?.type === "group") {
          api
            .get<ConversationDetail>(`/api/chat/conversations/${id}`)
            .then((d) => setGroupDetail(d))
            .catch(() => undefined);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки сообщений");
      } finally {
        setLoadingMessages(false);
      }
    },
    [setSearchParams]
  );

  useEffect(() => {
    if (activeId) openConversation(activeId);
  }, [activeId, openConversation]);

  useEffect(() => {
    (async () => {
      const list = await api.get<ConversationSummary[]>("/api/chat/conversations").catch(() => []);
      const safe = Array.isArray(list) ? list : [];
      setConvos(safe);
      setLoadingLists(false);
      const fromUrl = Number(searchParams.get("c"));
      const initial = safe.find((c) => c.id === fromUrl)?.id ?? safe[0]?.id ?? null;
      if (initial) {
        setActiveId(initial);
        setMobileChat(Boolean(fromUrl));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const socket = getSocket();
    const onMessage = ({ message, conversation }: IncomingPayload) => {
      const isActive = conversation.id === activeRef.current;
      setConvos((prev) => {
        const existing = prev.find((c) => c.id === conversation.id);
        const updated: ConversationSummary = {
          id: conversation.id,
          type: conversation.type || existing?.type || "direct",
          title: conversation.title ?? existing?.title ?? null,
          user: conversation.user !== undefined ? conversation.user : existing?.user ?? null,
          members: existing?.members,
          memberCount: existing?.memberCount,
          role: existing?.role,
          lastMessage: conversation.lastMessage,
          lastMessageAt: conversation.lastMessageAt,
          unread: isActive ? 0 : (existing?.unread || 0) + (message.senderId === currentUser.id ? 0 : 1),
        };
        return [updated, ...prev.filter((c) => c.id !== conversation.id)];
      });
      if (isActive) {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      }
    };
    const onRead = ({ conversationId, by }: { conversationId: number; by?: number }) => {
      if (conversationId === activeRef.current && by !== currentUser.id) {
        setMessages((prev) => prev.map((m) => (m.readAt ? m : { ...m, readAt: new Date().toISOString() })));
      }
    };
    const onTyping = ({ from, typing: isTyping, conversationId }: { from: number; typing: boolean; conversationId?: number }) => {
      const current = convosRef.current.find((c) => c.id === activeRef.current);
      if (conversationId && current?.type === "group") {
        setTypingUsers((prev) =>
          isTyping ? (prev.includes(from) ? prev : [...prev, from]) : prev.filter((id) => id !== from)
        );
        return;
      }
      if (current?.user?.id === from) setTyping(isTyping);
    };
    const onReaction = ({ messageId, reactions }: { messageId: number; reactions: ChatMessage["reactions"] }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
    };
    const onEdited = ({ messageId, text, editedAt }: { messageId: number; text: string; editedAt: string }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, text, editedAt } : m)));
    };
    const onDeleted = ({ messageId }: { messageId: number }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };
    const onConversation = ({ conversationId, removed }: { conversationId: number; removed?: boolean }) => {
      if (removed) {
        setConvos((prev) => prev.filter((c) => c.id !== conversationId));
        if (activeRef.current === conversationId) {
          setActiveId(null);
          setGroupDetail(null);
          setGroupInfoOpen(false);
        }
        return;
      }
      api
        .get<ConversationSummary[]>("/api/chat/conversations")
        .then((list) => {
          if (Array.isArray(list)) setConvos(list);
        })
        .catch(() => undefined);
    };
    const onConversationUpdated = ({ conversationId, title }: { conversationId: number; title?: string | null }) => {
      if (title !== undefined) {
        setConvos((prev) => prev.map((c) => (c.id === conversationId ? { ...c, title } : c)));
        setGroupDetail((prev) => (prev && prev.id === conversationId ? { ...prev, title } : prev));
      }
    };
    const onPresence = ({ userId, online: isOnline, lastSeenAt }: { userId: number; online: boolean; lastSeenAt?: string }) => {
      setOnline((prev) => ({ ...prev, [userId]: isOnline }));
      if (!isOnline && lastSeenAt) {
        setConvos((prev) => prev.map((c) => (c.user?.id === userId ? { ...c, user: { ...c.user, lastSeenAt } } : c)));
      }
    };
    socket.on("chat:message", onMessage);
    socket.on("chat:read", onRead);
    socket.on("chat:typing", onTyping);
    socket.on("chat:reaction", onReaction);
    socket.on("chat:message-edited", onEdited);
    socket.on("chat:message-deleted", onDeleted);
    socket.on("chat:conversation", onConversation);
    socket.on("chat:conversation-updated", onConversationUpdated);
    socket.on("presence", onPresence);
    return () => {
      socket.off("chat:message", onMessage);
      socket.off("chat:read", onRead);
      socket.off("chat:typing", onTyping);
      socket.off("chat:reaction", onReaction);
      socket.off("chat:message-edited", onEdited);
      socket.off("chat:message-deleted", onDeleted);
      socket.off("chat:conversation", onConversation);
      socket.off("chat:conversation-updated", onConversationUpdated);
      socket.off("presence", onPresence);
    };
  }, [currentUser.id]);

  const setDraft = (id: number, value: string) => {
    setText(value);
    setDrafts((prev) => {
      const next = { ...prev };
      if (value) next[id] = value;
      else delete next[id];
      saveMap("chat-drafts", next);
      return next;
    });
  };

  const typingPayload = (typing: boolean) =>
    isGroup
      ? { conversationId: activeId, typing }
      : { to: activeUser?.id, conversationId: activeId, typing };

  const notifyTyping = () => {
    if (!activeId || (!isGroup && !activeUser)) return;
    const socket = getSocket();
    socket.emit("chat:typing", typingPayload(true));
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("chat:typing", typingPayload(false));
    }, 1500);
  };

  const send = async () => {
    if (!activeId || (!text.trim() && !attachment) || sending) return;
    setSending(true);
    setError("");
    const value = text.trim();
    try {
      const msg = await api.post<ChatMessage>(`/api/chat/conversations/${activeId}/messages`, {
        text: value,
        replyToId: replyTo?.id,
        attachment: attachment || undefined,
      });
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setText("");
      setReplyTo(null);
      setAttachment(null);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[activeId];
        saveMap("chat-drafts", next);
        return next;
      });
      getSocket().emit("chat:typing", typingPayload(false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить");
    } finally {
      setSending(false);
    }
  };

  const pickFile = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.postForm<{ url: string; type: string; mime?: string; size?: number; originalName?: string }>(
        "/api/upload/file",
        form
      );
      setAttachment({
        url: res.url,
        type: (res.type as PendingAttachment["type"]) || "file",
        name: res.originalName || file.name,
        mime: res.mime,
        size: res.size,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить файл");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startEdit = (m: ChatMessage) => {
    setEditingId(m.id);
    setEditText(m.text || "");
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    const value = editText.trim();
    if (!value) return;
    try {
      await api.patch(`/api/chat/messages/${editingId}`, { text: value });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingId ? { ...m, text: value, editedAt: new Date().toISOString() } : m
        )
      );
      setEditingId(null);
      setEditText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить изменения");
    }
  };

  const deleteMessage = async (m: ChatMessage) => {
    const ok = await confirm({
      title: "Удалить сообщение",
      message: "Удалить это сообщение? Действие необратимо.",
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/api/chat/messages/${m.id}`);
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить сообщение");
    }
  };

  const toggleReaction = async (message: ChatMessage, emoji: string) => {
    setPickerFor(null);
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== message.id) return m;
        const list = [...(m.reactions || [])];
        const idx = list.findIndex((r) => r.emoji === emoji);
        if (idx >= 0) {
          const r = { ...list[idx] };
          r.mine = !r.mine;
          r.count += r.mine ? 1 : -1;
          if (r.count <= 0) list.splice(idx, 1);
          else list[idx] = r;
        } else {
          list.push({ emoji, count: 1, mine: true, users: [{ id: currentUser.id, username: currentUser.username }] });
        }
        return { ...m, reactions: list };
      })
    );
    try {
      await api.post(`/api/chat/messages/${message.id}/reactions`, { emoji });
    } catch {
      /* ignore */
    }
  };

  const filteredConversations = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    const list = q
      ? convos.filter(
          (c) =>
            (c.user?.username || c.title || "").toLowerCase().includes(q) ||
            (c.lastMessage || "").toLowerCase().includes(q)
        )
      : convos;
    const pinnedList = pinned.map((id) => list.find((c) => c.id === id)).filter(Boolean) as ConversationSummary[];
    const rest = list.filter((c) => !pinned.includes(c.id));
    return { pinnedList, rest };
  }, [convos, listQuery, pinned]);

  const shownMessages = useMemo(() => {
    const q = msgQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => (m.text || "").toLowerCase().includes(q));
  }, [messages, msgQuery]);

  const togglePinChat = (id: number) => {
    setPinned((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      saveMap("chat-pinned", next);
      return next;
    });
  };

  const statusText = () => {
    if (typing) return "печатает…";
    if (activeUser && online[activeUser.id]) return "в сети";
    if (activeUser?.lastSeenAt) return `был(а) ${timeAgo(activeUser.lastSeenAt)}`;
    return "не в сети";
  };

  const renderConvo = (c: ConversationSummary) => {
    const cIsGroup = c.type === "group";
    return (
    <button
      key={c.id}
      className={`chat-convo${c.id === activeId ? " active" : ""}`}
      onClick={() => setActiveId(c.id)}
    >
      <FramedAvatar
        username={cIsGroup ? c.title || "Группа" : c.user?.username || "?"}
        url={(cIsGroup ? c.avatarUrl : c.user?.avatarUrl) || undefined}
        frameId={cIsGroup ? undefined : c.user?.frameId}
        size="sm"
      />
      <div className="chat-convo-info">
        <div className="chat-convo-name">
          {cIsGroup ? c.title || "Группа" : c.user?.username || "Пользователь"}
          {!cIsGroup && online[c.user?.id ?? -1] && <span className="chat-online-dot" />}
          {cIsGroup && (
            <UserGroupIcon style={{ width: 12, height: 12, marginLeft: 4, opacity: 0.6 }} />
          )}
        </div>
        <div className="chat-convo-preview line-clamp-1">
          {drafts[c.id] ? <span className="chat-draft-tag">Черновик: </span> : null}
          {drafts[c.id] || c.lastMessage || "Нет сообщений"}
        </div>
      </div>
      {c.unread > 0 && <span className="chat-unread">{c.unread > 9 ? "9+" : c.unread}</span>}
      <span
        className={`chat-pin-btn${pinned.includes(c.id) ? " active" : ""}`}
        role="button"
        tabIndex={-1}
        title={pinned.includes(c.id) ? "Открепить" : "Закрепить"}
        onClick={(e) => {
          e.stopPropagation();
          togglePinChat(c.id);
        }}
      >
        <MapPinIcon style={{ width: 13, height: 13 }} />
      </span>
    </button>
    );
  };

  return (
    <div className={`chat-page${mobileChat ? " show-chat" : ""}`}>
      <aside className="chat-sidebar">
        <div className="chat-sidebar-head">
          <ChatBubbleLeftRightIcon style={{ width: 18, height: 18 }} />
          <strong>Сообщения</strong>
          <button
            className="icon-btn sm chat-new-group"
            title="Новая группа"
            aria-label="Новая группа"
            onClick={() => setGroupDialogOpen(true)}
          >
            <PlusIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div className="chat-list-search">
          <MagnifyingGlassIcon style={{ width: 15, height: 15 }} />
          <input
            className="input"
            placeholder="Поиск чатов…"
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
          />
        </div>
        {loadingLists ? (
          <div className="chat-empty">Загрузка…</div>
        ) : convos.length === 0 ? (
          <div className="chat-empty">
            <p>Пока нет диалогов.</p>
            <p className="text-text-secondary" style={{ fontSize: "0.8rem" }}>
              Добавьте друзей, чтобы начать общение.
            </p>
          </div>
        ) : (
          <div className="chat-convo-list">
            {filteredConversations.pinnedList.length > 0 && (
              <>
                <div className="chat-list-group">Закреплённые</div>
                {filteredConversations.pinnedList.map(renderConvo)}
              </>
            )}
            {filteredConversations.pinnedList.length > 0 && filteredConversations.rest.length > 0 && (
              <div className="chat-list-group">Все чаты</div>
            )}
            {filteredConversations.rest.map(renderConvo)}
            {filteredConversations.pinnedList.length === 0 && filteredConversations.rest.length === 0 && (
              <div className="chat-empty">Ничего не найдено.</div>
            )}
          </div>
        )}
      </aside>

      <section className="chat-main" ref={mainRef} data-chat-bg={settings.background}>
        {!activeId || !active ? (
          <div className="chat-placeholder">
            <ChatBubbleLeftRightIcon style={{ width: 44, height: 44, opacity: 0.35 }} />
            <p>Выберите диалог, чтобы начать общение</p>
          </div>
        ) : (
          <>
            <header className="chat-header">
              <button className="icon-btn sm chat-back" onClick={() => setMobileChat(false)} aria-label="Назад">
                <ArrowLeftIcon style={{ width: 16, height: 16 }} />
              </button>
              <FramedAvatar
                username={isGroup ? activeTitle : activeUser?.username || "?"}
                url={(isGroup ? active?.avatarUrl : activeUser?.avatarUrl) || undefined}
                frameId={isGroup ? undefined : activeUser?.frameId}
                size="sm"
              />
              <div className="chat-header-info">
                <strong>{activeTitle}</strong>
                {isGroup ? (
                  <span className="chat-status">
                    {groupMembers.length || active?.memberCount || 0} участников
                  </span>
                ) : (
                  <span className={`chat-status${typing ? " typing" : activeUser && online[activeUser.id] ? " online" : ""}`}>
                    {statusText()}
                  </span>
                )}
              </div>
              <button
                className="icon-btn sm"
                onClick={() => setShowMsgSearch((v) => !v)}
                title="Поиск по сообщениям"
                aria-label="Поиск по сообщениям"
              >
                <MagnifyingGlassIcon style={{ width: 16, height: 16 }} />
              </button>
              {isGroup && (
                <button
                  className={`icon-btn sm${groupInfoOpen ? " active" : ""}`}
                  onClick={() => setGroupInfoOpen((v) => !v)}
                  title="Информация о группе"
                  aria-label="Информация о группе"
                >
                  <UserGroupIcon style={{ width: 16, height: 16 }} />
                </button>
              )}
              <button
                className={`icon-btn sm${settingsOpen ? " active" : ""}`}
                onClick={() => setSettingsOpen((v) => !v)}
                title="Настройки чата"
                aria-label="Настройки чата"
              >
                <Cog6ToothIcon style={{ width: 16, height: 16 }} />
              </button>
            </header>

            {showMsgSearch && (
              <div className="chat-msg-search">
                <MagnifyingGlassIcon style={{ width: 15, height: 15 }} />
                <input
                  className="input"
                  autoFocus
                  placeholder="Поиск по сообщениям…"
                  value={msgQuery}
                  onChange={(e) => setMsgQuery(e.target.value)}
                />
                <button className="icon-btn sm" onClick={() => { setMsgQuery(""); setShowMsgSearch(false); }} aria-label="Закрыть поиск">
                  <XMarkIcon style={{ width: 15, height: 15 }} />
                </button>
              </div>
            )}

            <div className="chat-messages" ref={scrollRef}>
              {loadingMessages ? (
                <div className="chat-empty">Загрузка сообщений…</div>
              ) : shownMessages.length === 0 ? (
                <div className="chat-empty">
                  {msgQuery ? "Ничего не найдено." : "Начните переписку — напишите первое сообщение."}
                </div>
              ) : (
                shownMessages.map((m, i) => {
                  const mine = m.senderId === currentUser.id;
                  const prev = shownMessages[i - 1];
                  const showDate = !prev || !sameDay(prev.createdAt, m.createdAt);
                  const grouped =
                    prev &&
                    prev.senderId === m.senderId &&
                    sameDay(prev.createdAt, m.createdAt) &&
                    new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
                  const senderName = mine ? currentUser.username : m.sender?.username || memberName(m.senderId);
                  const senderUser = m.sender || (isGroup ? groupMembers.find((g) => g.id === m.senderId) : activeUser);
                  const canEdit = mine && !!m.text;
                  const canDelete =
                    mine || (isGroup && (groupDetail?.role === "owner" || groupDetail?.role === "admin"));
                  const isRead = isGroup ? (m.readBy || 0) > 0 : !!m.readAt;
                  return (
                    <div key={m.id}>
                      {showDate && <div className="chat-date-sep"><span>{dayLabel(m.createdAt)}</span></div>}
                      <div className={`chat-bubble-row${mine ? " mine" : ""}${grouped ? " grouped" : ""}`}>
                        {!mine && (
                          <span className="chat-bubble-avatar">
                            {!grouped && (
                              <FramedAvatar
                                username={senderUser?.username || senderName}
                                url={senderUser?.avatarUrl || undefined}
                                frameId={senderUser?.frameId}
                                size="xs"
                              />
                            )}
                          </span>
                        )}
                        <div className="chat-bubble-wrap">
                          {isGroup && !mine && !grouped && (
                            <div className="chat-sender-name">{senderName}</div>
                          )}
                          <div className={`chat-bubble${mine ? " mine" : ""}`}>
                            {m.replyTo && (
                              <div className="chat-quote">
                                <span className="chat-quote-author">{memberName(m.replyTo.senderId)}</span>
                                <span className="chat-quote-text line-clamp-1">
                                  {m.replyTo.text || "Вложение"}
                                </span>
                              </div>
                            )}
                            {editingId === m.id ? (
                              <div className="chat-edit">
                                <textarea
                                  className="input"
                                  value={editText}
                                  rows={2}
                                  maxLength={4000}
                                  onChange={(e) => setEditText(e.target.value)}
                                />
                                <div className="chat-edit-actions">
                                  <button
                                    className="icon-btn sm"
                                    onClick={() => {
                                      setEditingId(null);
                                      setEditText("");
                                    }}
                                    aria-label="Отмена"
                                  >
                                    <XMarkIcon style={{ width: 14, height: 14 }} />
                                  </button>
                                  <button className="icon-btn sm" onClick={saveEdit} aria-label="Сохранить">
                                    <CheckIcon style={{ width: 14, height: 14 }} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {m.attachmentUrl && <AttachmentView m={m} />}
                                {m.text && <div className="chat-text">{m.text}</div>}
                              </>
                            )}
                            <div className="chat-meta">
                              {m.editedAt && <span className="chat-edited">изменено</span>}
                              {timeLabel(m.createdAt)}
                              {mine && (
                                <span className={`chat-ticks${isRead ? " read" : ""}`}>
                                  <CheckIcon style={{ width: 12, height: 12 }} />
                                  <CheckIcon style={{ width: 12, height: 12, marginLeft: -6 }} />
                                  {isGroup && (m.readBy || 0) > 0 && (
                                    <span className="chat-readby">{m.readBy}</span>
                                  )}
                                </span>
                              )}
                            </div>
                            {(m.reactions?.length || 0) > 0 && (
                              <div className="chat-reactions">
                                {m.reactions!.map((r) => (
                                  <button
                                    key={r.emoji}
                                    className={`chat-reaction${r.mine ? " mine" : ""}`}
                                    title={r.users.map((u) => u.username).join(", ")}
                                    onClick={() => toggleReaction(m, r.emoji)}
                                  >
                                    {r.emoji} {r.count}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className={`chat-actions${mine ? " mine" : ""}`}>
                            <button className="icon-btn sm" title="Ответить" onClick={() => { setReplyTo(m); }}>
                              <ArrowUturnLeftIcon style={{ width: 14, height: 14 }} />
                            </button>
                            <div className="chat-reaction-picker-wrap">
                              <button
                                className="icon-btn sm"
                                title="Реакция"
                                onClick={() => setPickerFor((p) => (p === m.id ? null : m.id))}
                              >
                                <FaceSmileIcon style={{ width: 14, height: 14 }} />
                              </button>
                              {pickerFor === m.id && (
                                <div className="chat-reaction-picker">
                                  {REACTION_PALETTE.map((e) => (
                                    <button key={e} onClick={() => toggleReaction(m, e)}>
                                      {e}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            {canEdit && (
                              <button
                                className="icon-btn sm"
                                title="Изменить"
                                onClick={() => startEdit(m)}
                              >
                                <PencilSquareIcon style={{ width: 14, height: 14 }} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                className="icon-btn sm"
                                title="Удалить"
                                onClick={() => deleteMessage(m)}
                              >
                                <TrashIcon style={{ width: 14, height: 14 }} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!isGroup && typing && (
              <div className="chat-typing-indicator">{activeUser?.username} печатает…</div>
            )}
            {isGroup && typingUsers.length > 0 && (
              <div className="chat-typing-indicator">
                {typingUsers.map((id) => memberName(id)).join(", ")} печатает…
              </div>
            )}
            {error && <div className="chat-error">{error}</div>}

            {replyTo && (
              <div className="chat-reply-preview">
                <ArrowUturnLeftIcon style={{ width: 14, height: 14 }} />
                <div>
                  <div className="chat-reply-author">
                    Ответ {replyTo.senderId === currentUser.id ? "себе" : memberName(replyTo.senderId)}
                  </div>
                  <div className="chat-reply-text line-clamp-1">{replyTo.text || "Вложение"}</div>
                </div>
                <button className="icon-btn sm" onClick={() => setReplyTo(null)} aria-label="Отменить ответ">
                  <XMarkIcon style={{ width: 15, height: 15 }} />
                </button>
              </div>
            )}

            {attachment && (
              <div className="chat-attach-preview">
                <span className="chat-attach-preview-icon">{attachmentIcon(attachment.type)}</span>
                <span className="chat-attach-preview-name line-clamp-1">{attachment.name}</span>
                {attachment.size ? (
                  <span className="chat-attach-preview-size">{humanSize(attachment.size)}</span>
                ) : null}
                <button
                  className="icon-btn sm"
                  onClick={() => setAttachment(null)}
                  aria-label="Убрать вложение"
                >
                  <XMarkIcon style={{ width: 15, height: 15 }} />
                </button>
              </div>
            )}

            <form
              className="chat-input-row"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <button
                type="button"
                className="icon-btn sm chat-attach-btn"
                title="Прикрепить файл"
                aria-label="Прикрепить файл"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <PaperClipIcon style={{ width: 17, height: 17 }} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pickFile(f);
                }}
              />
              <input
                type="text"
                className="input"
                placeholder={uploading ? "Загрузка файла…" : "Написать сообщение…"}
                value={text}
                maxLength={4000}
                onChange={(e) => {
                  setDraft(activeId, e.target.value);
                  notifyTyping();
                }}
              />
              <button
                className="btn btn-primary"
                type="submit"
                disabled={sending || uploading || (!text.trim() && !attachment)}
              >
                <PaperAirplaneIcon style={{ width: 16, height: 16 }} />
              </button>
            </form>
          </>
        )}

        {settingsOpen && (
          <ChatSettingsPanel
            settings={settings}
            onChange={setSettings}
            onClose={() => setSettingsOpen(false)}
          />
        )}

        {isGroup && groupInfoOpen && activeId && (
          <GroupInfoPanel
            conversationId={activeId}
            currentUser={currentUser}
            onClose={() => setGroupInfoOpen(false)}
            onUpdated={(d) => {
              setGroupDetail(d);
              setConvos((prev) =>
                prev.map((c) =>
                  c.id === d.id
                    ? { ...c, title: d.title, members: d.members, memberCount: d.memberCount }
                    : c
                )
              );
            }}
            onLeft={() => {
              setGroupInfoOpen(false);
              setActiveId(null);
              setGroupDetail(null);
              setConvos((prev) => prev.filter((c) => c.id !== activeId));
            }}
          />
        )}
      </section>

      <GroupCreateDialog
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        onCreated={(convo) => {
          setConvos((prev) => [
            {
              id: convo.id,
              type: "group",
              title: convo.title,
              avatarUrl: convo.avatarUrl,
              user: null,
              members: convo.members,
              memberCount: convo.memberCount,
              role: convo.role,
              lastMessage: "",
              lastMessageAt: new Date().toISOString(),
              unread: 0,
            },
            ...prev,
          ]);
          setActiveId(convo.id);
          setMobileChat(true);
        }}
      />
    </div>
  );
}

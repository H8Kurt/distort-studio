import { useEffect, useMemo, useState } from "react";
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
  CheckIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/solid";
import FramedAvatar from "../ui/FramedAvatar";
import { api } from "../../lib/api";
import { useConfirm } from "../ui/confirm";
import type { ConversationDetail, FriendUser, User } from "../../types";

interface GroupInfoPanelProps {
  conversationId: number;
  currentUser: User;
  onClose: () => void;
  onUpdated: (detail: ConversationDetail) => void;
  onLeft: () => void;
}

export default function GroupInfoPanel({
  conversationId,
  currentUser,
  onClose,
  onUpdated,
  onLeft,
}: GroupInfoPanelProps) {
  const confirm = useConfirm();
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedAdd, setSelectedAdd] = useState<number[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      api.get<ConversationDetail>(`/api/chat/conversations/${conversationId}`),
      api.get<FriendUser[]>("/api/friends").catch(() => []),
    ])
      .then(([d, f]) => {
        if (!alive) return;
        setDetail(d);
        setTitleDraft(d.title || "");
        setFriends(Array.isArray(f) ? f : []);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : "Ошибка загрузки");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [conversationId]);

  const isManager = detail?.role === "owner" || detail?.role === "admin";
  const memberIds = useMemo(() => new Set((detail?.members || []).map((m) => m.id)), [detail]);
  const addableFriends = useMemo(
    () => friends.filter((f) => !memberIds.has(f.id)),
    [friends, memberIds]
  );

  const saveTitle = async () => {
    const title = titleDraft.trim();
    if (!title || !detail) return;
    try {
      const updated = await api.patch<{ title: string }>(`/api/chat/conversations/${detail.id}`, { title });
      const next = { ...detail, title: updated.title };
      setDetail(next);
      onUpdated(next);
      setEditingTitle(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось переименовать");
    }
  };

  const addMembers = async () => {
    if (!detail || selectedAdd.length === 0) return;
    try {
      const res = await api.post<{ members: ConversationDetail["members"] }>(
        `/api/chat/conversations/${detail.id}/members`,
        { userIds: selectedAdd }
      );
      const next = { ...detail, members: res.members, memberCount: res.members.length };
      setDetail(next);
      onUpdated(next);
      setSelectedAdd([]);
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить участников");
    }
  };

  const removeMember = async (userId: number, username: string) => {
    if (!detail) return;
    const ok = await confirm({
      title: "Исключить участника",
      message: `Исключить ${username} из группы?`,
      confirmLabel: "Исключить",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/api/chat/conversations/${detail.id}/members/${userId}`);
      const next = {
        ...detail,
        members: detail.members.filter((m) => m.id !== userId),
        memberCount: detail.memberCount - 1,
      };
      setDetail(next);
      onUpdated(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось исключить участника");
    }
  };

  const leave = async () => {
    if (!detail) return;
    const ok = await confirm({
      title: "Выйти из группы",
      message: "Вы уверены, что хотите выйти из группы?",
      confirmLabel: "Выйти",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/api/chat/conversations/${detail.id}/members/${currentUser.id}`);
      onLeft();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось выйти из группы");
    }
  };

  return (
    <div className="chat-settings group-info">
      <div className="chat-settings-head">
        <strong>О группе</strong>
        <button className="icon-btn sm" onClick={onClose} aria-label="Закрыть">
          <XMarkIcon style={{ width: 16, height: 16 }} />
        </button>
      </div>

      <div className="chat-settings-body">
        {loading ? (
          <div className="chat-empty">Загрузка…</div>
        ) : !detail ? (
          <div className="chat-error">{error || "Не удалось загрузить группу"}</div>
        ) : (
          <>
            <div className="group-info-head">
              <FramedAvatar
                username={detail.title || "Группа"}
                url={detail.avatarUrl || undefined}
                size="lg"
              />
              {editingTitle ? (
                <div className="group-info-rename">
                  <input
                    className="input"
                    value={titleDraft}
                    maxLength={120}
                    autoFocus
                    onChange={(e) => setTitleDraft(e.target.value)}
                  />
                  <button className="icon-btn sm" onClick={saveTitle} aria-label="Сохранить">
                    <CheckIcon style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              ) : (
                <div className="group-info-title">
                  <span>{detail.title}</span>
                  {isManager && (
                    <button
                      className="icon-btn sm"
                      onClick={() => setEditingTitle(true)}
                      title="Переименовать"
                      aria-label="Переименовать"
                    >
                      <PencilSquareIcon style={{ width: 15, height: 15 }} />
                    </button>
                  )}
                </div>
              )}
              <span className="group-info-count">{detail.memberCount} участников</span>
            </div>

            {error && <div className="chat-error">{error}</div>}

            {isManager && (
              <div className="chat-setting-group">
                {adding ? (
                  <div className="group-add-members">
                    <div className="group-picker-list">
                      {addableFriends.length === 0 ? (
                        <div className="chat-empty">Все друзья уже в группе.</div>
                      ) : (
                        addableFriends.map((f) => {
                          const checked = selectedAdd.includes(f.id);
                          return (
                            <button
                              key={f.id}
                              type="button"
                              className={`group-picker-item${checked ? " selected" : ""}`}
                              onClick={() =>
                                setSelectedAdd((prev) =>
                                  prev.includes(f.id) ? prev.filter((x) => x !== f.id) : [...prev, f.id]
                                )
                              }
                            >
                              <FramedAvatar
                                username={f.username}
                                url={f.avatarUrl || undefined}
                                frameId={f.frameId}
                                size="sm"
                              />
                              <span className="group-picker-name">{f.username}</span>
                              {checked && (
                                <CheckIcon className="group-picker-check" style={{ width: 16, height: 16 }} />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                    <div className="group-add-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setAdding(false)}>
                        Отмена
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={addMembers}
                        disabled={selectedAdd.length === 0}
                      >
                        Добавить
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-secondary btn-sm group-add-btn" onClick={() => setAdding(true)}>
                    <PlusIcon style={{ width: 15, height: 15 }} /> Добавить участников
                  </button>
                )}
              </div>
            )}

            <div className="chat-setting-group">
              <span className="chat-setting-label">Участники</span>
              <div className="group-member-list">
                {detail.members.map((m) => (
                  <div key={m.id} className="group-member">
                    <FramedAvatar
                      username={m.username}
                      url={m.avatarUrl || undefined}
                      frameId={m.frameId}
                      size="sm"
                    />
                    <div className="group-member-info">
                      <span className="group-member-name">
                        {m.username}
                        {m.id === currentUser.id && " (вы)"}
                      </span>
                      {m.role !== "member" && (
                        <span className="group-member-role">
                          {m.role === "owner" ? "Владелец" : "Админ"}
                        </span>
                      )}
                    </div>
                    {isManager && m.role !== "owner" && m.id !== currentUser.id && (
                      <button
                        className="icon-btn sm"
                        title="Исключить"
                        aria-label="Исключить"
                        onClick={() => removeMember(m.id, m.username)}
                      >
                        <TrashIcon style={{ width: 15, height: 15 }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {detail && (
        <button className="btn btn-secondary btn-sm chat-settings-reset group-leave-btn" onClick={leave}>
          <ArrowRightOnRectangleIcon style={{ width: 15, height: 15 }} /> Выйти из группы
        </button>
      )}
    </div>
  );
}

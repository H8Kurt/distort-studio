import { useEffect, useMemo, useState } from "react";
import { MagnifyingGlassIcon, CheckIcon } from "@heroicons/react/24/solid";
import Modal from "../ui/Modal";
import FramedAvatar from "../ui/FramedAvatar";
import { api } from "../../lib/api";
import type { ConversationDetail, FriendUser } from "../../types";

interface GroupCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (conversation: ConversationDetail) => void;
}

export default function GroupCreateDialog({ open, onClose, onCreated }: GroupCreateDialogProps) {
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setQuery("");
    setSelected([]);
    setError("");
    setLoading(true);
    api
      .get<FriendUser[]>("/api/friends")
      .then((list) => setFriends(Array.isArray(list) ? list : []))
      .catch(() => setFriends([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => f.username.toLowerCase().includes(q));
  }, [friends, query]);

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const create = async () => {
    const name = title.trim();
    if (!name) {
      setError("Введите название группы");
      return;
    }
    if (selected.length === 0) {
      setError("Выберите хотя бы одного участника");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const convo = await api.post<ConversationDetail>("/api/chat/conversations/group", {
        title: name,
        memberIds: selected,
      });
      onCreated(convo);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать группу");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новая группа"
      maxWidth={460}
      footer={
        <div className="modal-foot-actions">
          <button className="btn btn-secondary btn-sm" type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary btn-sm" type="button" onClick={create} disabled={saving}>
            {saving ? "Создание…" : "Создать группу"}
          </button>
        </div>
      }
    >
      <div className="group-create-form">
        <input
          className="input"
          placeholder="Название группы"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="chat-list-search">
          <MagnifyingGlassIcon style={{ width: 15, height: 15 }} />
          <input
            className="input"
            placeholder="Поиск друзей…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error && <div className="chat-error">{error}</div>}

        <div className="group-picker-list">
          {loading ? (
            <div className="chat-empty">Загрузка…</div>
          ) : filtered.length === 0 ? (
            <div className="chat-empty">Нет доступных друзей.</div>
          ) : (
            filtered.map((f) => {
              const checked = selected.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`group-picker-item${checked ? " selected" : ""}`}
                  onClick={() => toggle(f.id)}
                >
                  <FramedAvatar
                    username={f.username}
                    url={f.avatarUrl || undefined}
                    frameId={f.frameId}
                    size="sm"
                  />
                  <span className="group-picker-name">{f.username}</span>
                  {checked && <CheckIcon className="group-picker-check" style={{ width: 16, height: 16 }} />}
                </button>
              );
            })
          )}
        </div>
        <div className="group-picker-count">Выбрано: {selected.length}</div>
      </div>
    </Modal>
  );
}

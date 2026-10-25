import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PaperAirplaneIcon, TrashIcon } from "@heroicons/react/24/solid";
import { api, getSocket } from "../lib/api";
import Avatar from "./ui/Avatar";
import ReportButton from "./ui/ReportButton";
import type { PostComment } from "../types";

interface PostCommentsProps {
  postId: number;
  currentUserId: number;
  postOwnerId: number;
}

export default function PostComments({ postId, currentUserId, postOwnerId }: PostCommentsProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<PostComment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<PostComment[]>(`/api/posts/${postId}/comments`);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const onCreated = ({ postId: pid, comment }: { postId: number; comment: PostComment }) => {
      if (pid !== postId) return;
      setItems((prev) => (prev.some((c) => c.id === comment.id) ? prev : [...prev, comment]));
    };
    const onRemoved = ({ postId: pid, commentId }: { postId: number; commentId: number }) => {
      if (pid !== postId) return;
      setItems((prev) => prev.filter((c) => c.id !== commentId));
    };
    socket.on("postcomment:created", onCreated);
    socket.on("postcomment:removed", onRemoved);
    return () => {
      socket.off("postcomment:created", onCreated);
      socket.off("postcomment:removed", onRemoved);
    };
  }, [postId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    try {
      await api.post<PostComment>(`/api/posts/${postId}/comments`, { content });
      setText("");
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setItems((prev) => prev.filter((c) => c.id !== id));
    try {
      await api.del(`/api/posts/${postId}/comments/${id}`);
    } catch {
      load();
    }
  };

  const canDelete = (c: PostComment) =>
    c.userId === currentUserId || postOwnerId === currentUserId;

  return (
    <div className="post-comments">
      {loading ? (
        <p className="text-text-tertiary" style={{ fontSize: "0.8rem" }}>Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-text-tertiary" style={{ fontSize: "0.8rem" }}>Комментариев пока нет.</p>
      ) : (
        <ul className="post-comment-list">
          {items.map((c) => (
            <li key={c.id} className="post-comment">
              <button className="post-comment-avatar" onClick={() => c.author && navigate(`/u/${c.author.id}`)}>
                <Avatar username={c.author?.username || "?"} url={c.author?.avatarUrl || undefined} size="xs" />
              </button>
              <div className="post-comment-body">
                <span className="post-comment-author">@{c.author?.username || "unknown"}</span>
                <span className="post-comment-text">{c.content}</span>
              </div>
              {canDelete(c) ? (
                <button className="icon-btn sm" onClick={() => remove(c.id)} aria-label="Удалить комментарий">
                  <TrashIcon style={{ width: 12, height: 12 }} />
                </button>
              ) : (
                c.userId !== currentUserId && <ReportButton targetType="comment" targetId={c.id} />
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="post-comment-form" onSubmit={submit}>
        <Avatar username="?" size="xs" />
        <input
          className="input"
          placeholder="Написать комментарий…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" disabled={busy || !text.trim()} aria-label="Отправить">
          <PaperAirplaneIcon style={{ width: 14, height: 14 }} />
        </button>
      </form>
    </div>
  );
}

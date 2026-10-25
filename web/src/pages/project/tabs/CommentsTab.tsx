import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PaperAirplaneIcon, TrashIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";
import Avatar from "../../../components/ui/Avatar";
import ReportButton from "../../../components/ui/ReportButton";
import { useConfirm } from "../../../components/ui/confirm";
import { api, getSocket } from "../../../lib/api";
import type { Comment, User } from "../../../types";

interface CommentsTabProps {
  projectId: number;
  currentUser: User;
  canModerate: boolean;
}

export default function CommentsTab({ projectId, currentUser, canModerate }: CommentsTabProps) {
  const confirm = useConfirm();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Comment[]>(`/api/projects/${projectId}/comments`);
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки комментариев");
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const onCreated = (item: Comment) => {
      setComments((prev) => (prev.some((c) => c.id === item.id) ? prev : [...prev, item]));
    };
    const onRemoved = ({ id }: { id: number }) => {
      setComments((prev) => prev.filter((c) => c.id !== id && c.parentId !== id));
    };
    socket.on("comment:created", onCreated);
    socket.on("comment:removed", onRemoved);
    return () => {
      socket.off("comment:created", onCreated);
      socket.off("comment:removed", onRemoved);
    };
  }, []);

  const tree = useMemo(() => {
    const roots = comments.filter((c) => !c.parentId);
    return roots.map((c) => ({
      ...c,
      replies: comments.filter((r) => r.parentId === c.id),
    }));
  }, [comments]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/projects/${projectId}/comments`, {
        content: content.trim(),
        parentId: replyTo || undefined,
      });
      setContent("");
      setReplyTo(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (commentId: number) => {
    const ok = await confirm({
      title: "Удаление комментария",
      message: "Удалить этот комментарий? Действие необратимо.",
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/api/projects/${projectId}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    }
  };

  const canDelete = (c: Comment) => c.userId === currentUser.id || canModerate;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <form onSubmit={submit} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {replyTo && (
          <div className="comment-reply-hint">
            Ответ на комментарий #{replyTo}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReplyTo(null)}>
              отмена
            </button>
          </div>
        )}
        <textarea
          className="input"
          rows={2}
          placeholder="Написать комментарий…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button className="btn btn-primary" style={{ justifySelf: "end", alignSelf: "flex-end" }} disabled={busy}>
          <PaperAirplaneIcon style={{ width: 15, height: 15 }} /> Отправить
        </button>
      </form>

      {error && <div className="badge badge-warning">{error}</div>}

      {tree.length === 0 ? (
        <div className="card empty-state">
          <ChatBubbleLeftRightIcon className="empty-state-icon" />
          <h3>Комментариев пока нет</h3>
          <p className="text-text-secondary" style={{ marginTop: 4 }}>
            Начните обсуждение проекта.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {tree.map((c) => (
            <div key={c.id} className="card comment-card">
              <CommentRow
                comment={c}
                canDelete={canDelete(c)}
                canReport={!canDelete(c) && c.userId !== currentUser.id}
                onDelete={() => remove(c.id)}
                onReply={() => setReplyTo(c.id)}
              />
              {c.replies.length > 0 && (
                <div className="comment-replies">
                  {c.replies.map((r) => (
                    <CommentRow
                      key={r.id}
                      comment={r}
                      nested
                      canDelete={canDelete(r)}
                      canReport={!canDelete(r) && r.userId !== currentUser.id}
                      onDelete={() => remove(r.id)}
                      onReply={() => setReplyTo(c.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  nested,
  canDelete,
  canReport,
  onDelete,
  onReply,
}: {
  comment: Comment;
  nested?: boolean;
  canDelete: boolean;
  canReport?: boolean;
  onDelete: () => void;
  onReply: () => void;
}) {
  return (
    <div className={`comment-row${nested ? " nested" : ""}`}>
      <Avatar username={comment.User?.username || "?"} url={comment.User?.avatarUrl || undefined} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="comment-meta">
          <strong>@{comment.User?.username || "unknown"}</strong>
          {comment.createdAt && <span>{new Date(comment.createdAt).toLocaleString("ru-RU")}</span>}
        </div>
        <p className="comment-text">{comment.content}</p>
        <div className="comment-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onReply}>
            Ответить
          </button>
          {canDelete && (
            <button type="button" className="btn btn-ghost btn-sm danger" onClick={onDelete}>
              <TrashIcon style={{ width: 13, height: 13 }} /> Удалить
            </button>
          )}
          {canReport && (
            <ReportButton targetType="comment" targetId={comment.id} className="btn btn-ghost btn-sm" title="Пожаловаться" />
          )}
        </div>
      </div>
    </div>
  );
}

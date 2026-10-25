import { useCallback, useEffect, useState } from "react";
import { MegaphoneIcon, TrashIcon, MapPinIcon } from "@heroicons/react/24/solid";
import { useConfirm } from "../../components/ui/confirm";
import { api } from "../../lib/api";
import type { AdminPost, AdminPostsResponse } from "../../types";

export default function AdminAnnouncementsPage() {
  const confirm = useConfirm();
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pinned, setPinned] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<AdminPostsResponse>("/api/admin/posts");
      setPosts(Array.isArray(res.posts) ? res.posts : []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!content.trim() && !imageUrl.trim()) {
      setError("Введите текст объявления");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/api/admin/posts", { content: content.trim(), imageUrl: imageUrl.trim(), pinned });
      setContent("");
      setImageUrl("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось опубликовать");
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (post: AdminPost) => {
    try {
      await api.patch(`/api/admin/posts/${post.id}`, { isPinned: !post.isPinned });
      await load();
    } catch {
      /* ignore */
    }
  };

  const remove = async (post: AdminPost) => {
    const ok = await confirm({
      title: "Удалить объявление",
      message: "Этот пост будет удалён из ленты вместе с реакциями. Продолжить?",
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/api/admin/posts/${post.id}`);
      await load();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="admin-section">
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">admin // объявления</span>
          <h2 className="page-title">
            <MegaphoneIcon style={{ width: 22, height: 22, verticalAlign: "-3px", marginRight: 8 }} />
            Объявления Distort Studio
          </h2>
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <strong style={{ fontSize: "0.9rem" }}>Новое объявление от официального аккаунта</strong>
        <textarea
          className="admin-search"
          style={{ minHeight: 90, resize: "vertical", fontFamily: "var(--font-body)" }}
          placeholder="Текст объявления…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <input
          className="admin-search"
          placeholder="URL изображения (необязательно)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          Закрепить в ленте
        </label>
        {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.82rem" }}>{error}</p>}
        <div>
          <button className="btn btn-primary btn-sm" disabled={saving} onClick={submit}>
            {saving ? "Публикуем…" : "Опубликовать"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card empty-state"><p>Загрузка…</p></div>
      ) : posts.length === 0 ? (
        <div className="card empty-state"><MegaphoneIcon className="empty-state-icon" /><h3>Объявлений пока нет</h3></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
          {posts.map((p) => (
            <div key={p.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {p.isPinned && <span className="badge badge-accent">pinned</span>}
                <span className="text-text-tertiary" style={{ fontSize: "0.76rem", marginLeft: "auto" }}>
                  {new Date(p.createdAt).toLocaleString("ru-RU")}
                </span>
              </div>
              {p.content && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{p.content}</p>}
              {p.imageUrl && (
                <img src={p.imageUrl} alt="" style={{ maxWidth: "100%", borderRadius: 8 }} />
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => togglePin(p)}>
                  <MapPinIcon style={{ width: 14, height: 14 }} /> {p.isPinned ? "Открепить" : "Закрепить"}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>
                  <TrashIcon style={{ width: 14, height: 14 }} /> Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

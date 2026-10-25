import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  PhotoIcon,
  FireIcon,
  Bars3Icon,
  Squares2X2Icon,
  TrashIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";
import Avatar from "../components/ui/Avatar";
import PostCard from "../components/feed/PostCard";
import ProjectFeedCard from "../components/feed/ProjectFeedCard";
import FeedRail from "../components/feed/FeedRail";
import { api, getSocket } from "../lib/api";
import { getFeedMode, setFeedMode, resolve, type FeedMode } from "../lib/feed";
import type { FeedItem, Post, Project, User } from "../types";

interface FeedPageProps {
  currentUser: User;
}

type Scope = "all" | "following";
type Sort = "recent" | "alpha";

interface AttachedImage {
  url: string;
  thumbUrl?: string | null;
  width?: number;
  height?: number;
}

const SORTS: { key: Sort; label: string }[] = [
  { key: "recent", label: "Свежие" },
  { key: "alpha", label: "По алфавиту" },
];

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((res) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      res({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      res({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export default function FeedPage({ currentUser }: FeedPageProps) {
  const [scope, setScope] = useState<Scope>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [mode, setMode] = useState<FeedMode>(() => getFeedMode());
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [attachId, setAttachId] = useState("");
  const [image, setImage] = useState<AttachedImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<FeedItem[]>(`/api/feed?scope=${scope}`);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  const loadMyProjects = useCallback(async () => {
    try {
      const data = await api.get<Project[]>("/api/projects");
      setMyProjects(Array.isArray(data) ? data : []);
    } catch {
      setMyProjects([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadMyProjects();
  }, [loadMyProjects]);

  useEffect(() => {
    const socket = getSocket();
    const reload = () => load();
    const onLiked = ({ projectId, likesCount }: { projectId: number; likesCount: number }) => {
      setItems((prev) =>
        prev.map((it) =>
          it.type === "project" && it.project?.id === projectId
            ? { ...it, project: { ...it.project, likesCount } }
            : it
        )
      );
    };
    const onPostLiked = ({ postId, likesCount }: { postId: number; likesCount: number }) => {
      setItems((prev) =>
        prev.map((it) =>
          it.type === "post" && it.post?.id === postId
            ? { ...it, post: { ...it.post, likesCount } }
            : it
        )
      );
    };
    const onPostComment = ({ postId }: { postId: number }) => {
      setItems((prev) =>
        prev.map((it) =>
          it.type === "post" && it.post?.id === postId
            ? { ...it, post: { ...it.post, commentsCount: (it.post.commentsCount || 0) + 1 } }
            : it
        )
      );
    };
    const onPostCommentRemoved = ({ postId }: { postId: number }) => {
      setItems((prev) =>
        prev.map((it) =>
          it.type === "post" && it.post?.id === postId
            ? { ...it, post: { ...it.post, commentsCount: Math.max(0, (it.post.commentsCount || 0) - 1) } }
            : it
        )
      );
    };
    socket.on("project:created", reload);
    socket.on("project:updated", reload);
    socket.on("project:deleted", reload);
    socket.on("post:created", reload);
    socket.on("post:deleted", reload);
    socket.on("project:liked", onLiked);
    socket.on("post:liked", onPostLiked);
    socket.on("postcomment:created", onPostComment);
    socket.on("postcomment:removed", onPostCommentRemoved);
    return () => {
      socket.off("project:created", reload);
      socket.off("project:updated", reload);
      socket.off("project:deleted", reload);
      socket.off("post:created", reload);
      socket.off("post:deleted", reload);
      socket.off("project:liked", onLiked);
      socket.off("post:liked", onPostLiked);
      socket.off("postcomment:created", onPostComment);
      socket.off("postcomment:removed", onPostCommentRemoved);
    };
  }, [load]);

  const switchMode = (next: FeedMode) => {
    setMode(next);
    setFeedMode(next);
  };

  const pickImage = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Можно прикрепить только изображение");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const size = await readImageSize(file);
      const form = new FormData();
      form.append("file", file);
      const res = await api.postForm<{ url: string; thumbUrl: string | null }>("/api/upload/file", form);
      setImage({ url: res.url, thumbUrl: res.thumbUrl, width: size.width, height: size.height });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить изображение");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const publish = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() && !attachId && !image) return;
    setPosting(true);
    setError("");
    try {
      await api.post<Post>("/api/posts", {
        content: draft.trim(),
        projectId: attachId ? Number(attachId) : undefined,
        imageUrl: image?.url,
        thumbUrl: image?.thumbUrl,
        imageWidth: image?.width,
        imageHeight: image?.height,
      });
      setDraft("");
      setAttachId("");
      setImage(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка публикации");
    } finally {
      setPosting(false);
    }
  };

  const removePost = async (post: Post) => {
    if (!window.confirm("Удалить пост?")) return;
    setItems((prev) => prev.filter((it) => !(it.type === "post" && it.post?.id === post.id)));
    try {
      await api.del(`/api/posts/${post.id}`);
    } catch {
      load();
    }
  };

  const toggleLike = async (project: Project) => {
    const liked = !project.isLiked;
    setItems((prev) =>
      prev.map((it) =>
        it.type === "project" && it.project?.id === project.id
          ? {
              ...it,
              project: {
                ...it.project,
                isLiked: liked,
                likesCount: Math.max(0, (it.project.likesCount || 0) + (liked ? 1 : -1)),
              },
            }
          : it
      )
    );
    try {
      if (liked) await api.post(`/api/projects/${project.id}/like`);
      else await api.del(`/api/projects/${project.id}/like`);
    } catch {
      load();
    }
  };

  const togglePostLike = async (post: Post) => {
    const liked = !post.isLiked;
    setItems((prev) =>
      prev.map((it) =>
        it.type === "post" && it.post?.id === post.id
          ? {
              ...it,
              post: {
                ...it.post,
                isLiked: liked,
                likesCount: Math.max(0, (it.post.likesCount || 0) + (liked ? 1 : -1)),
              },
            }
          : it
      )
    );
    try {
      if (liked) await api.post(`/api/posts/${post.id}/like`);
      else await api.del(`/api/posts/${post.id}/like`);
    } catch {
      load();
    }
  };

  const toggleComments = (postId: number) =>
    setOpenComments((prev) => ({ ...prev, [postId]: !prev[postId] }));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = items.filter((it) => {
      if (!q) return true;
      if (it.type === "project" && it.project) {
        const p = it.project;
        return (
          (p.title || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.owner?.username || "").toLowerCase().includes(q)
        );
      }
      if (it.type === "post" && it.post) {
        return (
          (it.post.content || "").toLowerCase().includes(q) ||
          (it.post.author?.username || "").toLowerCase().includes(q)
        );
      }
      return false;
    });
    if (sort === "alpha") {
      matched.sort((a, b) => {
        const la = a.type === "project" ? a.project?.title || "" : a.post?.content || "";
        const lb = b.type === "project" ? b.project?.title || "" : b.post?.content || "";
        return la.localeCompare(lb, "ru");
      });
    } else {
      matched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return matched;
  }, [items, query, sort]);

  const containerClass = mode === "grid" ? "feed-masonry" : "feed-list";

  return (
    <div className="page-with-rail">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
        <form className="card feed-composer" onSubmit={publish}>
          <div className="feed-composer-top">
            <Avatar username={currentUser.username} url={currentUser.avatarUrl || undefined} size="sm" />
            <textarea
              className="feed-composer-input"
              placeholder={`Что нового, ${currentUser.username}?`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
            />
          </div>

          {(image || attachId) && (
            <div className="feed-composer-preview">
              {image && (
                <div className="composer-image-wrap" style={{ aspectRatio: image.width && image.height ? `${image.width} / ${image.height}` : undefined }}>
                  <img src={resolve(image.thumbUrl || image.url)} alt="preview" />
                  <button type="button" className="composer-image-remove" onClick={() => setImage(null)} aria-label="Убрать изображение">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="feed-composer-foot">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => pickImage(e.target.files?.[0])}
            />
            <button type="button" className="icon-btn" onClick={() => fileRef.current?.click()} disabled={uploading} title="Добавить фото">
              <PhotoIcon className="w-5 h-5" />
            </button>
            <select className="input feed-composer-select" value={attachId} onChange={(e) => setAttachId(e.target.value)}>
              <option value="">Проект…</option>
              {myProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            {error && <span className="feed-composer-error">{error}</span>}
            <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} disabled={posting || uploading || (!draft.trim() && !attachId && !image)}>
              {posting ? "Публикуем…" : uploading ? "Загрузка…" : "Опубликовать"}
            </button>
          </div>
        </form>

        <div className="feed-toolbar">
          <div className="feed-chips">
            <button type="button" className={`chip${scope === "all" ? " active" : ""}`} onClick={() => setScope("all")}>
              <FireIcon className="w-3.5 h-3.5" /> Все
            </button>
            <button type="button" className={`chip${scope === "following" ? " active" : ""}`} onClick={() => setScope("following")}>
              <UserGroupIcon className="w-3.5 h-3.5" /> Подписки
            </button>
          </div>
          <div className="feed-search">
            <MagnifyingGlassIcon className="feed-search-icon" />
            <input
              className="input"
              placeholder="Поиск…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="feed-chips feed-sort">
            {SORTS.map((s) => (
              <button key={s.key} type="button" className={`chip${sort === s.key ? " active" : ""}`} onClick={() => setSort(s.key)}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="feed-mode-toggle" role="group" aria-label="Вид ленты">
            <button type="button" className={`feed-mode-btn${mode === "list" ? " active" : ""}`} onClick={() => switchMode("list")} title="Лента">
              <Bars3Icon className="w-4 h-4" />
            </button>
            <button type="button" className={`feed-mode-btn${mode === "grid" ? " active" : ""}`} onClick={() => switchMode("grid")} title="Плитка">
              <Squares2X2Icon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className={containerClass}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card skeleton feed-skeleton" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="card feed-empty">
            <FireIcon className="w-11 h-11" style={{ color: "var(--accent-primary)" }} />
            <h3>
              {scope === "following" && !query
                ? "Вы пока ни на кого не подписаны"
                : query
                ? "Ничего не найдено"
                : "Пока тихо в ленте"}
            </h3>
            <p className="text-text-secondary">
              {scope === "following" && !query
                ? "Подпишитесь на авторов, чтобы видеть их посты и проекты здесь."
                : query
                ? "Попробуйте изменить запрос."
                : "Напишите первый пост или опубликуйте проект."}
            </p>
          </div>
        ) : (
          <div className={containerClass}>
            {visible.map((it) => {
              if (it.type === "project" && it.project) {
                return (
                  <ProjectFeedCard
                    key={`project-${it.project.id}`}
                    project={it.project}
                    createdAt={it.createdAt}
                    mode={mode}
                    onToggleLike={toggleLike}
                  />
                );
              }
              if (it.post) {
                return (
                  <PostCard
                    key={`post-${it.post.id}`}
                    post={it.post}
                    currentUser={currentUser}
                    mode={mode}
                    commentsOpen={!!openComments[it.post.id]}
                    onToggleLike={togglePostLike}
                    onToggleComments={toggleComments}
                    onDelete={removePost}
                  />
                );
              }
              return null;
            })}
          </div>
        )}
      </div>

      <FeedRail items={items} />
    </div>
  );
}

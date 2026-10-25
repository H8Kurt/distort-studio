import { useCallback, useEffect, useState } from "react";
import {
  PencilSquareIcon,
  TrashIcon,
  StarIcon,
  ArrowsPointingOutIcon,
  PhotoIcon,
  MusicalNoteIcon,
  DocumentIcon,
  FolderIcon,
  SparklesIcon,
  XMarkIcon,
  PlayIcon,
} from "@heroicons/react/24/solid";
import UploadForm from "../../../UploadForm";
import KlecksEditor from "../../../components/editors/KlecksEditor";
import AudioMassEditor from "../../../components/editors/AudioMassEditor";
import VideoEditor from "../../../components/editors/VideoEditor";
import { api, API_URL, getSocket } from "../../../lib/api";
import { usePlayer, mediaToPlayer } from "../../../lib/player";
import type { MediaFile } from "../../../types";

interface FilesTabProps {
  projectId: number;
  canEdit: boolean;
  onProjectChange: () => void;
}

function resolve(url?: string | null): string {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

function kindOf(media: MediaFile): "image" | "audio" | "video" | "other" {
  const mime = media.mime || "";
  const t = media.type || "";
  if (t === "image" || mime.startsWith("image/")) return "image";
  if (t === "audio" || mime.startsWith("audio/")) return "audio";
  if (t === "video" || mime.startsWith("video/")) return "video";
  return "other";
}

export default function FilesTab({ projectId, canEdit, onProjectChange }: FilesTabProps) {
  const { playTrack } = usePlayer();
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const [editing, setEditing] = useState<MediaFile | null>(null);
  const [newImage, setNewImage] = useState(false);
  const [creating, setCreating] = useState<Creating | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<MediaFile[]>(`/api/projects/${projectId}/media`);
      setMedia(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки файлов");
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const onAdded = (item: MediaFile) => {
      setMedia((prev) => (prev.some((m) => m.id === item.id) ? prev : [item, ...prev]));
    };
    const onUpdated = (item: MediaFile) => {
      setMedia((prev) => prev.map((m) => (m.id === item.id ? item : m)));
    };
    const onRemoved = ({ id }: { id: number }) => {
      setMedia((prev) => prev.filter((m) => m.id !== id));
    };
    socket.on("media:added", onAdded);
    socket.on("media:updated", onUpdated);
    socket.on("media:removed", onRemoved);
    return () => {
      socket.off("media:added", onAdded);
      socket.off("media:updated", onUpdated);
      socket.off("media:removed", onRemoved);
    };
  }, []);

  const rename = async (m: MediaFile) => {
    const next = window.prompt("Новое имя файла", m.originalName || m.filename || "");
    if (!next || next === m.originalName) return;
    try {
      await api.put(`/api/projects/${projectId}/media/${m.id}`, { originalName: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка переименования");
    }
  };

  const remove = async (m: MediaFile) => {
    if (!window.confirm(`Удалить «${m.originalName || m.filename}»?`)) return;
    try {
      await api.del(`/api/projects/${projectId}/media/${m.id}`);
      setMedia((prev) => prev.filter((x) => x.id !== m.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    }
  };

  const setCover = async (m: MediaFile) => {
    try {
      await api.post(`/api/projects/${projectId}/media/${m.id}/cover`);
      onProjectChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка установки обложки");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="panel-head">
        <h3 className="panel-title">Файлы проекта</h3>
        {canEdit && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={() => setNewImage(true)}>
              <PhotoIcon style={{ width: 16, height: 16 }} />
              Изображение с нуля
            </button>
            <button className="btn btn-secondary" onClick={() => setCreating({ type: "audio" })}>
              <MusicalNoteIcon style={{ width: 16, height: 16 }} />
              Аудио с нуля
            </button>
            <UploadForm projectId={projectId} onUploaded={(m) => setMedia((prev) => [m, ...prev])} />
          </div>
        )}
      </div>

      {error && <div className="badge badge-warning">{error}</div>}

      {media.length === 0 ? (
        <div className="card empty-state">
          <FolderOpenPlaceholder />
          <h3>Файлов пока нет</h3>
          <p className="text-text-secondary" style={{ marginTop: 4 }}>
            Загрузите изображения или аудио, чтобы начать.
          </p>
        </div>
      ) : (
        <div className="files-grid">
          {media.map((m) => {
            const kind = kindOf(m);
            const src = resolve(m.url);
            const thumb = resolve(m.thumbUrl) || src;
            return (
              <div key={m.id} className="card file-tile">
                <button
                  type="button"
                  className="file-thumb"
                  onClick={() => setPreview(m)}
                  aria-label="Открыть"
                >
                  {kind === "image" ? (
                    <img src={thumb} alt={m.originalName || ""} />
                  ) : kind === "audio" ? (
                    <MusicalNoteIcon style={{ width: 40, height: 40, color: "var(--accent-primary)" }} />
                  ) : kind === "video" ? (
                    <video src={src} muted />
                  ) : (
                    <DocumentIcon style={{ width: 40, height: 40 }} />
                  )}
                  <span className="file-open">
                    <ArrowsPointingOutIcon style={{ width: 14, height: 14 }} />
                  </span>
                </button>

                <div className="file-info">
                  <div className="line-clamp-1" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                    {m.originalName || m.filename || "Файл"}
                  </div>
                  <span className="badge badge-neutral" style={{ marginTop: 4 }}>
                    {kind === "image" ? <PhotoIcon style={{ width: 12, height: 12 }} /> : <MusicalNoteIcon style={{ width: 12, height: 12 }} />}
                    {kind}
                  </span>
                  {kind === "audio" && (
                    <button
                      type="button"
                      className="file-play-btn"
                      onClick={() => playTrack(mediaToPlayer(m))}
                      title="Слушать в плеере"
                    >
                      <PlayIcon style={{ width: 12, height: 12 }} /> В плеер
                    </button>
                  )}
                </div>

                {canEdit && (
                  <div className="file-actions">
                    {kind === "image" && (
                      <button className="icon-btn sm" title="Сделать обложкой" onClick={() => setCover(m)}>
                        <StarIcon style={{ width: 15, height: 15 }} />
                      </button>
                    )}
                    {(kind === "image" || kind === "audio" || kind === "video") && (
                      <button className="icon-btn sm" title="Редактировать" onClick={() => setEditing(m)}>
                        <SparklesIcon style={{ width: 15, height: 15 }} />
                      </button>
                    )}
                    <button className="icon-btn sm" title="Переименовать" onClick={() => rename(m)}>
                      <PencilSquareIcon style={{ width: 15, height: 15 }} />
                    </button>
                    <button className="icon-btn sm danger" title="Удалить" onClick={() => remove(m)}>
                      <TrashIcon style={{ width: 15, height: 15 }} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {preview && <PreviewModal media={preview} onClose={() => setPreview(null)} />}

      {editing && kindOf(editing) === "image" && (
        <KlecksEditor
          media={editing}
          projectId={projectId}
          onSaved={(m) => setMedia((prev) => [m, ...prev])}
          onClose={() => setEditing(null)}
        />
      )}
      {editing && kindOf(editing) === "audio" && (
        <AudioMassEditor
          media={editing}
          projectId={projectId}
          onSaved={(m) => setMedia((prev) => [m, ...prev])}
          onClose={() => setEditing(null)}
        />
      )}
      {editing && kindOf(editing) === "video" && (
        <VideoEditor
          media={editing}
          projectId={projectId}
          onSaved={(m) => setMedia((prev) => [m, ...prev])}
          onClose={() => setEditing(null)}
        />
      )}

      {newImage && (
        <NewImageModal
          onClose={() => setNewImage(false)}
          onStart={(size, background) => {
            setNewImage(false);
            setCreating({ type: "image", size, background });
          }}
        />
      )}

      {creating?.type === "image" && (
        <KlecksEditor
          media={null}
          projectId={projectId}
          initialSize={creating.size}
          initialBackground={creating.background}
          onSaved={(m) => setMedia((prev) => [m, ...prev])}
          onClose={() => setCreating(null)}
        />
      )}
      {creating?.type === "audio" && (
        <AudioMassEditor
          media={null}
          projectId={projectId}
          onSaved={(m) => setMedia((prev) => [m, ...prev])}
          onClose={() => setCreating(null)}
        />
      )}
    </div>
  );
}

type Creating =
  | { type: "image"; size: { w: number; h: number }; background: string }
  | { type: "audio" };

function FolderOpenPlaceholder() {
  return <FolderIcon className="empty-state-icon" />;
}

const SIZE_PRESETS: { label: string; w: number; h: number }[] = [
  { label: "1024 × 1024", w: 1024, h: 1024 },
  { label: "1920 × 1080", w: 1920, h: 1080 },
  { label: "1080 × 1920", w: 1080, h: 1920 },
  { label: "800 × 800", w: 800, h: 800 },
];

function NewImageModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (size: { w: number; h: number }, background: string) => void;
}) {
  const [w, setW] = useState(1024);
  const [h, setH] = useState(1024);
  const [transparent, setTransparent] = useState(false);
  const [background, setBackground] = useState("#ffffff");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const start = () => {
    const sw = Math.min(4096, Math.max(1, Math.round(w) || 1));
    const sh = Math.min(4096, Math.max(1, Math.round(h) || 1));
    onStart({ w: sw, h: sh }, transparent ? "transparent" : background);
  };

  return (
    <div className="command-overlay" onMouseDown={onClose}>
      <div className="preview-modal" onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(460px, 94vw)" }}>
        <div className="preview-head">
          <span>Новое изображение</span>
          <button className="icon-btn sm" onClick={onClose} aria-label="Закрыть">
            <XMarkIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div className="preview-body" style={{ display: "block" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {SIZE_PRESETS.map((p) => (
              <button
                key={p.label}
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setW(p.w);
                  setH(p.h);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <label className="editor-range" style={{ flex: 1 }}>
              <span>Ширина</span>
              <input className="input" type="number" min={1} max={4096} value={w} onChange={(e) => setW(Number(e.target.value))} />
            </label>
            <label className="editor-range" style={{ flex: 1 }}>
              <span>Высота</span>
              <input className="input" type="number" min={1} max={4096} value={h} onChange={(e) => setH(Number(e.target.value))} />
            </label>
          </div>

          <label className="editor-range" style={{ marginTop: "0.75rem" }}>
            <span>Фон</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span className="editor-color" style={{ opacity: transparent ? 0.4 : 1 }}>
                <input type="color" value={background} disabled={transparent} onChange={(e) => setBackground(e.target.value)} />
              </span>
              <label className="editor-checkbox">
                <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
                <span>Прозрачный</span>
              </label>
            </div>
          </label>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1.25rem" }}>
            <button className="btn btn-ghost" onClick={onClose}>
              Отмена
            </button>
            <button className="btn btn-primary" onClick={start}>
              <PhotoIcon style={{ width: 16, height: 16 }} />
              Создать
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ media, onClose }: { media: MediaFile; onClose: () => void }) {
  const kind = kindOf(media);
  const src = resolve(media.url);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="command-overlay" onMouseDown={onClose}>
      <div className="preview-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="preview-head">
          <span className="line-clamp-1">{media.originalName || media.filename}</span>
          <button className="icon-btn sm" onClick={onClose} aria-label="Закрыть">
            <XMarkIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div className="preview-body">
          {kind === "image" && <img src={src} alt={media.originalName || ""} />}
          {kind === "video" && <video src={src} controls autoPlay style={{ maxWidth: "100%" }} />}
          {kind === "audio" && <audio src={src} controls autoPlay style={{ width: "100%" }} />}
          {kind === "other" && <a className="btn btn-secondary" href={src} target="_blank" rel="noreferrer">Открыть файл</a>}
        </div>
      </div>
    </div>
  );
}

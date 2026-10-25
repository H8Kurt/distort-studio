import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon,
  PhotoIcon,
  MusicalNoteIcon,
  VideoCameraIcon,
  XMarkIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/solid";
import { api } from "../../lib/api";
import type { MediaFile, Project } from "../../types";
import KlecksEditor from "../editors/KlecksEditor";
import AudioMassEditor from "../editors/AudioMassEditor";
import VideoEditor from "../editors/VideoEditor";

type Kind = "image" | "audio" | "video";

interface OpenState {
  type: Kind;
  projectId: number;
  media: MediaFile | null;
  size?: { w: number; h: number };
  background?: string;
}

const TITLES: Record<Kind, string> = {
  image: "Новая графика",
  audio: "Новый аудиопроект",
  video: "Новое видео",
};

const SIZE_PRESETS: { label: string; w: number; h: number }[] = [
  { label: "1024 × 1024", w: 1024, h: 1024 },
  { label: "1920 × 1080", w: 1920, h: 1080 },
  { label: "1080 × 1920", w: 1080, h: 1920 },
  { label: "2048 × 2048", w: 2048, h: 2048 },
];

function clampSize(v: number) {
  const n = Math.round(Number(v) || 0);
  return Math.min(4096, Math.max(1, n));
}

export default function CreateStudio() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sizeModal, setSizeModal] = useState(false);
  const [open, setOpen] = useState<OpenState | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingType = useRef<Kind>("image");

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  const createProject = (kind: Kind) =>
    api.post<Project>("/api/projects", {
      title: TITLES[kind],
      description: `Создано в студии · ${new Date().toLocaleString("ru-RU")}`,
      visibility: "PRIVATE",
    });

  const startBlank = async (kind: "image" | "audio", size?: { w: number; h: number }, background?: string) => {
    setBusy(true);
    setError("");
    try {
      const project = await createProject(kind);
      setMenu(false);
      setSizeModal(false);
      setOpen({ type: kind, projectId: project.id, media: null, size, background });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать проект");
    } finally {
      setBusy(false);
    }
  };

  const pickFile = (kind: Kind) => {
    pendingType.current = kind;
    setMenu(false);
    fileRef.current?.click();
  };

  const onFileChosen = async (file: File) => {
    const kind = pendingType.current;
    setBusy(true);
    setError("");
    try {
      const project = await createProject(kind);
      const form = new FormData();
      form.append("file", file);
      const media = await api.postForm<MediaFile>(`/api/projects/${project.id}/media`, form);
      setOpen({ type: kind, projectId: project.id, media });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить файл");
    } finally {
      setBusy(false);
    }
  };

  const saved = (projectId: number) => {
    setOpen(null);
    navigate(`/projects/${projectId}/files`);
  };

  return (
    <>
      <div className="create-studio" ref={menuRef}>
        <button
          type="button"
          className={`topnav-create${menu ? " active" : ""}`}
          onClick={() => setMenu((v) => !v)}
          aria-label="Создать"
        >
          <PlusIcon style={{ width: 16, height: 16 }} />
          <span className="topnav-search-label">Создать</span>
          <ChevronDownIcon style={{ width: 12, height: 12 }} />
        </button>

        {menu && (
          <div className="create-menu" role="menu">
            <div className="editor-side-title">С нуля</div>
            <button className="create-row" onClick={() => { setMenu(false); setSizeModal(true); }}>
              <span className="create-row-icon"><PhotoIcon style={{ width: 17, height: 17 }} /></span>
              <span>
                <span className="create-row-title">Графика</span>
                <span className="create-row-sub">холст, слои, кисти, фигуры</span>
              </span>
            </button>
            <button className="create-row" disabled={busy} onClick={() => startBlank("audio")}>
              <span className="create-row-icon"><MusicalNoteIcon style={{ width: 17, height: 17 }} /></span>
              <span>
                <span className="create-row-title">Аудио</span>
                <span className="create-row-sub">мультитрек, запись, эффекты</span>
              </span>
            </button>

            <div className="editor-side-title" style={{ paddingTop: "0.6rem" }}>Из файла</div>
            <div className="create-sub">
              <button className="create-mini" disabled={busy} onClick={() => pickFile("image")}>
                <PhotoIcon style={{ width: 16, height: 16 }} /> Изображение
              </button>
              <button className="create-mini" disabled={busy} onClick={() => pickFile("audio")}>
                <MusicalNoteIcon style={{ width: 16, height: 16 }} /> Аудио
              </button>
              <button className="create-mini" disabled={busy} onClick={() => pickFile("video")}>
                <VideoCameraIcon style={{ width: 16, height: 16 }} /> Видео
              </button>
            </div>
            {error && <div className="badge badge-warning" style={{ margin: "0.5rem 0 0" }}>{error}</div>}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*,audio/*,video/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileChosen(f);
            e.target.value = "";
          }}
        />
      </div>

      {sizeModal && (
        <NewImageModal
          busy={busy}
          onClose={() => setSizeModal(false)}
          onStart={(size, background) => startBlank("image", size, background)}
        />
      )}

      {open?.type === "image" && (
        <KlecksEditor
          media={open.media}
          projectId={open.projectId}
          initialSize={open.size}
          initialBackground={open.background}
          onSaved={() => saved(open.projectId)}
          onClose={() => setOpen(null)}
        />
      )}
      {open?.type === "audio" && (
        <AudioMassEditor
          media={open.media}
          projectId={open.projectId}
          onSaved={() => saved(open.projectId)}
          onClose={() => setOpen(null)}
        />
      )}
      {open?.type === "video" && open.media && (
        <VideoEditor
          media={open.media}
          projectId={open.projectId}
          onSaved={() => saved(open.projectId)}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function NewImageModal({
  busy,
  onClose,
  onStart,
}: {
  busy: boolean;
  onClose: () => void;
  onStart: (size: { w: number; h: number }, background: string) => void;
}) {
  const [w, setW] = useState(1024);
  const [h, setH] = useState(1024);
  const [background, setBackground] = useState("#101010");

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
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
            <label className="editor-range" style={{ flex: 1 }}>
              <span>Ширина</span>
              <input className="input" type="number" min={1} max={4096} value={w} onChange={(e) => setW(Number(e.target.value))} />
            </label>
            <label className="editor-range" style={{ flex: 1 }}>
              <span>Высота</span>
              <input className="input" type="number" min={1} max={4096} value={h} onChange={(e) => setH(Number(e.target.value))} />
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <label className="editor-color" style={{ opacity: background === "transparent" ? 0.35 : 1 }}>
              <input
                type="color"
                value={background === "transparent" ? "#ffffff" : background}
                onChange={(e) => setBackground(e.target.value)}
              />
            </label>
            <label className="editor-checkbox">
              <input
                type="checkbox"
                checked={background === "transparent"}
                onChange={(e) => setBackground(e.target.checked ? "transparent" : "#101010")}
              />
              <span>Прозрачный фон</span>
            </label>
          </div>
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() => onStart({ w: clampSize(w), h: clampSize(h) }, background)}
          >
            {busy ? "Создаём…" : "Открыть редактор"}
          </button>
        </div>
      </div>
    </div>
  );
}

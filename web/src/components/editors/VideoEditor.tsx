import { useCallback, useEffect, useRef, useState } from "react";
import {
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  ArrowDownTrayIcon,
  ScissorsIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { api, API_URL } from "../../lib/api";
import type { MediaFile } from "../../types";

interface VideoEditorProps {
  media: MediaFile;
  projectId: number;
  onSaved: (media: MediaFile) => void;
  onClose: () => void;
}

type Fit = "contain" | "cover" | "fill";
type TitlePos = "top" | "center" | "bottom";

function resolve(url: string): string {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

function fmt(sec: number): string {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

export default function VideoEditor({ media, projectId, onSaved, onClose }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const exportingRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [grayscale, setGrayscale] = useState(0);
  const [sepia, setSepia] = useState(0);
  const [blur, setBlur] = useState(0);
  const [hue, setHue] = useState(0);

  const [fit, setFit] = useState<Fit>("contain");
  const [title, setTitle] = useState("");
  const [titlePos, setTitlePos] = useState<TitlePos>("bottom");
  const [titleColor, setTitleColor] = useState("#ffffff");
  const [titleSize, setTitleSize] = useState(48);
  const [fps, setFps] = useState(30);

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const filterString = useCallback(
    () =>
      `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ` +
      `grayscale(${grayscale}%) sepia(${sepia}%) blur(${blur}px) hue-rotate(${hue}deg)`,
    [brightness, contrast, saturation, grayscale, sepia, blur, hue]
  );

  const seek = useCallback(
    (t: number) =>
      new Promise<void>((res) => {
        const v = videoRef.current;
        if (!v) return res();
        const target = Math.max(0, Math.min(t, Math.max(0, (v.duration || 0) - 0.05)));
        const on = () => {
          v.removeEventListener("seeked", on);
          res();
        };
        v.addEventListener("seeked", on);
        v.currentTime = target;
      }),
    []
  );

  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, v: HTMLVideoElement) => {
      const w = ctx.canvas.width;
      const h = ctx.canvas.height;
      const vw = v.videoWidth || w;
      const vh = v.videoHeight || h;
      ctx.save();
      ctx.filter = filterString();
      ctx.clearRect(0, 0, w, h);
      if (fit === "fill") {
        ctx.drawImage(v, 0, 0, w, h);
      } else {
        const scale = fit === "cover" ? Math.max(w / vw, h / vh) : Math.min(w / vw, h / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        ctx.drawImage(v, (w - dw) / 2, (h - dh) / 2, dw, dh);
      }
      ctx.restore();

      if (title.trim()) {
        ctx.fillStyle = titleColor;
        ctx.font = `600 ${titleSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const y = titlePos === "top" ? h * 0.13 : titlePos === "center" ? h * 0.5 : h * 0.88;
        ctx.shadowColor = "rgba(0,0,0,0.55)";
        ctx.shadowBlur = 8;
        ctx.fillText(title, w / 2, y);
        ctx.shadowBlur = 0;
      }
    },
    [filterString, fit, title, titlePos, titleColor, titleSize]
  );

  const refreshCanvas = useCallback(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || !v.videoWidth) return;
    if (c.width !== v.videoWidth) c.width = v.videoWidth;
    if (c.height !== v.videoHeight) c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (ctx) drawFrame(ctx, v);
  }, [drawFrame]);

  useEffect(() => {
    refreshCanvas();
  }, [refreshCanvas]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !exportingRef.current) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      exportingRef.current = false;
    },
    []
  );

  const onLoaded = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    setTrimEnd(v.duration || 0);
    setReady(true);
    setPlayhead(0);
    refreshCanvas();
  };

  const tick = () => {
    const v = videoRef.current;
    if (!v) return;
    setPlayhead(v.currentTime);
    if (v.currentTime >= trimEnd) {
      v.pause();
      setPlaying(false);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const play = async () => {
    const v = videoRef.current;
    if (!v) return;
    setError("");
    if (v.currentTime < trimStart || v.currentTime >= trimEnd - 0.02) await seek(trimStart);
    try {
      await v.play();
      setPlaying(true);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось воспроизвести");
    }
  };

  const pause = () => {
    videoRef.current?.pause();
    setPlaying(false);
    cancelAnimationFrame(rafRef.current);
  };

  const scrub = (t: number) => {
    pause();
    seek(t);
    setPlayhead(t);
  };

  const reset = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setGrayscale(0);
    setSepia(0);
    setBlur(0);
    setHue(0);
    setFit("contain");
    setTitle("");
    setTrimStart(0);
    setTrimEnd(duration);
  };

  const exportVideo = async () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || !ready) return;
    setError("");
    setExporting(true);
    setProgress(0);
    pause();
    try {
      if (c.width !== v.videoWidth) c.width = v.videoWidth;
      if (c.height !== v.videoHeight) c.height = v.videoHeight;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Canvas недоступен");

      await seek(trimStart);

      const canvasStream = c.captureStream(fps);
      const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
      const anyVideo = v as HTMLVideoElement & { captureStream?: () => MediaStream };
      if (typeof anyVideo.captureStream === "function") {
        try {
          tracks.push(...anyVideo.captureStream().getAudioTracks());
        } catch {
          /* без аудио */
        }
      }
      const stream = new MediaStream(tracks);
      const mime = pickMime();
      const rec = new MediaRecorder(
        stream,
        mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : undefined
      );
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      const stopped = new Promise<void>((res) => {
        rec.onstop = () => res();
      });

      rec.start(100);
      exportingRef.current = true;
      await v.play();

      const span = Math.max(0.001, trimEnd - trimStart);
      await new Promise<void>((res) => {
        const loop = () => {
          drawFrame(ctx, v);
          setPlayhead(v.currentTime);
          setProgress(Math.min(100, Math.round(((v.currentTime - trimStart) / span) * 100)));
          if (!exportingRef.current || v.currentTime >= trimEnd || v.ended) {
            res();
            return;
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      });

      exportingRef.current = false;
      v.pause();
      setPlaying(false);
      if (rec.state !== "inactive") rec.stop();
      await stopped;

      const blob = new Blob(chunks, { type: mime || "video/webm" });
      if (blob.size === 0) throw new Error("Экспорт не дал данных. Попробуйте Chrome/Edge.");
      const base = (media.originalName || "video").replace(/\.[^.]+$/, "");
      const file = new File([blob], `${base}-edit.webm`, { type: "video/webm" });
      const form = new FormData();
      form.append("file", file);
      const saved = await api.postForm<MediaFile>(`/api/projects/${projectId}/media`, form);
      setExporting(false);
      onSaved(saved);
      onClose();
    } catch (err) {
      exportingRef.current = false;
      setExporting(false);
      setError(err instanceof Error ? err.message : "Ошибка экспорта");
    }
  };

  const overlayStyle: React.CSSProperties = {
    color: titleColor,
    fontSize: `${titleSize / 12}rem`,
    top: titlePos === "top" ? "10%" : titlePos === "center" ? "50%" : "auto",
    bottom: titlePos === "bottom" ? "10%" : "auto",
    transform: titlePos === "center" ? "translate(-50%, -50%)" : "translateX(-50%)",
  };

  return (
    <div className="command-overlay editor-overlay" onMouseDown={exporting ? undefined : onClose}>
      <div className="preview-modal editor-shell" onMouseDown={(e) => e.stopPropagation()}>
        <div className="preview-head">
          <span className="line-clamp-1">
            <ScissorsIcon style={{ width: 15, height: 15, verticalAlign: "-2px" }} />{" "}
            {media.originalName || media.filename || "Видео"}
          </span>
          <button className="icon-btn sm" onClick={onClose} disabled={exporting} aria-label="Закрыть">
            <XMarkIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div className="video-editor-body">
          <div className="video-stage">
            <video
              ref={videoRef}
              src={resolve(media.url)}
              crossOrigin="anonymous"
              playsInline
              preload="auto"
              onLoadedMetadata={onLoaded}
              onEnded={() => setPlaying(false)}
              style={{ filter: filterString(), objectFit: fit }}
            />
            {title.trim() && <div className="video-overlay-text" style={overlayStyle}>{title}</div>}
            {!ready && <div className="video-stage-hint">Загрузка видео…</div>}
            <canvas ref={canvasRef} className="video-canvas" />
          </div>

          <div className="video-toolbar">
            <button className="btn btn-primary btn-sm" onClick={playing ? pause : play} disabled={!ready || exporting}>
              {playing ? <PauseIcon style={{ width: 15, height: 15 }} /> : <PlayIcon style={{ width: 15, height: 15 }} />}
              {playing ? "Пауза" : "Играть"}
            </button>
            <span className="text-text-tertiary" style={{ fontSize: "0.8rem", minWidth: 96 }}>
              {fmt(playhead)} / {fmt(duration)}
            </span>
            <input
              className="input"
              type="range"
              min={0}
              max={Math.max(0.1, duration)}
              step={0.01}
              value={playhead}
              disabled={!ready || exporting}
              onChange={(e) => scrub(Number(e.target.value))}
              style={{ flex: 1 }}
            />
          </div>

          <div className="video-props">
            <label className="editor-range">
              <span>Начало · {fmt(trimStart)}</span>
              <input
                type="range"
                min={0}
                max={Math.max(0.1, duration)}
                step={0.01}
                value={trimStart}
                disabled={!ready || exporting}
                onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 0.1))}
              />
            </label>
            <label className="editor-range">
              <span>Конец · {fmt(trimEnd)}</span>
              <input
                type="range"
                min={0}
                max={Math.max(0.1, duration)}
                step={0.01}
                value={trimEnd}
                disabled={!ready || exporting}
                onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.1))}
              />
            </label>

            <label className="editor-range">
              <span>Яркость · {brightness}%</span>
              <input type="range" min={0} max={200} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} />
            </label>
            <label className="editor-range">
              <span>Контраст · {contrast}%</span>
              <input type="range" min={0} max={200} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} />
            </label>
            <label className="editor-range">
              <span>Насыщенность · {saturation}%</span>
              <input type="range" min={0} max={200} value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} />
            </label>
            <label className="editor-range">
              <span>Оттенок · {hue}°</span>
              <input type="range" min={0} max={360} value={hue} onChange={(e) => setHue(Number(e.target.value))} />
            </label>
            <label className="editor-range">
              <span>Ч/Б · {grayscale}%</span>
              <input type="range" min={0} max={100} value={grayscale} onChange={(e) => setGrayscale(Number(e.target.value))} />
            </label>
            <label className="editor-range">
              <span>Сепия · {sepia}%</span>
              <input type="range" min={0} max={100} value={sepia} onChange={(e) => setSepia(Number(e.target.value))} />
            </label>
            <label className="editor-range">
              <span>Размытие · {blur}px</span>
              <input type="range" min={0} max={20} value={blur} onChange={(e) => setBlur(Number(e.target.value))} />
            </label>

            <label className="editor-range">
              <span>Масштаб кадра</span>
              <select className="input" value={fit} onChange={(e) => setFit(e.target.value as Fit)} disabled={exporting}>
                <option value="contain">Вписать</option>
                <option value="cover">Заполнить</option>
                <option value="fill">Растянуть</option>
              </select>
            </label>

            <label className="editor-range">
              <span>Текст поверх</span>
              <input
                className="input"
                type="text"
                value={title}
                maxLength={80}
                placeholder="Заголовок…"
                disabled={exporting}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="editor-range">
              <span>Позиция текста</span>
              <select className="input" value={titlePos} onChange={(e) => setTitlePos(e.target.value as TitlePos)} disabled={exporting}>
                <option value="top">Сверху</option>
                <option value="center">По центру</option>
                <option value="bottom">Снизу</option>
              </select>
            </label>
            <label className="editor-range">
              <span>Цвет текста</span>
              <span className="editor-color">
                <input type="color" value={titleColor} disabled={exporting} onChange={(e) => setTitleColor(e.target.value)} />
              </span>
            </label>
            <label className="editor-range">
              <span>Размер текста · {titleSize}px</span>
              <input type="range" min={12} max={140} value={titleSize} onChange={(e) => setTitleSize(Number(e.target.value))} />
            </label>
            <label className="editor-range">
              <span>Кадров/с · {fps}</span>
              <input type="range" min={15} max={60} step={1} value={fps} onChange={(e) => setFps(Number(e.target.value))} disabled={exporting} />
            </label>

            <button className="btn btn-ghost btn-sm" onClick={reset} disabled={exporting}>
              <ArrowPathIcon style={{ width: 15, height: 15 }} /> Сбросить
            </button>
          </div>

          {error && <div className="badge badge-warning">{error}</div>}

          <div className="video-actions">
            <span className="text-text-tertiary" style={{ fontSize: "0.8rem", flex: 1 }}>
              {exporting ? `Экспорт WebM… ${progress}%` : "Монтаж перекодируется в WebM (тримминг, фильтры, текст)."}
            </span>
            <button className="btn btn-secondary" onClick={onClose} disabled={exporting}>
              Отмена
            </button>
            <button className="btn btn-primary" onClick={exportVideo} disabled={!ready || exporting}>
              <ArrowDownTrayIcon style={{ width: 16, height: 16 }} />
              {exporting ? "Экспорт…" : "Сохранить в проект"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { XMarkIcon, ArrowDownTrayIcon, CheckIcon } from "@heroicons/react/24/solid";
import { api, API_URL } from "../../lib/api";
import type { MediaFile } from "../../types";

interface AudioMassEditorProps {
  media?: MediaFile | null;
  projectId: number;
  onSaved: (media: MediaFile) => void;
  onClose: () => void;
}

type Status = "loading" | "ready" | "saving";

interface AudioMassEngine {
  LoadArrayBuffer: (blob: Blob) => void;
  wavesurfer?: { backend?: { buffer?: AudioBuffer } };
}

interface AudioMassWindow extends Window {
  PKAudioEditor?: { engine?: AudioMassEngine };
}

function resolve(url: string): string {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
}

function encodeWav(buf: AudioBuffer): Blob {
  const numCh = buf.numberOfChannels;
  const sr = buf.sampleRate;
  const len = buf.length;
  const blockAlign = numCh * 2;
  const dataSize = len * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numCh; ch += 1) channels.push(buf.getChannelData(ch));
  let offset = 44;
  for (let i = 0; i < len; i += 1) {
    for (let ch = 0; ch < numCh; ch += 1) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([view], { type: "audio/wav" });
}

export default function AudioMassEditor({ media, projectId, onSaved, onClose }: AudioMassEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const engineRef = useRef<AudioMassEngine | null>(null);
  const loadedRef = useRef(false);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  const getEngine = useCallback((): AudioMassEngine | null => {
    const win = iframeRef.current?.contentWindow as AudioMassWindow | null;
    return win?.PKAudioEditor?.engine ?? null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const engine = getEngine();
      if (!engine) return false;
      engineRef.current = engine;
      if (loadedRef.current) return true;
      loadedRef.current = true;
      try {
        if (media) {
          const res = await fetch(resolve(media.url), { credentials: "include" });
          if (!res.ok) throw new Error("Не удалось загрузить аудио");
          const blob = await res.blob();
          if (cancelled) return true;
          engine.LoadArrayBuffer(blob);
        }
        if (!cancelled) setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ошибка загрузки");
          setStatus("ready");
        }
      }
      return true;
    };

    const id = window.setInterval(() => {
      if (cancelled) return;
      void load().then((done) => {
        if (done) window.clearInterval(id);
      });
    }, 150);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [media, getEngine]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const currentBuffer = useCallback((): AudioBuffer | null => {
    const engine = engineRef.current || getEngine();
    return engine?.wavesurfer?.backend?.buffer ?? null;
  }, [getEngine]);

  const saveToProject = useCallback(async () => {
    const buffer = currentBuffer();
    if (!buffer || !buffer.length) {
      setError("Сначала загрузите или запишите аудио в AudioMass");
      return;
    }
    setStatus("saving");
    setError("");
    try {
      const blob = encodeWav(buffer);
      const base = (media?.originalName || "audio").replace(/\.[^.]+$/, "");
      const suffix = media ? "-edit" : "";
      const file = new File([blob], `${base}${suffix}.wav`, { type: "audio/wav" });
      const form = new FormData();
      form.append("file", file);
      const saved = await api.postForm<MediaFile>(`/api/projects/${projectId}/media`, form);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
      setStatus("ready");
    }
  }, [currentBuffer, media, projectId, onSaved, onClose]);

  const downloadWav = useCallback(() => {
    const buffer = currentBuffer();
    if (!buffer || !buffer.length) {
      setError("Сначала загрузите или запишите аудио в AudioMass");
      return;
    }
    const blob = encodeWav(buffer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(media?.originalName || "audio").replace(/\.[^.]+$/, "")}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentBuffer, media]);

  return (
    <div className="command-overlay editor-overlay">
      <div className="editor-modal editor-modal-wide editor-shell">
        <div className="preview-head">
          <span className="line-clamp-1">
            Аудиоредактор (AudioMass): {media ? media.originalName || media.filename : "новый проект"}
          </span>
          <div className="editor-status">
            {status === "loading" && <span>Загрузка…</span>}
            {status === "saving" && <span>Сохранение…</span>}
          </div>
          <button className="icon-btn sm" onClick={downloadWav} title="Скачать WAV" aria-label="Скачать WAV">
            <ArrowDownTrayIcon style={{ width: 16, height: 16 }} />
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={saveToProject}
            disabled={status === "saving"}
          >
            <CheckIcon style={{ width: 15, height: 15 }} /> Сохранить в проект
          </button>
          <button className="icon-btn sm" onClick={onClose} aria-label="Закрыть">
            <XMarkIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {error && (
          <div className="badge badge-warning" style={{ margin: "0 1rem" }}>
            {error}
          </div>
        )}

        <div className="image-editor-body">
          <iframe
            ref={iframeRef}
            className="editor-iframe"
            title="AudioMass"
            src="/audiomass/index.html?skipintro=1"
          />
        </div>
      </div>
    </div>
  );
}

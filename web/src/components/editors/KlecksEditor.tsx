import { useCallback, useEffect, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { api, API_URL } from "../../lib/api";
import type { MediaFile } from "../../types";

interface KlecksEditorProps {
  media?: MediaFile | null;
  projectId: number;
  onSaved: (media: MediaFile) => void;
  onClose: () => void;
  initialSize?: { w: number; h: number };
  initialBackground?: string;
}

type KemStatus = "loading" | "ready" | "saving";

interface KemMessage {
  type?: string;
  ok?: boolean;
  error?: string;
  png?: ArrayBuffer;
  data?: ArrayBuffer;
  kind?: "image" | "psd";
  mime?: string;
  width?: number;
  height?: number;
  background?: string;
}

export default function KlecksEditor({
  media,
  projectId,
  onSaved,
  onClose,
  initialSize,
  initialBackground,
}: KlecksEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<{ msg: KemMessage; transfer: Transferable[] } | null>(null);
  const [status, setStatus] = useState<KemStatus>("loading");
  const [error, setError] = useState("");

  const savePng = useCallback(
    async (png: ArrayBuffer) => {
      setStatus("saving");
      setError("");
      try {
        const base = (media?.originalName || "image").replace(/\.[^.]+$/, "");
        const suffix = media ? "-edit" : "";
        const file = new File([new Blob([png], { type: "image/png" })], `${base}${suffix}.png`, {
          type: "image/png",
        });
        const form = new FormData();
        form.append("file", file);
        const saved = await api.postForm<MediaFile>(`/api/projects/${projectId}/media`, form);
        onSaved(saved);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка сохранения");
        setStatus("ready");
      }
    },
    [media, projectId, onSaved, onClose]
  );

  const postToIframe = useCallback((msg: KemMessage, transfer: Transferable[] = []) => {
    const win = iframeRef.current?.contentWindow;
    if (readyRef.current && win) {
      win.postMessage(msg, "*", transfer);
    } else {
      pendingRef.current = { msg, transfer };
    }
  }, []);

  const onMessage = useCallback(
    (ev: MessageEvent) => {
      if (ev.source !== iframeRef.current?.contentWindow) return;
      const data = ev.data as KemMessage | null;
      if (!data || typeof data !== "object") return;

      if (data.type === "klecks:ready") {
        readyRef.current = true;
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending && iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(pending.msg, "*", pending.transfer);
        }
        return;
      }
      if (data.type === "klecks:opened") {
        setStatus("ready");
        return;
      }
      if (data.type === "klecks:error") {
        setError(data.error || "Ошибка Klecks");
        return;
      }
      if (data.type === "klecks:submit") {
        if (!data.ok || !data.png) {
          setError(data.error || "Ошибка сохранения в Klecks");
          setStatus("ready");
          return;
        }
        void savePng(data.png);
      }
    },
    [savePng]
  );

  useEffect(() => {
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onMessage]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (readyRef.current) return;
      iframeRef.current?.contentWindow?.postMessage({ type: "klecks:hello" }, "*");
    }, 400);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (media) {
        try {
          const url = media.url.startsWith("http") ? media.url : `${API_URL}${media.url}`;
          const res = await fetch(url, { credentials: "include" });
          if (!res.ok) throw new Error("Не удалось загрузить файл");
          const buf = await res.arrayBuffer();
          if (cancelled) return;
          const name = media.originalName || media.filename || "";
          const kind = media.mime?.includes("psd") || /\.psd$/i.test(name) ? "psd" : "image";
          postToIframe({ type: "klecks:open", kind, data: buf, mime: media.mime || "image/png" }, [buf]);
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : "Ошибка загрузки");
        }
      } else {
        postToIframe({
          type: "klecks:new",
          width: initialSize?.w || 1000,
          height: initialSize?.h || 1000,
          background: initialBackground || "#ffffff",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [media, initialSize, initialBackground, postToIframe]);

  return (
    <div className="command-overlay editor-overlay">
      <div className="editor-modal editor-modal-wide editor-shell">
        <div className="preview-head">
          <span className="line-clamp-1">
            Редактор (Klecks): {media ? media.originalName || media.filename : "новое изображение"}
          </span>
          <div className="editor-status">
            {status === "loading" && <span>Загрузка…</span>}
            {status === "saving" && <span>Сохранение…</span>}
          </div>
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
          <iframe ref={iframeRef} className="editor-iframe" title="Klecks" src="/klecks/index.html" />
        </div>
      </div>
    </div>
  );
}

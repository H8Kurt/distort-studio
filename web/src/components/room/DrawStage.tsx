import { useCallback, useEffect, useRef, useState } from "react";
import { PencilIcon, LockClosedIcon, LockOpenIcon } from "@heroicons/react/24/solid";
import { useLiveRoom } from "../../lib/liveRoom";
import Avatar from "../ui/Avatar";
import type { User } from "../../types";

interface DrawStageProps {
  currentUser: User;
}

interface KemMessage {
  type?: string;
  ok?: boolean;
  error?: string;
  png?: ArrayBuffer;
}

export default function DrawStage({ currentUser }: DrawStageProps) {
  const { state, takePencil, releasePencil, commitDraw } = useLiveRoom();
  const draw = state?.draw;
  const isHolder = !!draw && draw.lockHolderId === currentUser.id;
  const holderName = draw?.lockHolderName;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<{ msg: Record<string, unknown>; transfer: Transferable[] } | null>(null);
  const loadedImageRef = useRef<string | null>(null);
  const lastSeenPngRef = useRef<string | null>(null);
  const committedPngRef = useRef<string | null>(null);
  const pollBusyRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState("");

  const postToIframe = useCallback((msg: Record<string, unknown>, transfer: Transferable[] = []) => {
    const win = iframeRef.current?.contentWindow;
    if (readyRef.current && win) win.postMessage(msg, "*", transfer);
    else pendingRef.current = { msg, transfer };
  }, []);

  const bufferToDataUrl = (buf: ArrayBuffer): Promise<string> =>
    new Promise((resolve, reject) => {
      const blob = new Blob([buf], { type: "image/png" });
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read error"));
      reader.readAsDataURL(blob);
    });

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
      if (data.type === "klecks:png") {
        pollBusyRef.current = false;
        if (!data.ok || !data.png) return;
        void bufferToDataUrl(data.png).then((url) => {
          if (url === lastSeenPngRef.current) {
            // Холст стабилизировался — публикуем, если изменился
            if (url !== committedPngRef.current) {
              committedPngRef.current = url;
              commitDraw(url);
            }
          } else {
            lastSeenPngRef.current = url;
          }
        });
      }
    },
    [commitDraw]
  );

  useEffect(() => {
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onMessage]);

  // hello-поллинг, пока iframe не готов
  useEffect(() => {
    const id = window.setInterval(() => {
      if (readyRef.current) return;
      iframeRef.current?.contentWindow?.postMessage({ type: "klecks:hello" }, "*");
    }, 400);
    return () => window.clearInterval(id);
  }, []);

  // Загружаем общий холст, когда он появляется/меняется (но не поверх своей работы)
  useEffect(() => {
    if (!state) return;
    const img = draw?.image ?? null;
    if (img && img !== loadedImageRef.current && !isHolder) {
      loadedImageRef.current = img;
      committedPngRef.current = img;
      lastSeenPngRef.current = img;
      fetch(img)
        .then((r) => r.arrayBuffer())
        .then((buf) => postToIframe({ type: "klecks:open", kind: "image", data: buf, mime: "image/png" }, [buf]))
        .catch(() => setError("Не удалось загрузить холст"));
    }
  }, [state, draw?.image, isHolder, postToIframe]);

  // Первичный пустой холст
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (loadedImageRef.current) return;
      postToIframe({ type: "klecks:new", width: 1200, height: 800, background: "#ffffff" });
    }, 300);
    return () => window.clearTimeout(id);
  }, [postToIframe]);

  // Пока держим карандаш — опрашиваем холст и публикуем изменения
  useEffect(() => {
    if (!isHolder) return;
    const id = window.setInterval(() => {
      if (!readyRef.current || pollBusyRef.current) return;
      pollBusyRef.current = true;
      iframeRef.current?.contentWindow?.postMessage({ type: "klecks:getPng" }, "*");
    }, 1500);
    return () => window.clearInterval(id);
  }, [isHolder]);

  return (
    <section className="room-main draw-stage">
      <div className="draw-bar">
        <div className="draw-bar-left">
          {isHolder ? (
            <span className="draw-holder me">
              <LockOpenIcon /> Твой ход — рисуешь ты
            </span>
          ) : holderName ? (
            <span className="draw-holder">
              <LockClosedIcon /> Рисует @{holderName}
            </span>
          ) : (
            <span className="draw-holder free">
              <LockOpenIcon /> Карандаш свободен
            </span>
          )}
        </div>
        <div className="draw-bar-right">
          {isHolder ? (
            <button type="button" className="btn sm" onClick={releasePencil}>
              Отпустить карандаш
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary sm"
              disabled={!!holderName}
              onClick={takePencil}
              title={holderName ? "Сейчас рисует другой" : "Взять карандаш"}
            >
              <PencilIcon /> Взять карандаш
            </button>
          )}
        </div>
      </div>

      {error && <div className="field-error">{error}</div>}

      <div className={`draw-frame${isHolder ? "" : " locked"}`}>
        <iframe ref={iframeRef} className="editor-iframe" title="Klecks" src="/klecks/index.html" />
        {!isHolder && (
          <div className="draw-overlay">
            <Avatar username={holderName || "?"} size="lg" />
            <p>{holderName ? `Рисует @${holderName}` : "Нажми «Взять карандаш», чтобы рисовать"}</p>
          </div>
        )}
        {status === "loading" && <div className="draw-loading">Загрузка холста…</div>}
      </div>
    </section>
  );
}

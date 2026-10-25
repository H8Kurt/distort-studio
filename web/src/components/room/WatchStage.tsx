import { useEffect, useRef, useState } from "react";
import { PlayIcon, PauseIcon, LinkIcon, FilmIcon } from "@heroicons/react/24/solid";
import { useLiveRoom } from "../../lib/liveRoom";
import { loadYouTubeApi, parseYouTubeId, formatDuration, type YTPlayer } from "../../lib/youtube";

export default function WatchStage() {
  const { state, isHost, sendWatch, room } = useLiveRoom();
  const watch = state?.watch;

  const holderRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const lastVideoRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const seekingRef = useRef(false);

  // Инициализация YouTube-плеера
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !holderRef.current) return;
        playerRef.current = new YT.Player(holderRef.current, {
          videoId: undefined,
          playerVars: { controls: 0, rel: 0, modestbranding: 1, disablekb: 1, playsinline: 1 },
          events: { onReady: () => setReady(true) },
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка YouTube"));
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* noop */
      }
      playerRef.current = null;
    };
  }, []);

  // Синхронизация с состоянием комнаты
  useEffect(() => {
    const p = playerRef.current;
    if (!ready || !p || !watch) return;
    const vid = watch.videoId;
    if (!vid) return;

    if (lastVideoRef.current !== vid) {
      lastVideoRef.current = vid;
      p.loadVideoById({ videoId: vid, startSeconds: watch.position || 0 });
      if (!watch.playing) {
        window.setTimeout(() => p.pauseVideo(), 500);
      }
      return;
    }

    const cur = typeof p.getCurrentTime === "function" ? p.getCurrentTime() : 0;
    if (Math.abs(cur - watch.position) > 2.5) {
      p.seekTo(watch.position, true);
    }
    if (watch.playing) p.playVideo();
    else p.pauseVideo();
  }, [ready, watch?.videoId, watch?.playing, watch?.position, watch?.baseAt, watch]);

  // Тикер для отображения времени (и для хоста)
  useEffect(() => {
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p || typeof p.getCurrentTime !== "function") return;
      if (!seekingRef.current) setCurrent(p.getCurrentTime() || 0);
      setDuration(p.getDuration?.() || 0);
    }, 400);
    return () => window.clearInterval(id);
  }, []);

  const loadUrl = () => {
    const vid = parseYouTubeId(urlInput);
    if (!vid) {
      setError("Не удалось распознать ссылку 📼");
      return;
    }
    setError("");
    sendWatch({ type: "load", videoId: vid });
    sendWatch({ type: "play", position: 0 });
    setUrlInput("");
  };

  const toggle = () => {
    if (!watch) return;
    if (watch.playing) sendWatch({ type: "pause" });
    else sendWatch({ type: "play", position: current });
  };

  const total = duration || 0;
  const progress = total > 0 ? Math.min(1, current / total) : 0;

  return (
    <section className="room-main watch-stage">
      <div className="watch-frame">
        <div className="watch-embed">
          <div ref={holderRef} className="watch-embed-inner" />
          {!watch?.videoId && (
            <div className="watch-placeholder">
              <FilmIcon />
              <p>{isHost ? "Вставь ссылку на YouTube, чтобы начать" : "Хост ещё ничего не включил"}</p>
            </div>
          )}
        </div>

        <div className="watch-controls">
          <div className="watch-progress" aria-hidden={!isHost}>
            <div className="watch-progress-fill" style={{ width: `${progress * 100}%` }} />
            {isHost && (
              <input
                type="range"
                className="watch-seek"
                min={0}
                max={Math.max(1, Math.round(total))}
                value={Math.round(current)}
                onMouseDown={() => { seekingRef.current = true; }}
                onChange={(e) => setCurrent(Number(e.target.value))}
                onMouseUp={(e) => { seekingRef.current = false; sendWatch({ type: "seek", position: Number((e.target as HTMLInputElement).value) }); }}
                onTouchEnd={(e) => { seekingRef.current = false; sendWatch({ type: "seek", position: Number((e.target as HTMLInputElement).value) }); }}
                aria-label="Позиция видео"
              />
            )}
          </div>
          <div className="watch-time">
            <span>{formatDuration(current)}</span>
            <span>{formatDuration(total)}</span>
          </div>

          <div className="room-transport">
            <button
              type="button"
              className={`room-tbtn big${watch?.playing ? " on" : ""}`}
              disabled={!isHost || !watch?.videoId}
              onClick={toggle}
              title={watch?.playing ? "Пауза" : "Играть"}
            >
              {watch?.playing ? <PauseIcon /> : <PlayIcon />}
            </button>
          </div>

          {isHost ? (
            <div className="watch-url">
              <LinkIcon />
              <input
                className="input"
                value={urlInput}
                placeholder="Ссылка YouTube или id видео"
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") loadUrl(); }}
              />
              <button type="button" className="btn btn-primary sm" onClick={loadUrl}>
                Включить
              </button>
            </div>
          ) : (
            <p className="room-follow">Управляет видео @{room?.hostName || room?.host?.username || "хост"}</p>
          )}

          {error && <div className="field-error">{error}</div>}
        </div>
      </div>
    </section>
  );
}

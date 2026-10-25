import { useCallback, useState } from "react";
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  MusicalNoteIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import { api } from "../../lib/api";
import { usePlayer, trackToPlayer, formatTime } from "../../lib/player";
import { useLiveRoom } from "../../lib/liveRoom";
import AlbumArt from "../player/AlbumArt";
import Modal from "../ui/Modal";
import type { Track } from "../../types";

export default function MusicStage() {
  const { state, isHost, control, room } = useLiveRoom();
  const player = usePlayer();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [picked, setPicked] = useState<number[]>([]);

  const openPicker = useCallback(async () => {
    setPickerOpen(true);
    try {
      const list = await api.get<Track[]>("/api/tracks/me");
      setTracks(Array.isArray(list) ? list : []);
    } catch {
      setTracks([]);
    }
  }, []);

  const applyQueue = () => {
    const map = new Map(tracks.map((t) => [t.id, t]));
    const queue = picked
      .map((pid) => map.get(pid))
      .filter((t): t is Track => Boolean(t))
      .map((t) => trackToPlayer(t));
    if (!queue.length) return;
    control({ type: "queue", queue, index: 0 });
    control({ type: "play", position: 0 });
    setPickerOpen(false);
    setPicked([]);
  };

  const stateQueue = state?.queue ?? [];
  const currentIndex = state?.index ?? 0;
  const currentTrack = stateQueue[currentIndex] ?? null;
  const total = player.duration || currentTrack?.duration || 0;
  const position = player.currentTime;
  const progress = total > 0 ? Math.min(1, position / total) : 0;
  const playing = state?.playing ?? false;
  const hostName = room?.hostName || room?.host?.username || "хост";

  return (
    <>
      <section className="room-main">
        <div className={`room-now${playing ? " playing" : ""}`}>
          <AlbumArt track={currentTrack} size={132} spinning={playing} />
          <div className="room-now-meta">
            <span className="room-now-label">Сейчас играет</span>
            <span className="room-now-title">{currentTrack?.title || "Тишина"}</span>
            <span className="room-now-artist">{currentTrack?.artist || "Хост ещё не включил трек"}</span>

            {isHost ? (
              <input
                type="range"
                className="room-seek"
                min={0}
                max={Math.max(1, Math.round(total))}
                value={Math.round(position)}
                onChange={(e) => control({ type: "seek", position: Number(e.target.value) })}
                aria-label="Позиция"
              />
            ) : (
              <div className="room-seek-readonly">
                <span style={{ width: `${progress * 100}%` }} />
              </div>
            )}
            <div className="room-time">
              <span>{formatTime(position)}</span>
              <span>{formatTime(total)}</span>
            </div>

            <div className="room-transport">
              <button type="button" className="room-tbtn" disabled={!isHost} onClick={() => control({ type: "prev" })} title="Назад">
                <BackwardIcon />
              </button>
              <button
                type="button"
                className={`room-tbtn big${playing ? " on" : ""}`}
                disabled={!isHost}
                onClick={() => control(playing ? { type: "pause" } : { type: "play", position })}
                title={playing ? "Пауза" : "Играть"}
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button type="button" className="room-tbtn" disabled={!isHost} onClick={() => control({ type: "next" })} title="Вперёд">
                <ForwardIcon />
              </button>
            </div>

            {!isHost && <p className="room-follow">Ты в режиме слушателя — управляет @{hostName}</p>}
          </div>
        </div>

        <div className="room-queue">
          <div className="room-queue-head">
            <span>
              <MusicalNoteIcon /> Очередь · {stateQueue.length}
            </span>
            {isHost && (
              <button type="button" className="btn btn-ghost sm" onClick={openPicker}>
                <PlusIcon /> Заменить очередь
              </button>
            )}
          </div>
          {stateQueue.length === 0 ? (
            <p className="text-text-secondary">
              {isHost ? "Добавь треки, чтобы начать вечеринку." : "Хост пока не добавил треки."}
            </p>
          ) : (
            <ul className="room-queue-list">
              {stateQueue.map((t, i) => (
                <li key={`${t.id}-${i}`}>
                  <button
                    type="button"
                    className={`room-queue-item${i === currentIndex ? " current" : ""}`}
                    disabled={!isHost}
                    onClick={() => control({ type: "index", index: i })}
                  >
                    <span className="room-queue-num">{i + 1}</span>
                    <span className="room-queue-name">
                      {t.title}
                      {t.artist ? ` — ${t.artist}` : ""}
                    </span>
                    <span className="room-queue-dur">{formatTime(t.duration || 0)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Очередь комнаты"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setPickerOpen(false)}>
              Отмена
            </button>
            <button type="button" className="btn btn-primary" onClick={applyQueue} disabled={!picked.length}>
              Поставить ({picked.length})
            </button>
          </>
        }
      >
        {tracks.length === 0 ? (
          <p className="text-text-secondary">Нет треков в библиотеке.</p>
        ) : (
          <div className="room-track-picker">
            {tracks.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`room-track-opt${picked.includes(t.id) ? " on" : ""}`}
                onClick={() =>
                  setPicked((prev) => (prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]))
                }
              >
                <span className="room-track-opt-name">
                  {t.title}
                  {t.artist ? ` — ${t.artist}` : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

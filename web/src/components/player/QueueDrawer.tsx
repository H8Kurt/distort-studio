import { XMarkIcon, TrashIcon, MusicalNoteIcon } from "@heroicons/react/24/solid";
import { formatTime, usePlayer } from "../../lib/player";
import AlbumArt from "./AlbumArt";

interface QueueDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function QueueDrawer({ open, onClose }: QueueDrawerProps) {
  const { queue, index, playQueueIndex, removeFromQueue, clearQueue } = usePlayer();

  return (
    <div className={`pv-queue${open ? " open" : ""}`} aria-hidden={!open}>
      <div className="pv-queue-head">
        <span className="pv-queue-title">
          <MusicalNoteIcon /> Очередь · {queue.length}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {queue.length > 0 && (
            <button type="button" className="pv-icon-btn" title="Очистить" onClick={clearQueue}>
              <TrashIcon />
            </button>
          )}
          <button type="button" className="pv-icon-btn" title="Закрыть" onClick={onClose}>
            <XMarkIcon />
          </button>
        </div>
      </div>

      <div className="pv-queue-list">
        {queue.length === 0 && <div className="pv-queue-empty">Очередь пуста</div>}
        {queue.map((track, i) => (
          <div key={track.id} className={`pv-queue-item${i === index ? " active" : ""}`}>
            <button type="button" className="pv-queue-play" onClick={() => playQueueIndex(i)} title="Играть">
              <AlbumArt track={track} size={38} spinning={i === index} />
            </button>
            <div className="pv-queue-meta" onClick={() => playQueueIndex(i)}>
              <span className="pv-queue-name">{track.title}</span>
              <span className="pv-queue-sub">
                {track.artist || "—"}
                {track.duration ? ` · ${formatTime(track.duration)}` : ""}
              </span>
            </div>
            <button type="button" className="pv-icon-btn" title="Убрать" onClick={() => removeFromQueue(track.id)}>
              <XMarkIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

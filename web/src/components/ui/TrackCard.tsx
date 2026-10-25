import { useEffect, useState } from "react";
import {
  PlayIcon,
  PauseIcon,
  HeartIcon,
  PlusIcon,
  TrashIcon,
  MusicalNoteIcon,
  QueueListIcon,
} from "@heroicons/react/24/solid";
import { api } from "../../lib/api";
import { usePlayer, trackToPlayer, formatTime, resolveMediaUrl } from "../../lib/player";
import { useConfirm } from "./confirm";
import type { Track } from "../../types";

interface TrackCardProps {
  track: Track;
  onChange?: () => void;
  onAddToPlaylist?: (track: Track) => void;
}

export default function TrackCard({ track, onChange, onAddToPlaylist }: TrackCardProps) {
  const { playTracks, addToQueue, current, isPlaying, toggle } = usePlayer();
  const confirm = useConfirm();
  const [liked, setLiked] = useState(!!track.isLiked);
  const [likeCount, setLikeCount] = useState(track.likeCount || 0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLiked(!!track.isLiked);
    setLikeCount(track.likeCount || 0);
  }, [track.id, track.isLiked, track.likeCount]);

  const playerTrack = trackToPlayer(track);
  const isCurrent = current?.id === playerTrack.id;

  const toggleLike = async () => {
    try {
      const res = await api.post<{ likeCount: number; isLiked: boolean }>(`/api/tracks/${track.id}/like`);
      setLiked(res.isLiked);
      setLikeCount(res.likeCount);
      onChange?.();
    } catch {
      /* ignore */
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: "Удалить трек?",
      message: `«${track.title}» будет удалён безвозвратно.`,
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.del(`/api/tracks/${track.id}`);
      onChange?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`track-card${isCurrent ? " playing" : ""}`}>
      <button
        type="button"
        className="track-art"
        onClick={() => (isCurrent ? toggle() : playTracks([playerTrack]))}
        title={isCurrent && isPlaying ? "Пауза" : "Играть"}
      >
        {track.thumbUrl ? (
          <img src={resolveMediaUrl(track.thumbUrl)} alt={track.title} />
        ) : (
          <MusicalNoteIcon />
        )}
        <span className="track-art-overlay">
          {isCurrent && isPlaying ? <PauseIcon /> : <PlayIcon />}
        </span>
      </button>

      <div className="track-info">
        <div className="track-title line-clamp-1">{track.title}</div>
        <div className="track-sub line-clamp-1">
          {track.artist || "Неизвестный"}
          {track.genre ? ` · ${track.genre}` : ""}
        </div>
        <div className="track-meta">
          {track.duration ? <span>{formatTime(track.duration)}</span> : null}
          <span>{track.plays || 0} ▶</span>
          <span>{likeCount} ♥</span>
        </div>
      </div>

      <div className="track-actions">
        <button
          type="button"
          className={`pv-icon-btn${liked ? " on" : ""}`}
          onClick={toggleLike}
          title="Лайк"
          aria-pressed={liked}
        >
          <HeartIcon />
        </button>
        <button
          type="button"
          className="pv-icon-btn"
          onClick={() => addToQueue(playerTrack)}
          title="В очередь"
        >
          <QueueListIcon />
        </button>
        {onAddToPlaylist && (
          <button
            type="button"
            className="pv-icon-btn"
            onClick={() => onAddToPlaylist(track)}
            title="В плейлист"
          >
            <PlusIcon />
          </button>
        )}
        {track.isOwner && (
          <button
            type="button"
            className="pv-icon-btn danger"
            onClick={remove}
            disabled={busy}
            title="Удалить"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
}

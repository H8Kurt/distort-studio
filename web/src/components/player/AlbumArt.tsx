import { MusicalNoteIcon } from "@heroicons/react/24/solid";
import { resolveMediaUrl, type PlayerTrack } from "../../lib/player";

interface AlbumArtProps {
  track: PlayerTrack | null;
  size?: number;
  spinning?: boolean;
  className?: string;
}

export default function AlbumArt({ track, size = 48, spinning = false, className = "" }: AlbumArtProps) {
  const radius = Math.round(size * 0.22);
  if (track?.thumbUrl) {
    return (
      <img
        src={resolveMediaUrl(track.thumbUrl)}
        alt={track.title}
        className={`pv-art ${spinning ? "spinning" : ""} ${className}`.trim()}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <div
      className={`pv-art pv-art-fallback ${spinning ? "spinning" : ""} ${className}`.trim()}
      style={{ width: size, height: size, borderRadius: radius }}
      aria-hidden
    >
      <MusicalNoteIcon style={{ width: size * 0.42, height: size * 0.42 }} />
    </div>
  );
}

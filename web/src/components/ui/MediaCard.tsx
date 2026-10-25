import React from "react";
import { MusicalNoteIcon, PhotoIcon, DocumentIcon, PlayIcon } from "@heroicons/react/24/solid";
import { API_URL } from "../../lib/api";
import { usePlayer, mediaToPlayer } from "../../lib/player";
import type { MediaFile } from "../../types";

interface MediaCardProps {
  media: MediaFile;
}

const MediaCard: React.FC<MediaCardProps> = ({ media }) => {
  const { playTrack } = usePlayer();
  const isImage = media.type === "image" || media.mime?.startsWith("image/");
  const isAudio = media.type === "audio" || media.mime?.startsWith("audio/");
  const src = media.url?.startsWith("http") ? media.url : `${API_URL}${media.url}`;
  const thumb =
    media.thumbUrl &&
    (media.thumbUrl.startsWith("http") ? media.thumbUrl : `${API_URL}${media.thumbUrl}`);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          height: 150,
          background: "var(--bg-hover)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {isImage ? (
          <img
            src={thumb || src}
            alt={media.originalName || "media"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : isAudio ? (
          <MusicalNoteIcon style={{ width: 44, height: 44, color: "var(--accent-primary)" }} />
        ) : (
          <DocumentIcon style={{ width: 44, height: 44, color: "var(--text-tertiary)" }} />
        )}
      </div>

      <div style={{ padding: "0.85rem" }}>
        <div className="line-clamp-1" style={{ fontWeight: 600, fontSize: "0.88rem" }}>
          {media.originalName || media.filename || "Файл"}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
          <span className="badge badge-neutral">
            {isImage ? <PhotoIcon style={{ width: 12, height: 12 }} /> : <MusicalNoteIcon style={{ width: 12, height: 12 }} />}
            {media.type || "file"}
          </span>
          {isAudio && (
            <button type="button" className="file-play-btn" onClick={() => playTrack(mediaToPlayer(media))}>
              <PlayIcon style={{ width: 12, height: 12 }} /> В плеер
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaCard;

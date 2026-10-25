import { createContext, useContext } from "react";
import { API_URL } from "./api";
import type { MediaFile, Track } from "../types";

export type PlayerView = "cassette" | "winamp" | "minimal";
export type RepeatMode = "off" | "all" | "one";
export type TrackSource = "library" | "media";

export interface PlayerSyncState {
  queue?: PlayerTrack[];
  index?: number;
  playing?: boolean;
  position?: number;
}

export interface PlayerTrack {
  id: string;
  trackId?: number;
  title: string;
  artist?: string | null;
  url: string;
  thumbUrl?: string | null;
  duration?: number;
  source: TrackSource;
}

export interface PlayerContextValue {
  queue: PlayerTrack[];
  index: number;
  current: PlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  view: PlayerView;
  analyser: AnalyserNode | null;
  expanded: boolean;
  locked: boolean;
  playTracks: (tracks: PlayerTrack[], startIndex?: number) => void;
  playTrack: (track: PlayerTrack) => void;
  addToQueue: (track: PlayerTrack) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  playQueueIndex: (i: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setView: (v: PlayerView) => void;
  setExpanded: (v: boolean) => void;
  setLocked: (v: boolean) => void;
  syncState: (state: PlayerSyncState) => void;
}

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

export function resolveMediaUrl(url: string): string {
  return url.startsWith("http") || url.startsWith("data:") ? url : `${API_URL}${url}`;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function trackKey(id: string | number): string {
  return typeof id === "string" ? id : `lib-${id}`;
}

export function trackToPlayer(track: Track): PlayerTrack {
  return {
    id: `lib-${track.id}`,
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    url: track.url,
    thumbUrl: track.thumbUrl,
    duration: track.duration,
    source: "library",
  };
}

export function mediaToPlayer(media: MediaFile): PlayerTrack {
  return {
    id: `media-${media.id ?? media.url}`,
    title: media.originalName || media.filename || "Аудио",
    artist: "Из проекта",
    url: media.url,
    thumbUrl: media.thumbUrl,
    source: "media",
  };
}

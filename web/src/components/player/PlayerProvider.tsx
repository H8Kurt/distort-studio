import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../../lib/api";
import {
  PlayerContext,
  resolveMediaUrl,
  type PlayerContextValue,
  type PlayerSyncState,
  type PlayerTrack,
  type PlayerView,
  type RepeatMode,
} from "../../lib/player";

const LS = {
  queue: "player.queue",
  index: "player.index",
  volume: "player.volume",
  repeat: "player.repeat",
  shuffle: "player.shuffle",
  view: "player.view",
};

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readNum(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export default function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [queue, setQueue] = useState<PlayerTrack[]>(() => readJSON<PlayerTrack[]>(LS.queue, []));
  const [index, setIndex] = useState(() => readNum(LS.index, 0));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => readNum(LS.volume, 0.9));
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(() => readJSON(LS.shuffle, false));
  const [repeat, setRepeat] = useState<RepeatMode>(() => readJSON<RepeatMode>(LS.repeat, "off"));
  const [view, setViewState] = useState<PlayerView>(() => readJSON<PlayerView>(LS.view, "winamp"));
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [locked, setLocked] = useState(false);

  // Позиция, которую нужно применить после загрузки метаданных (комнаты)
  const pendingSeekRef = useRef<number | null>(null);
  const remoteApplyRef = useRef(false);

  // Зеркала для обработчиков событий
  const queueRef = useRef(queue);
  const indexRef = useRef(index);
  const shuffleRef = useRef(shuffle);
  const repeatRef = useRef(repeat);
  const isPlayingRef = useRef(isPlaying);
  const lockedRef = useRef(locked);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { lockedRef.current = locked; }, [locked]);

  const current = queue[index] ?? null;
  const currentRef = useRef<PlayerTrack | null>(current);
  useEffect(() => { currentRef.current = current; }, [current]);

  // Персист
  useEffect(() => { try { localStorage.setItem(LS.queue, JSON.stringify(queue)); } catch { /* ignore */ } }, [queue]);
  useEffect(() => { try { localStorage.setItem(LS.index, String(index)); } catch { /* ignore */ } }, [index]);
  useEffect(() => { try { localStorage.setItem(LS.volume, String(volume)); } catch { /* ignore */ } }, [volume]);
  useEffect(() => { try { localStorage.setItem(LS.shuffle, JSON.stringify(shuffle)); } catch { /* ignore */ } }, [shuffle]);
  useEffect(() => { try { localStorage.setItem(LS.repeat, JSON.stringify(repeat)); } catch { /* ignore */ } }, [repeat]);
  useEffect(() => { try { localStorage.setItem(LS.view, JSON.stringify(view)); } catch { /* ignore */ } }, [view]);

  // Резервируем место под док
  useEffect(() => {
    const open = queue.length > 0;
    document.documentElement.dataset.player = open ? "1" : "0";
    return () => { document.documentElement.dataset.player = "0"; };
  }, [queue.length]);

  const ensureAnalyser = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || sourceNodeRef.current) {
      audioCtxRef.current?.resume().catch(() => undefined);
      return;
    }
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(audio);
      const an = ctx.createAnalyser();
      an.fftSize = 128;
      an.smoothingTimeConstant = 0.8;
      source.connect(an);
      an.connect(ctx.destination);
      audioCtxRef.current = ctx;
      sourceNodeRef.current = source;
      setAnalyser(an);
      ctx.resume().catch(() => undefined);
    } catch {
      /* визуализатор недоступен — не критично */
    }
  }, []);

  const doPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentRef.current) return;
    ensureAnalyser();
    setIsPlaying(true);
    audio.play().catch(() => setIsPlaying(false));
  }, [ensureAnalyser]);

  const doPause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (lockedRef.current) return;
    if (isPlayingRef.current) doPause();
    else doPlay();
  }, [doPlay, doPause]);

  const playQueueIndex = useCallback((i: number) => {
    if (lockedRef.current) return;
    const q = queueRef.current;
    if (i < 0 || i >= q.length) return;
    setIndex(i);
    setIsPlaying(true);
  }, []);

  const playTracks = useCallback((tracks: PlayerTrack[], startIndex = 0) => {
    if (lockedRef.current) return;
    if (!tracks.length) return;
    setQueue(tracks);
    setIndex(Math.min(Math.max(0, startIndex), tracks.length - 1));
    setIsPlaying(true);
  }, []);

  const playTrack = useCallback((track: PlayerTrack) => {
    if (lockedRef.current) return;
    const q = queueRef.current;
    const existing = q.findIndex((t) => t.id === track.id);
    if (existing >= 0) {
      setIndex(existing);
      setIsPlaying(true);
      return;
    }
    setQueue([...q, track]);
    setIndex(q.length);
    setIsPlaying(true);
  }, []);

  const addToQueue = useCallback((track: PlayerTrack) => {
    if (lockedRef.current) return;
    setQueue((prev) => (prev.some((t) => t.id === track.id) ? prev : [...prev, track]));
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const next = prev.filter((t) => t.id !== id);
      setIndex((cur) => {
        if (idx < cur) return cur - 1;
        if (idx === cur) return Math.min(cur, Math.max(0, next.length - 1));
        return cur;
      });
      return next;
    });
  }, []);

  const clearQueue = useCallback(() => {
    doPause();
    setQueue([]);
    setIndex(0);
  }, [doPause]);

  const next = useCallback(() => {
    if (lockedRef.current) return;
    const q = queueRef.current;
    if (q.length === 0) return;
    if (shuffleRef.current && q.length > 1) {
      let r = indexRef.current;
      while (r === indexRef.current) r = Math.floor(Math.random() * q.length);
      setIndex(r);
    } else {
      setIndex((indexRef.current + 1) % q.length);
    }
    setIsPlaying(true);
  }, []);

  const prev = useCallback(() => {
    if (lockedRef.current) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const q = queueRef.current;
    if (q.length === 0) return;
    setIndex((indexRef.current - 1 + q.length) % q.length);
    setIsPlaying(true);
  }, []);

  const seek = useCallback((time: number) => {
    if (lockedRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, time);
    setCurrentTime(Math.max(0, time));
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    if (clamped > 0) setMuted(false);
  }, []);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);
  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  }, []);
  const setView = useCallback((v: PlayerView) => setViewState(v), []);

  // Применить состояние из комнаты (совместное прослушивание)
  const syncState = useCallback((s: PlayerSyncState) => {
    remoteApplyRef.current = true;
    if (Array.isArray(s.queue)) {
      setQueue(s.queue);
      const nextIndex = Math.min(
        Math.max(0, s.index ?? 0),
        Math.max(0, s.queue.length - 1)
      );
      setIndex(nextIndex);
      if (typeof s.position === "number") pendingSeekRef.current = Math.max(0, s.position);
    } else if (typeof s.index === "number") {
      setIndex(s.index);
      if (typeof s.position === "number") pendingSeekRef.current = Math.max(0, s.position);
    } else if (typeof s.position === "number") {
      // Тот же трек — перематываем сразу, если аудио уже готово
      pendingSeekRef.current = Math.max(0, s.position);
      const audio = audioRef.current;
      if (audio && audio.readyState >= 1) {
        audio.currentTime = Math.max(0, s.position);
        setCurrentTime(Math.max(0, s.position));
      }
    }
    if (typeof s.playing === "boolean") setIsPlaying(s.playing);
  }, []);

  // Смена трека — грузим источник
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.src = resolveMediaUrl(current.url);
    audio.load();
    setCurrentTime(0);
    setDuration(current.duration || 0);
    if (isPlayingRef.current) {
      ensureAnalyser();
      audio.play().catch(() => setIsPlaying(false));
    }
    if (!remoteApplyRef.current && current.source === "library" && current.trackId != null) {
      api.post(`/api/tracks/${current.trackId}/play`).catch(() => undefined);
    }
    remoteApplyRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      ensureAnalyser();
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Громкость
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // События аудио
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
      if (pendingSeekRef.current != null) {
        const target = Math.min(pendingSeekRef.current, Number.isFinite(audio.duration) ? audio.duration : pendingSeekRef.current);
        try { audio.currentTime = Math.max(0, target); } catch { /* ignore */ }
        pendingSeekRef.current = null;
      }
    };
    const onEnded = () => {
      if (repeatRef.current === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => undefined);
        return;
      }
      const q = queueRef.current;
      const last = indexRef.current >= q.length - 1;
      if (last && repeatRef.current === "off" && !shuffleRef.current) {
        setIsPlaying(false);
        return;
      }
      next();
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
    };
  }, [next]);

  // Пробел — плей/пауза (вне полей ввода)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      if (!queueRef.current.length) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue,
      index,
      current,
      isPlaying,
      currentTime,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      view,
      analyser,
      expanded,
      locked,
      playTracks,
      playTrack,
      addToQueue,
      removeFromQueue,
      clearQueue,
      playQueueIndex,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      setView,
      setExpanded,
      setLocked,
      syncState,
    }),
    [
      queue, index, current, isPlaying, currentTime, duration, volume, muted,
      shuffle, repeat, view, analyser, expanded, locked, playTracks, playTrack,
      addToQueue, removeFromQueue, clearQueue, playQueueIndex, toggle, next,
      prev, seek, setVolume, toggleMute, toggleShuffle, cycleRepeat, setView,
      setLocked, syncState,
    ]
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />
    </PlayerContext.Provider>
  );
}

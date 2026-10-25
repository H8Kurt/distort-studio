import { useCallback, useEffect, useRef, useState } from "react";
import {
  PlusIcon,
  PlayIcon,
  ArrowUpTrayIcon,
  MusicalNoteIcon,
  TrashIcon,
  ListBulletIcon,
} from "@heroicons/react/24/solid";
import { api } from "../lib/api";
import { usePlayer, trackToPlayer } from "../lib/player";
import { useConfirm } from "../components/ui/confirm";
import TrackCard from "../components/ui/TrackCard";
import Modal from "../components/ui/Modal";
import type { Playlist, Track, TrackListResponse, TrackVisibility } from "../types";

type Tab = "mine" | "liked" | "all" | "playlists";

const TABS: { key: Tab; label: string }[] = [
  { key: "mine", label: "Моя музыка" },
  { key: "liked", label: "Лайкнутое" },
  { key: "all", label: "Библиотека" },
  { key: "playlists", label: "Плейлисты" },
];

const GENRES = ["Все", "Электроника", "Хип-хоп", "Рок", "Поп", "Эмбиент", "Лоу-фай", "Классика", "Джаз", "Другое"];

export default function LibraryPage() {
  const { playTracks } = usePlayer();
  const confirm = useConfirm();

  const [tab, setTab] = useState<Tab>("mine");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(false);
  const [genre, setGenre] = useState("Все");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [upGenre, setUpGenre] = useState("Другое");
  const [visibility, setVisibility] = useState<TrackVisibility>("PUBLIC");
  const [duration, setDuration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [playlistModal, setPlaylistModal] = useState(false);
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [pickerTrack, setPickerTrack] = useState<Track | null>(null);

  const loadPlaylists = useCallback(async () => {
    try {
      setPlaylists(await api.get<Playlist[]>("/api/playlists"));
    } catch {
      setPlaylists([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "mine") setTracks(await api.get<Track[]>("/api/tracks/me"));
      else if (tab === "liked") setTracks(await api.get<Track[]>("/api/tracks/liked"));
      else if (tab === "all") {
        const q = genre && genre !== "Все" ? `?genre=${encodeURIComponent(genre)}` : "";
        const res = await api.get<TrackListResponse>(`/api/tracks${q}`);
        setTracks(res.tracks);
      } else {
        await loadPlaylists();
      }
    } catch {
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, [tab, genre, loadPlaylists]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const onFile = (f: File | null) => {
    setFile(f);
    if (!f) return;
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    const url = URL.createObjectURL(f);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => URL.revokeObjectURL(url);
    audio.src = url;
  };

  const submitUpload = async () => {
    if (!file) {
      setError("Выбери аудиофайл");
      return;
    }
    if (!title.trim()) {
      setError("Укажи название");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title.trim());
      form.append("genre", upGenre);
      form.append("visibility", visibility);
      form.append("duration", String(Math.round(duration)));
      await api.postForm<Track>("/api/tracks", form);
      setUploadOpen(false);
      setFile(null);
      setTitle("");
      setDuration(0);
      if (tab !== "mine") setTab("mine");
      else load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить трек");
    } finally {
      setBusy(false);
    }
  };

  const createPlaylist = async () => {
    if (!playlistTitle.trim()) return;
    setBusy(true);
    try {
      await api.post<Playlist>("/api/playlists", { title: playlistTitle.trim() });
      setPlaylistTitle("");
      setPlaylistModal(false);
      await loadPlaylists();
    } finally {
      setBusy(false);
    }
  };

  const openPlaylist = async (p: Playlist) => {
    const full = await api.get<Playlist>(`/api/playlists/${p.id}`);
    setActivePlaylist(full);
  };

  const removePlaylist = async (p: Playlist) => {
    const ok = await confirm({
      title: "Удалить плейлист?",
      message: `«${p.title}» будет удалён.`,
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!ok) return;
    await api.del(`/api/playlists/${p.id}`);
    if (activePlaylist?.id === p.id) setActivePlaylist(null);
    await loadPlaylists();
  };

  const addToPlaylist = async (playlistId: number) => {
    if (!pickerTrack) return;
    try {
      await api.post(`/api/playlists/${playlistId}/tracks`, { trackId: pickerTrack.id });
    } finally {
      setPickerTrack(null);
    }
  };

  const removeFromPlaylist = async (playlistId: number, trackId: number) => {
    const res = await api.del<Playlist>(`/api/playlists/${playlistId}/tracks/${trackId}`);
    setActivePlaylist(res);
  };

  const playAll = () => {
    if (tracks.length) playTracks(tracks.map(trackToPlayer));
  };

  const shownTracks = activePlaylist?.tracks || tracks;

  return (
    <div className="library-page">
      <header className="library-head">
        <div>
          <div className="eyebrow">звук · библиотека</div>
          <h1 style={{ margin: "0.3rem 0 0" }}>
            <MusicalNoteIcon className="library-h1-icon" /> Музыка
          </h1>
        </div>
        <div className="library-head-actions">
          {tab !== "playlists" && shownTracks.length > 0 && (
            <button type="button" className="btn btn-secondary" onClick={playAll}>
              <PlayIcon /> Играть всё
            </button>
          )}
          {tab === "playlists" ? (
            <button type="button" className="btn btn-primary" onClick={() => setPlaylistModal(true)}>
              <PlusIcon /> Плейлист
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setUploadOpen(true)}>
              <ArrowUpTrayIcon /> Загрузить трек
            </button>
          )}
        </div>
      </header>

      <div className="library-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`library-tab${tab === t.key && !activePlaylist ? " active" : ""}`}
            onClick={() => {
              setActivePlaylist(null);
              setTab(t.key);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "all" && !activePlaylist && (
        <div className="library-filters">
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              className={`chip${genre === g ? " active" : ""}`}
              onClick={() => setGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {activePlaylist ? (
        <section className="library-playlist-detail">
          <div className="library-playlist-bar">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActivePlaylist(null)}>
              ← Назад
            </button>
            <div style={{ flex: 1 }}>
              <div className="gothic-label" style={{ fontSize: "1.1rem" }}>
                {activePlaylist.title}
              </div>
              <div className="tech-label">{activePlaylist.tracks?.length || 0} треков</div>
            </div>
            {activePlaylist.tracks && activePlaylist.tracks.length > 0 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => playTracks(activePlaylist.tracks!.map(trackToPlayer))}
              >
                <PlayIcon /> Играть
              </button>
            )}
          </div>
          {activePlaylist.tracks && activePlaylist.tracks.length > 0 ? (
            <div className="track-list">
              {activePlaylist.tracks.map((t) => (
                <div key={t.id} className="track-row">
                  <TrackCard track={t} onChange={load} />
                  <button
                    type="button"
                    className="pv-icon-btn danger"
                    title="Убрать из плейлиста"
                    onClick={() => removeFromPlaylist(activePlaylist.id, t.id)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="library-empty">В плейлисте пока пусто. Добавь треки кнопкой «+».</div>
          )}
        </section>
      ) : tab === "playlists" ? (
        <div className="playlist-grid">
          {playlists.length === 0 && !loading && (
            <div className="library-empty">Нет плейлистов. Создай первый!</div>
          )}
          {playlists.map((p) => (
            <div key={p.id} className="playlist-card">
              <button type="button" className="playlist-open" onClick={() => openPlaylist(p)}>
                <ListBulletIcon />
              </button>
              <div className="playlist-info">
                <div className="playlist-title">{p.title}</div>
                <div className="tech-label">{p.trackCount || 0} треков</div>
              </div>
              <button type="button" className="pv-icon-btn danger" onClick={() => removePlaylist(p)} title="Удалить">
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      ) : loading ? (
        <div className="library-empty">Загрузка…</div>
      ) : tracks.length === 0 ? (
        <div className="library-empty">
          {tab === "mine" ? "Ты ещё не загрузил ни один трек." : "Здесь пока пусто."}
        </div>
      ) : (
        <div className="track-list">
          {tracks.map((t) => (
            <TrackCard key={t.id} track={t} onChange={load} onAddToPlaylist={setPickerTrack} />
          ))}
        </div>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Загрузить трек">
        <div className="field">
          <label className="field-label">Аудиофайл</label>
          <button type="button" className="upload-drop" onClick={() => fileRef.current?.click()}>
            <ArrowUpTrayIcon />
            <span>{file ? file.name : "Выбери файл (mp3, wav, ogg…)"}</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
        </div>
        <div className="field">
          <label className="field-label">Название</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название трека" />
        </div>
        <div className="field-row">
          <div className="field">
            <label className="field-label">Жанр</label>
            <select className="input" value={upGenre} onChange={(e) => setUpGenre(e.target.value)}>
              {GENRES.filter((g) => g !== "Все").map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Доступ</label>
            <select className="input" value={visibility} onChange={(e) => setVisibility(e.target.value as TrackVisibility)}>
              <option value="PUBLIC">Публичный</option>
              <option value="UNLISTED">По ссылке</option>
              <option value="PRIVATE">Приватный</option>
            </select>
          </div>
        </div>
        {error && <div className="field-error">{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={() => setUploadOpen(false)}>Отмена</button>
          <button type="button" className="btn btn-primary" onClick={submitUpload} disabled={busy}>
            {busy ? "Загрузка…" : "Загрузить"}
          </button>
        </div>
      </Modal>

      <Modal open={playlistModal} onClose={() => setPlaylistModal(false)} title="Новый плейлист">
        <div className="field">
          <label className="field-label">Название</label>
          <input
            className="input"
            value={playlistTitle}
            onChange={(e) => setPlaylistTitle(e.target.value)}
            placeholder="Например, «Для рисования»"
            autoFocus
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={() => setPlaylistModal(false)}>Отмена</button>
          <button type="button" className="btn btn-primary" onClick={createPlaylist} disabled={busy}>
            Создать
          </button>
        </div>
      </Modal>

      <Modal open={!!pickerTrack} onClose={() => setPickerTrack(null)} title="Добавить в плейлист">
        {playlists.length === 0 ? (
          <div className="library-empty">Сначала создай плейлист во вкладке «Плейлисты».</div>
        ) : (
          <div className="track-list">
            {playlists.map((p) => (
              <button key={p.id} type="button" className="playlist-pick" onClick={() => addToPlaylist(p.id)}>
                <ListBulletIcon /> {p.title}
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

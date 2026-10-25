import { useCallback, useEffect, useState } from "react";
import type { ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon,
  SignalIcon,
  LockClosedIcon,
  GlobeAltIcon,
  UsersIcon,
  CheckIcon,
  MusicalNoteIcon,
  FilmIcon,
  ViewColumnsIcon,
  PencilIcon,
} from "@heroicons/react/24/solid";
import { api } from "../lib/api";
import { useLiveRoom } from "../lib/liveRoom";
import Modal from "../components/ui/Modal";
import Avatar from "../components/ui/Avatar";
import type { RoomMode, RoomSummary, Track } from "../types";

type Tab = "all" | "mine";

const MODES: Array<{ value: RoomMode; label: string; hint: string; icon: ComponentType<{ className?: string }> }> = [
  { value: "music", label: "Музыка", hint: "Слушаем и ставим треки вместе", icon: MusicalNoteIcon },
  { value: "watch", label: "YouTube", hint: "Смотрим видео синхронно", icon: FilmIcon },
  { value: "board", label: "Канбан", hint: "Общая доска задач и идей", icon: ViewColumnsIcon },
  { value: "draw", label: "Рисование", hint: "Общий холст", icon: PencilIcon },
];

const MODE_LABEL: Record<RoomMode, string> = {
  music: "Музыка",
  watch: "YouTube",
  board: "Канбан",
  draw: "Рисование",
};

export default function RoomsPage() {
  const navigate = useNavigate();
  const { joinRoom } = useLiveRoom();

  const [tab, setTab] = useState<Tab>("all");
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [mode, setMode] = useState<RoomMode>("music");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.get<RoomSummary[]>(tab === "mine" ? "/api/rooms/mine" : "/api/rooms");
      setRooms(Array.isArray(list) ? list : []);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const loadTracks = useCallback(async () => {
    try {
      const list = await api.get<Track[]>("/api/tracks/me");
      setTracks(Array.isArray(list) ? list : []);
    } catch {
      setTracks([]);
    }
  }, []);

  const openCreate = () => {
    setError("");
    setCreateOpen(true);
    loadTracks();
  };

  const toggleTrack = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const create = async () => {
    if (!name.trim()) {
      setError("Укажи название комнаты");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const room = await api.post<RoomSummary>("/api/rooms", {
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
        mode,
        trackIds: mode === "music" ? selected : [],
      });
      setCreateOpen(false);
      setName("");
      setDescription("");
      setIsPublic(true);
      setMode("music");
      setSelected([]);
      await joinRoom(room.id);
      navigate(`/rooms/${room.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать комнату");
    } finally {
      setBusy(false);
    }
  };

  const open = async (room: RoomSummary) => {
    try {
      await joinRoom(room.id);
      navigate(`/rooms/${room.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось войти");
    }
  };

  return (
    <div className="rooms-page">
      <header className="library-head rooms-head">
        <div>
          <div className="eyebrow">live · комнаты</div>
          <h1 style={{ margin: "0.3rem 0 0" }}>
            <SignalIcon className="library-h1-icon" /> Комнаты
          </h1>
        </div>
        <div className="library-head-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <PlusIcon /> Создать комнату
          </button>
        </div>
      </header>

      <div className="rooms-tabs">
        {(["all", "mine"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`chip${tab === t ? " active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "all" ? "Все комнаты" : "Мои комнаты"}
          </button>
        ))}
      </div>

      {error && !createOpen && <div className="field-error">{error}</div>}

      {loading ? (
        <div className="library-empty">Загрузка…</div>
      ) : rooms.length === 0 ? (
        <div className="library-empty">Пока нет комнат. Создай первую и позови друзей!</div>
      ) : (
        <div className="rooms-grid">
          {rooms.map((room) => (
            <button key={room.id} type="button" className="room-card" onClick={() => open(room)}>
              <div className="room-card-top">
                <span className="room-card-name">{room.name}</span>
                {room.isPublic ? (
                  <GlobeAltIcon className="room-card-lock" title="Публичная" />
                ) : (
                  <LockClosedIcon className="room-card-lock" title="Закрытая" />
                )}
              </div>
              <span className={`room-card-mode m-${room.mode || "music"}`}>
                {MODE_LABEL[room.mode || "music"]}
              </span>
              {room.description && <p className="room-card-desc">{room.description}</p>}
              <div className="room-card-foot">
                <span className="room-card-host">
                  <Avatar username={room.hostName || room.host?.username || "?"} url={room.hostAvatar || room.host?.avatarUrl || undefined} size="sm" />
                  @{room.hostName || room.host?.username || "неизвестный"}
                </span>
                <span className="room-card-members">
                  <UsersIcon /> {room.memberCount ?? 0}
                </span>
              </div>
              {room.isHost && <span className="room-card-badge">ты хост</span>}
            </button>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Новая комната"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setCreateOpen(false)} disabled={busy}>
              Отмена
            </button>
            <button type="button" className="btn btn-primary" onClick={create} disabled={busy}>
              {busy ? "Создание…" : "Создать и войти"}
            </button>
          </>
        }
      >
        <div className="form-col">
          <div className="field">
            <span>Режим комнаты</span>
            <div className="mode-picker">
              {MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.value}
                    type="button"
                    className={`mode-opt${mode === m.value ? " on" : ""}`}
                    onClick={() => setMode(m.value)}
                  >
                    <Icon />
                    <span className="mode-opt-label">{m.label}</span>
                    <span className="mode-opt-hint">{m.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <label className="field">
            <span>Название</span>
            <input
              className="input"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ночной дисторшн-сет"
            />
          </label>
          <label className="field">
            <span>Описание</span>
            <textarea
              className="input"
              value={description}
              maxLength={1000}
              rows={2}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Что слушаем?"
            />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            <span>Публичная комната (иначе — только по инвайту)</span>
          </label>

          {mode === "music" && (
            <div className="field">
              <span>Стартовая очередь ({selected.length})</span>
              {tracks.length === 0 ? (
                <p className="text-text-secondary">У тебя пока нет треков. Можно добавить позже.</p>
              ) : (
                <div className="room-track-picker">
                  {tracks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`room-track-opt${selected.includes(t.id) ? " on" : ""}`}
                      onClick={() => toggleTrack(t.id)}
                    >
                      <span className="room-track-opt-name">
                        {t.title}
                        {t.artist ? ` — ${t.artist}` : ""}
                      </span>
                      {selected.includes(t.id) && <CheckIcon />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <div className="field-error">{error}</div>}
        </div>
      </Modal>
    </div>
  );
}

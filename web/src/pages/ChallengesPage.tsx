import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrophyIcon,
  PlusIcon,
  FlagIcon,
  PencilIcon,
  MusicalNoteIcon,
  BookOpenIcon,
  SparklesIcon,
  CalendarDaysIcon,
  UsersIcon,
} from "@heroicons/react/24/solid";
import { api, getSocket } from "../lib/api";
import Modal from "../components/ui/Modal";
import Avatar from "../components/ui/Avatar";
import type { Challenge, ChallengeMode, ChallengeStatus } from "../types";

type Tab = "active" | "ended" | "all";

const MODE_META: Record<ChallengeMode, { label: string; icon: typeof TrophyIcon }> = {
  art: { label: "Арт", icon: PencilIcon },
  music: { label: "Музыка", icon: MusicalNoteIcon },
  writing: { label: "Текст", icon: BookOpenIcon },
  any: { label: "Любой", icon: SparklesIcon },
};

const STATUS_LABEL: Record<ChallengeStatus, string> = {
  active: "активен",
  upcoming: "скоро",
  ended: "завершён",
  draft: "черновик",
};

function daysLeft(endsAt?: string | null): number | null {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export default function ChallengesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("active");
  const [items, setItems] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState("vaporwave");
  const [mode, setMode] = useState<ChallengeMode>("any");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.get<Challenge[]>("/api/challenges");
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const socket = getSocket();
    const onChange = () => load();
    socket.on("challenge:changed", onChange);
    return () => {
      socket.off("challenge:changed", onChange);
    };
  }, [load]);

  const create = async () => {
    if (!title.trim()) {
      setError("Укажи название челленджа");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const ch = await api.post<Challenge>("/api/challenges", {
        title: title.trim(),
        description: description.trim() || undefined,
        theme: theme.trim() || undefined,
        mode,
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        status: "active",
      });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setEndsAt("");
      setMode("any");
      navigate(`/challenges/${ch.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать челлендж");
    } finally {
      setBusy(false);
    }
  };

  const shown = items.filter((c) => {
    if (tab === "active") return c.status === "active" || c.status === "upcoming";
    if (tab === "ended") return c.status === "ended";
    return true;
  });

  return (
    <div className="challenges-page">
      <header className="library-head">
        <div>
          <div className="eyebrow">арена · челленджи</div>
          <h1 style={{ margin: "0.3rem 0 0" }}>
            <TrophyIcon className="library-h1-icon" /> Челленджи
          </h1>
        </div>
        <div className="library-head-actions">
          <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <PlusIcon /> Создать челлендж
          </button>
        </div>
      </header>

      <div className="challenge-tabs">
        {(["active", "ended", "all"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`chip${tab === t ? " active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "active" ? "Активные" : t === "ended" ? "Завершённые" : "Все"}
          </button>
        ))}
      </div>

      {error && !createOpen && <div className="field-error">{error}</div>}

      {loading ? (
        <div className="library-empty">Загрузка…</div>
      ) : shown.length === 0 ? (
        <div className="library-empty">
          Здесь пока пусто. Запусти первый челлендж и позови творческих!
        </div>
      ) : (
        <div className="challenge-grid">
          {shown.map((c) => {
            const M = MODE_META[c.mode] || MODE_META.any;
            const dl = daysLeft(c.endsAt);
            return (
              <button
                key={c.id}
                type="button"
                className={`challenge-card status-${c.status}`}
                onClick={() => navigate(`/challenges/${c.id}`)}
              >
                <div className="challenge-card-top">
                  <span className={`challenge-status s-${c.status}`}>{STATUS_LABEL[c.status]}</span>
                  <span className="challenge-mode-badge">
                    <M.icon /> {M.label}
                  </span>
                </div>
                <span className="challenge-theme">#{c.theme}</span>
                <h3 className="challenge-card-title">{c.title}</h3>
                {c.description && <p className="challenge-card-desc">{c.description}</p>}
                <div className="challenge-card-foot">
                  <span className="challenge-card-host">
                    <Avatar
                      username={c.creatorName || c.creator?.username || "?"}
                      url={c.creatorAvatar || c.creator?.avatarUrl || undefined}
                      size="sm"
                    />
                    @{c.creatorName || c.creator?.username || "неизвестный"}
                  </span>
                  <span className="challenge-stat">
                    <UsersIcon /> {c.entriesCount}
                  </span>
                  {c.status !== "ended" && dl !== null && (
                    <span className="challenge-stat">
                      <CalendarDaysIcon /> {dl > 0 ? `${dl} дн.` : "финиш"}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Новый челлендж"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setCreateOpen(false)} disabled={busy}>
              Отмена
            </button>
            <button type="button" className="btn btn-primary" onClick={create} disabled={busy}>
              {busy ? "Создание…" : "Создать"}
            </button>
          </>
        }
      >
        <div className="form-col">
          <label className="field">
            <span>Название</span>
            <input
              className="input"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Неоновый город"
            />
          </label>
          <label className="field">
            <span>Описание</span>
            <textarea
              className="input"
              value={description}
              maxLength={4000}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Что нужно сделать участникам?"
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Тема</span>
              <input
                className="input"
                value={theme}
                maxLength={100}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="vaporwave"
              />
            </label>
            <label className="field">
              <span>Формат</span>
              <select className="input" value={mode} onChange={(e) => setMode(e.target.value as ChallengeMode)}>
                <option value="any">Любой</option>
                <option value="art">Арт</option>
                <option value="music">Музыка</option>
                <option value="writing">Текст</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>Крайний срок (необязательно)</span>
            <input
              className="input"
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </label>
          <p className="field-hint">
            <FlagIcon className="inline-icon" /> Работы участников оцениваются голосами. Голосовать за свою работу нельзя.
          </p>
          {error && <div className="field-error">{error}</div>}
        </div>
      </Modal>
    </div>
  );
}

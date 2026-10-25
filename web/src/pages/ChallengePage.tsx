import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  TrophyIcon,
  HandThumbUpIcon,
  PlusIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  FlagIcon,
  SparklesIcon,
  PencilIcon,
  MusicalNoteIcon,
  BookOpenIcon,
} from "@heroicons/react/24/solid";
import { api, API_URL, getSocket } from "../lib/api";
import { useConfirm } from "../components/ui/confirm";
import Modal from "../components/ui/Modal";
import Avatar from "../components/ui/Avatar";
import type { ChallengeDetail, ChallengeMode, Project } from "../types";

const MODE_META: Record<ChallengeMode, { label: string; icon: typeof TrophyIcon }> = {
  art: { label: "Арт", icon: PencilIcon },
  music: { label: "Музыка", icon: MusicalNoteIcon },
  writing: { label: "Текст", icon: BookOpenIcon },
  any: { label: "Любой", icon: SparklesIcon },
};

function img(url?: string | null) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const challengeId = Number(id);

  const [data, setData] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [submitOpen, setSubmitOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [busy, setBusy] = useState(false);
  const [votingId, setVotingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api.get<ChallengeDetail>(`/api/challenges/${challengeId}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const onChange = (p: { challengeId?: number }) => {
      if (!p || Number(p.challengeId) === challengeId) load();
    };
    socket.on("challenge:changed", onChange);
    return () => {
      socket.off("challenge:changed", onChange);
    };
  }, [challengeId, load]);

  const openSubmit = async () => {
    setSubmitOpen(true);
    try {
      const list = await api.get<Project[]>("/api/projects");
      setProjects(Array.isArray(list) ? list : []);
    } catch {
      setProjects([]);
    }
  };

  const submit = async () => {
    if (!title.trim()) {
      setError("Укажи название работы");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/challenges/${challengeId}/entries`, {
        title: title.trim(),
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        projectId: projectId ? Number(projectId) : undefined,
      });
      setSubmitOpen(false);
      setTitle("");
      setDescription("");
      setImageUrl("");
      setProjectId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось подать работу");
    } finally {
      setBusy(false);
    }
  };

  const vote = async (entryId: number) => {
    setVotingId(entryId);
    try {
      await api.post(`/api/challenges/${challengeId}/entries/${entryId}/vote`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось проголосовать");
    } finally {
      setVotingId(null);
    }
  };

  const removeEntry = async (entryId: number) => {
    const ok = await confirm({
      title: "Удалить работу?",
      message: "Работа и её голоса будут удалены.",
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!ok) return;
    await api.del(`/api/challenges/${challengeId}/entries/${entryId}`);
    load();
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
        <p className="text-text-secondary">Загрузка челленджа…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card empty-state">
        <h3>Челлендж не найден</h3>
        <p className="text-text-secondary" style={{ marginTop: 4 }}>{error}</p>
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => navigate("/challenges")}>
          <ArrowLeftIcon style={{ width: 15, height: 15 }} /> К челленджам
        </button>
      </div>
    );
  }

  const M = MODE_META[data.mode] || MODE_META.any;
  const ended = data.status === "ended";
  const cover = img(data.coverUrl);
  const myEntries = new Set(data.myEntryIds);

  return (
    <div className="challenge-detail">
      <button className="btn btn-ghost btn-sm workspace-back" onClick={() => navigate("/challenges")}>
        <ArrowLeftIcon style={{ width: 14, height: 14 }} /> Все челленджи
      </button>

      <div className="card challenge-hero">
        {cover && <div className="challenge-hero-cover" style={{ backgroundImage: `url(${cover})` }} />}
        <div className="challenge-hero-body">
          <div className="challenge-hero-meta">
            <span className={`challenge-status s-${data.status}`}>{data.status}</span>
            <span className="challenge-mode-badge">
              <M.icon /> {M.label}
            </span>
            <span className="challenge-theme">#{data.theme}</span>
            {data.endsAt && (
              <span className="challenge-stat">
                <CalendarDaysIcon /> до {new Date(data.endsAt).toLocaleDateString("ru-RU")}
              </span>
            )}
          </div>
          <h1 className="workspace-title">{data.title}</h1>
          {data.description && <p className="challenge-hero-desc">{data.description}</p>}
          <div className="challenge-hero-actions">
            <span className="challenge-card-host">
              <Avatar
                username={data.creatorName || data.creator?.username || "?"}
                url={data.creatorAvatar || data.creator?.avatarUrl || undefined}
                size="sm"
              />
              @{data.creatorName || data.creator?.username || "неизвестный"}
            </span>
            {!ended && (
              <button className="btn btn-primary btn-sm" onClick={openSubmit}>
                <PlusIcon style={{ width: 14, height: 14 }} /> Участвовать
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="badge badge-warning">{error}</div>}

      <div className="challenge-board">
        <h2 className="panel-title challenge-board-title">
          <TrophyIcon style={{ width: 20, height: 20, color: "var(--accent-primary)" }} /> Лидерборд
          <span className="challenge-count">{data.entries.length}</span>
        </h2>

        {data.entries.length === 0 ? (
          <div className="library-empty">Пока нет работ. Стань первым!</div>
        ) : (
          <div className="challenge-entries">
            {data.entries.map((e, i) => (
              <div key={e.id} className={`challenge-entry${i === 0 ? " top" : ""}`}>
                <div className="challenge-rank">{i + 1}</div>
                <div className="challenge-entry-thumb" style={e.imageUrl ? { backgroundImage: `url(${img(e.imageUrl)})` } : undefined}>
                  {!e.imageUrl && <FlagIcon />}
                </div>
                <div className="challenge-entry-body">
                  <div className="challenge-entry-title">{e.title}</div>
                  {e.description && <div className="challenge-entry-desc">{e.description}</div>}
                  <div className="challenge-entry-meta">
                    <Avatar
                      username={e.authorName || e.author?.username || "?"}
                      url={e.authorAvatar || e.author?.avatarUrl || undefined}
                      size="sm"
                    />
                    @{e.authorName || e.author?.username || "неизвестный"}
                    {e.project && (
                      <button
                        className="link-btn"
                        onClick={() => navigate(`/projects/${e.project!.id}`)}
                        title="Открыть проект"
                      >
                        <ArrowTopRightOnSquareIcon style={{ width: 12, height: 12 }} /> {e.project.title}
                      </button>
                    )}
                  </div>
                </div>
                <div className="challenge-entry-actions">
                  <button
                    type="button"
                    className={`vote-btn${e.hasVoted ? " voted" : ""}`}
                    disabled={ended || myEntries.has(e.id) || votingId === e.id}
                    onClick={() => vote(e.id)}
                    title={myEntries.has(e.id) ? "За свою работу голосовать нельзя" : "Голосовать"}
                  >
                    <HandThumbUpIcon /> {e.votesCount}
                  </button>
                  {myEntries.has(e.id) && (
                    <button
                      type="button"
                      className="pv-icon-btn danger"
                      title="Удалить работу"
                      onClick={() => removeEntry(e.id)}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Подать работу"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setSubmitOpen(false)} disabled={busy}>
              Отмена
            </button>
            <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
              {busy ? "Отправка…" : "Отправить"}
            </button>
          </>
        }
      >
        <div className="form-col">
          <label className="field">
            <span>Название работы</span>
            <input
              className="input"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Неоновая башня"
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
              placeholder="Расскажи о работе"
            />
          </label>
          <label className="field">
            <span>Ссылка на превью (необязательно)</span>
            <input
              className="input"
              value={imageUrl}
              maxLength={1000}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="/uploads/... или https://..."
            />
          </label>
          <label className="field">
            <span>Привязать проект (необязательно)</span>
            <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Без проекта</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          {error && <div className="field-error">{error}</div>}
        </div>
      </Modal>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrophyIcon, TrashIcon, EyeIcon } from "@heroicons/react/24/solid";
import { useConfirm } from "../../components/ui/confirm";
import { api } from "../../lib/api";
import type { Challenge, ChallengeStatus } from "../../types";

const STATUS_LABEL: Record<ChallengeStatus, string> = {
  draft: "Черновик",
  active: "Активен",
  upcoming: "Скоро",
  ended: "Завершён",
};

const STATUS_BADGE: Record<ChallengeStatus, string> = {
  draft: "badge-neutral",
  active: "badge-success",
  upcoming: "badge-warning",
  ended: "badge-neutral",
};

const MODE_LABEL: Record<string, string> = {
  art: "арт",
  music: "музыка",
  writing: "текст",
  any: "любой",
};

export default function AdminChallengesPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [items, setItems] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Challenge[]>("/api/challenges");
      setItems(Array.isArray(res) ? res : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (challenge: Challenge, status: "draft" | "active" | "ended") => {
    setBusy(challenge.id);
    try {
      await api.patch(`/api/challenges/${challenge.id}`, { status });
      await load();
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  };

  const remove = async (challenge: Challenge) => {
    const ok = await confirm({
      title: "Удалить челлендж",
      message: `Удалить «${challenge.title}» вместе со всеми работами и голосами?`,
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!ok) return;
    setBusy(challenge.id);
    try {
      await api.del(`/api/challenges/${challenge.id}`);
      await load();
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="admin-section">
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">admin // челленджи</span>
          <h2 className="page-title">
            <TrophyIcon style={{ width: 22, height: 22, verticalAlign: "-3px", marginRight: 8 }} />
            Челленджи
          </h2>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate("/challenges")}>Все челленджи</button>
      </div>

      {loading ? (
        <div className="card empty-state"><p>Загрузка…</p></div>
      ) : items.length === 0 ? (
        <div className="card empty-state"><TrophyIcon className="empty-state-icon" /><h3>Челленджей нет</h3></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Челлендж</th>
                <th>Режим</th>
                <th>Статус</th>
                <th>Работ</th>
                <th>Автор</th>
                <th style={{ textAlign: "right" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div className="text-text-tertiary" style={{ fontSize: "0.74rem" }}>{c.theme}</div>
                  </td>
                  <td><span className="badge badge-neutral">{MODE_LABEL[c.mode] || c.mode}</span></td>
                  <td>
                    <select
                      className="admin-select"
                      value={["draft", "active", "ended"].includes(c.status) ? c.status : "active"}
                      disabled={busy === c.id}
                      onChange={(e) => setStatus(c, e.target.value as "draft" | "active" | "ended")}
                    >
                      <option value="draft">Черновик</option>
                      <option value="active">Активен</option>
                      <option value="ended">Завершён</option>
                    </select>
                    <span className={`badge ${STATUS_BADGE[c.status]}`} style={{ marginLeft: 6 }}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td>{c.entriesCount}</td>
                  <td className="text-text-tertiary" style={{ fontSize: "0.78rem" }}>{c.creatorName || "—"}</td>
                  <td>
                    <div className="admin-cell-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/challenges/${c.id}`)}>
                        <EyeIcon style={{ width: 14, height: 14 }} />
                      </button>
                      <button className="btn btn-danger btn-sm" disabled={busy === c.id} onClick={() => remove(c)}>
                        <TrashIcon style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

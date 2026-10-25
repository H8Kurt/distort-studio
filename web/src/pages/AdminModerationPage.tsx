import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheckIcon,
  FlagIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/solid";
import Avatar from "../components/ui/Avatar";
import { useConfirm } from "../components/ui/confirm";
import { api } from "../lib/api";
import type { ModerationReport, ReportStatus, ReportsResponse } from "../types";

const STATUS_TABS: { value: ReportStatus | "all"; label: string }[] = [
  { value: "open", label: "Новые" },
  { value: "reviewing", label: "В работе" },
  { value: "resolved", label: "Решённые" },
  { value: "dismissed", label: "Отклонённые" },
  { value: "all", label: "Все" },
];

const STATUS_LABEL: Record<ReportStatus, string> = {
  open: "Новая",
  reviewing: "В работе",
  resolved: "Решена",
  dismissed: "Отклонена",
};

const REASON_LABEL: Record<string, string> = {
  spam: "Спам",
  harassment: "Травля",
  hate: "Язык вражды",
  nsfw: "18+",
  violence: "Насилие",
  copyright: "Авторские права",
  other: "Другое",
};

const TYPE_LABEL: Record<string, string> = {
  user: "Пользователь",
  post: "Пост",
  project: "Проект",
  comment: "Комментарий",
  message: "Сообщение",
  asset: "Ассет",
};

export default function AdminModerationPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [status, setStatus] = useState<ReportStatus | "all">("open");
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async (nextStatus: ReportStatus | "all") => {
    setLoading(true);
    try {
      const query = nextStatus === "all" ? "" : `?status=${nextStatus}`;
      const res = await api.get<ReportsResponse>(`/api/moderation/reports${query}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [status, load]);

  const setReportStatus = async (report: ModerationReport, next: ReportStatus) => {
    setBusy(report.id);
    try {
      await api.patch(`/api/moderation/reports/${report.id}`, { status: next });
      await load(status);
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  };

  const setUserStatus = async (userId: number, next: "active" | "suspended" | "banned") => {
    setBusy(userId);
    try {
      await api.post(`/api/moderation/admin/users/${userId}/status`, { status: next });
      await load(status);
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  };

  const banTarget = async (report: ModerationReport) => {
    const ok = await confirm({
      title: "Заблокировать пользователя",
      message: `Заблокировать пользователя #${report.targetId}? Он будет разлогинен и не сможет пользоваться сервисом.`,
      confirmLabel: "Заблокировать",
      danger: true,
    });
    if (!ok) return;
    await setUserStatus(report.targetId, "banned");
  };

  const targetLink = (report: ModerationReport): string | null => {
    if (report.targetType === "user") return `/u/${report.targetId}`;
    if (report.targetType === "project") return `/projects/${report.targetId}`;
    return null;
  };

  const reports = data?.reports ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">admin // модерация</span>
          <h2 className="page-title">
            <ShieldCheckIcon style={{ width: 22, height: 22, verticalAlign: "-3px", marginRight: 8 }} />
            Жалобы
          </h2>
        </div>
        {data && data.openCount > 0 && (
          <span className="badge badge-warning">{data.openCount} новых</span>
        )}
      </div>

      <div className="tabs">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            className={`tab${status === t.value ? " active" : ""}`}
            onClick={() => setStatus(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card empty-state"><p>Загрузка жалоб…</p></div>
      ) : reports.length === 0 ? (
        <div className="card empty-state">
          <FlagIcon className="empty-state-icon" />
          <h3>Жалоб нет</h3>
          <p className="text-text-secondary" style={{ marginTop: 4 }}>В этой категории пока пусто.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {reports.map((r) => (
            <div key={r.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className={`badge ${r.status === "open" ? "badge-warning" : r.status === "resolved" ? "badge-success" : "badge-neutral"}`}>
                  {STATUS_LABEL[r.status]}
                </span>
                <span className="badge badge-accent">{TYPE_LABEL[r.targetType] || r.targetType} #{r.targetId}</span>
                <span className="badge badge-danger">{REASON_LABEL[r.reason] || r.reason}</span>
                <span className="text-text-tertiary" style={{ fontSize: "0.78rem", marginLeft: "auto" }}>
                  {new Date(r.createdAt).toLocaleString("ru-RU")}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar username={r.reporter?.username || "?"} url={r.reporter?.avatarUrl || undefined} size="xs" />
                <span className="text-text-secondary" style={{ fontSize: "0.85rem" }}>
                  от @{r.reporter?.username || "unknown"}
                </span>
                {targetLink(r) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(targetLink(r)!)}>
                    <EyeIcon style={{ width: 14, height: 14 }} /> Открыть
                  </button>
                )}
              </div>

              {r.details && <p style={{ margin: 0, fontSize: "0.9rem" }}>{r.details}</p>}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {r.status !== "reviewing" && r.status === "open" && (
                  <button className="btn btn-secondary btn-sm" disabled={busy === r.id} onClick={() => setReportStatus(r, "reviewing")}>
                    Взять в работу
                  </button>
                )}
                {r.status !== "resolved" && (
                  <button className="btn btn-primary btn-sm" disabled={busy === r.id} onClick={() => setReportStatus(r, "resolved")}>
                    <CheckCircleIcon style={{ width: 14, height: 14 }} /> Решена
                  </button>
                )}
                {r.status !== "dismissed" && (
                  <button className="btn btn-ghost btn-sm" disabled={busy === r.id} onClick={() => setReportStatus(r, "dismissed")}>
                    <XCircleIcon style={{ width: 14, height: 14 }} /> Отклонить
                  </button>
                )}
                {r.targetType === "user" && (
                  <button className="btn btn-danger btn-sm" disabled={busy === r.targetId} onClick={() => banTarget(r)}>
                    <NoSymbolIcon style={{ width: 14, height: 14 }} /> Забанить автора
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

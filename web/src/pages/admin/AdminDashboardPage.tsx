import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChartBarIcon,
  UsersIcon,
  Squares2X2Icon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/solid";
import { api } from "../../lib/api";
import type { AdminStats } from "../../types";

function fmt(n: number | string | undefined | null): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("ru-RU");
}

function Bars({ data, label }: { data: { date: string; count: number | string }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => Number(d.count) || 0));
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="admin-chart-title">{label}</span>
      {data.length === 0 ? (
        <p className="text-text-tertiary" style={{ fontSize: "0.8rem", margin: 0 }}>Нет данных</p>
      ) : (
        <div className="admin-bars">
          {data.map((d) => (
            <div
              key={d.date}
              className="admin-bar"
              style={{ height: `${Math.max(2, ((Number(d.count) || 0) / max) * 100)}%` }}
              title={`${d.date}: ${d.count}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, accent, sub }: { value: string; label: string; accent?: boolean; sub?: string }) {
  return (
    <div className={`admin-stat${accent ? " accent" : ""}`}>
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-label">{label}</div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get<AdminStats>("/api/admin/stats")
      .then((data) => active && setStats(data))
      .catch(() => active && setStats(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <div className="card empty-state"><p>Загрузка статистики…</p></div>;
  if (!stats) return <div className="card empty-state"><p>Не удалось загрузить статистику.</p></div>;

  const { users, content, moderation, commerce } = stats;

  return (
    <div className="admin-section">
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">admin // обзор</span>
          <h2 className="page-title">
            <ChartBarIcon style={{ width: 22, height: 22, verticalAlign: "-3px", marginRight: 8 }} />
            Дашборд
          </h2>
        </div>
        {moderation.openReports > 0 && (
          <Link to="/admin/reports" className="badge badge-warning">
            {moderation.openReports} жалоб в работе
          </Link>
        )}
      </div>

      <div>
        <div className="admin-chart-title" style={{ marginBottom: 8 }}>
          <UsersIcon style={{ width: 13, height: 13, verticalAlign: "-2px", marginRight: 5 }} />
          Пользователи
        </div>
        <div className="admin-stat-grid">
          <Stat value={fmt(users.total)} label="всего" accent sub={`${fmt(users.active)} активных`} />
          <Stat value={fmt(users.newToday)} label="новых сегодня" sub={`+${fmt(users.new7)} за неделю`} />
          <Stat value={fmt(users.new30)} label="за 30 дней" />
          <Stat value={fmt(users.suspended)} label="приостановлено" />
          <Stat value={fmt(users.banned)} label="забанено" />
        </div>
      </div>

      <div>
        <div className="admin-chart-title" style={{ marginBottom: 8 }}>
          <Squares2X2Icon style={{ width: 13, height: 13, verticalAlign: "-2px", marginRight: 5 }} />
          Контент
        </div>
        <div className="admin-stat-grid">
          <Stat value={fmt(content.projects)} label="проектов" />
          <Stat value={fmt(content.posts)} label="постов" />
          <Stat value={fmt(content.comments)} label="комментариев" />
          <Stat value={fmt(content.tracks)} label="треков" />
          <Stat value={fmt(content.assets)} label="ассетов" />
          <Stat value={fmt(content.playlists)} label="плейлистов" />
          <Stat value={fmt(content.rooms)} label="комнат" />
          <Stat value={fmt(content.challenges)} label="челленджей" />
        </div>
      </div>

      <div>
        <div className="admin-chart-title" style={{ marginBottom: 8 }}>
          <CurrencyDollarIcon style={{ width: 13, height: 13, verticalAlign: "-2px", marginRight: 5 }} />
          Модерация и продажи
        </div>
        <div className="admin-stat-grid">
          <Stat value={fmt(moderation.openReports)} label="жалоб в работе" accent={moderation.openReports > 0} />
          <Stat value={fmt(commerce.paidOrders)} label="оплаченных заказов" sub={`из ${fmt(commerce.orders)}`} />
          <Stat value={`${fmt(commerce.revenue)} ₽`} label="выручка" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Bars data={stats.signupsSeries} label="Регистрации за 30 дней" />
        <Bars data={stats.postsSeries} label="Посты за 30 дней" />
      </div>
    </div>
  );
}

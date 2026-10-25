import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UsersIcon,
  ShieldCheckIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  PauseCircleIcon,
} from "@heroicons/react/24/solid";
import Avatar from "../../components/ui/Avatar";
import { useConfirm } from "../../components/ui/confirm";
import { api } from "../../lib/api";
import type { AdminUser, AdminUsersResponse, UserStatus } from "../../types";

const STATUS_LABEL: Record<UserStatus, string> = {
  active: "Активен",
  suspended: "Приостановлен",
  banned: "Забанен",
};

const STATUS_BADGE: Record<UserStatus, string> = {
  active: "badge-success",
  suspended: "badge-warning",
  banned: "badge-danger",
};

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (role) params.set("role", role);
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("limit", "25");
      const res = await api.get<AdminUsersResponse>(`/api/admin/users?${params.toString()}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [q, role, status, page]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const patch = async (user: AdminUser, body: Record<string, unknown>) => {
    setBusy(user.id);
    try {
      await api.patch(`/api/admin/users/${user.id}`, body);
      await load();
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  };

  const changeStatus = async (user: AdminUser, next: UserStatus) => {
    if (next !== "active") {
      const ok = await confirm({
        title: next === "banned" ? "Забанить пользователя" : "Приостановить пользователя",
        message:
          next === "banned"
            ? `@${user.username} будет разлогинен и не сможет пользоваться сервисом.`
            : `@${user.username} временно потеряет доступ.`,
        confirmLabel: next === "banned" ? "Забанить" : "Приостановить",
        danger: true,
      });
      if (!ok) return;
    }
    await patch(user, { status: next });
  };

  const toggleRole = async (user: AdminUser) => {
    const next = user.role === "admin" ? "user" : "admin";
    const ok = await confirm({
      title: next === "admin" ? "Выдать права админа" : "Снять права админа",
      message: `Изменить роль @${user.username} на «${next}»?`,
      confirmLabel: "Изменить",
      danger: next === "user",
    });
    if (!ok) return;
    await patch(user, { role: next });
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="admin-section">
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">admin // пользователи</span>
          <h2 className="page-title">
            <UsersIcon style={{ width: 22, height: 22, verticalAlign: "-3px", marginRight: 8 }} />
            Пользователи
          </h2>
        </div>
        {data && <span className="badge badge-neutral">{data.total}</span>}
      </div>

      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Поиск по имени или почте…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select className="admin-select" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">Все роли</option>
          <option value="user">Пользователи</option>
          <option value="admin">Админы</option>
        </select>
        <select className="admin-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Все статусы</option>
          <option value="active">Активные</option>
          <option value="suspended">Приостановленные</option>
          <option value="banned">Забаненные</option>
        </select>
      </div>

      {loading ? (
        <div className="card empty-state"><p>Загрузка…</p></div>
      ) : !data || data.users.length === 0 ? (
        <div className="card empty-state"><UsersIcon className="empty-state-icon" /><h3>Никого не найдено</h3></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Регистрация</th>
                <th style={{ textAlign: "right" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="admin-cell-user">
                      <Avatar username={u.username} url={u.avatarUrl || undefined} size="xs" />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>
                          {u.username}
                          {u.isOfficial && <span className="badge badge-accent" style={{ marginLeft: 6 }}>official</span>}
                        </div>
                        <div className="text-text-tertiary" style={{ fontSize: "0.75rem" }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${u.role === "admin" ? "badge-accent" : "badge-neutral"}`}>{u.role}</span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[u.status] || "badge-neutral"}`}>
                      {STATUS_LABEL[u.status] || u.status}
                    </span>
                  </td>
                  <td className="text-text-tertiary" style={{ fontSize: "0.78rem" }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("ru-RU") : "—"}
                  </td>
                  <td>
                    <div className="admin-cell-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/u/${u.id}`)}>Открыть</button>
                      {!u.isOfficial && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={busy === u.id}
                            onClick={() => toggleRole(u)}
                            title="Изменить роль"
                          >
                            <ShieldCheckIcon style={{ width: 14, height: 14 }} />
                          </button>
                          {u.status === "active" ? (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                disabled={busy === u.id}
                                onClick={() => changeStatus(u, "suspended")}
                                title="Приостановить"
                              >
                                <PauseCircleIcon style={{ width: 14, height: 14 }} />
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                disabled={busy === u.id}
                                onClick={() => changeStatus(u, "banned")}
                                title="Забанить"
                              >
                                <NoSymbolIcon style={{ width: 14, height: 14 }} />
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={busy === u.id}
                              onClick={() => changeStatus(u, "active")}
                              title="Разблокировать"
                            >
                              <CheckCircleIcon style={{ width: 14, height: 14 }} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && totalPages > 1 && (
        <div className="admin-pager">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Назад
          </button>
          <span>{page} / {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
}

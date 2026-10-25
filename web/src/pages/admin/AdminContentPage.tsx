import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Squares2X2Icon, TrashIcon, EyeIcon } from "@heroicons/react/24/solid";
import Avatar from "../../components/ui/Avatar";
import { useConfirm } from "../../components/ui/confirm";
import { api } from "../../lib/api";
import type { AdminContentItem, AdminContentResponse, AdminContentType } from "../../types";

const TYPES: { value: AdminContentType; label: string }[] = [
  { value: "post", label: "Посты" },
  { value: "project", label: "Проекты" },
  { value: "comment", label: "Комментарии" },
  { value: "asset", label: "Ассеты" },
  { value: "track", label: "Треки" },
  { value: "playlist", label: "Плейлисты" },
];

function linkFor(type: AdminContentType, id: number): string | null {
  if (type === "project") return `/projects/${id}`;
  if (type === "post") return null;
  return null;
}

export default function AdminContentPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [type, setType] = useState<AdminContentType>("post");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type, page: String(page), limit: "25" });
      if (q.trim()) params.set("q", q.trim());
      const res = await api.get<AdminContentResponse>(`/api/admin/content?${params.toString()}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [type, q, page]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const remove = async (item: AdminContentItem) => {
    const ok = await confirm({
      title: "Удалить безвозвратно",
      message: `Удалить «${item.title}» (${type} #${item.id})? Действие необратимо.`,
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!ok) return;
    setBusy(item.id);
    try {
      await api.del(`/api/admin/content/${type}/${item.id}`);
      await load();
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="admin-section">
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">admin // контент</span>
          <h2 className="page-title">
            <Squares2X2Icon style={{ width: 22, height: 22, verticalAlign: "-3px", marginRight: 8 }} />
            Контент
          </h2>
        </div>
        {data && <span className="badge badge-neutral">{data.total}</span>}
      </div>

      <div className="tabs">
        {TYPES.map((t) => (
          <button
            key={t.value}
            className={`tab${type === t.value ? " active" : ""}`}
            onClick={() => {
              setType(t.value);
              setPage(1);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Поиск…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {loading ? (
        <div className="card empty-state"><p>Загрузка…</p></div>
      ) : !data || data.items.length === 0 ? (
        <div className="card empty-state"><h3>Ничего не найдено</h3></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Содержимое</th>
                <th>Автор</th>
                <th>Дата</th>
                <th style={{ textAlign: "right" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const link = linkFor(type, item.id);
                return (
                  <tr key={item.id}>
                    <td className="text-text-tertiary">{item.id}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        {item.thumbUrl && (
                          <img
                            src={item.thumbUrl}
                            alt=""
                            style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 6, flex: "0 0 auto" }}
                          />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 420 }}>
                            {item.title || "(без текста)"}
                            {item.pin && <span className="badge badge-accent" style={{ marginLeft: 6 }}>pinned</span>}
                          </div>
                          {item.subtitle && (
                            <div className="text-text-tertiary" style={{ fontSize: "0.74rem" }}>{item.subtitle}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {item.author ? (
                        <div className="admin-cell-user">
                          <Avatar username={item.author.username} url={item.author.avatarUrl || undefined} size="xs" />
                          <span style={{ fontSize: "0.8rem" }}>{item.author.username}</span>
                        </div>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="text-text-tertiary" style={{ fontSize: "0.78rem" }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString("ru-RU") : "—"}
                    </td>
                    <td>
                      <div className="admin-cell-actions">
                        {link && (
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(link)}>
                            <EyeIcon style={{ width: 14, height: 14 }} />
                          </button>
                        )}
                        <button className="btn btn-danger btn-sm" disabled={busy === item.id} onClick={() => remove(item)}>
                          <TrashIcon style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && totalPages > 1 && (
        <div className="admin-pager">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Назад</button>
          <span>{page} / {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Вперёд</button>
        </div>
      )}
    </div>
  );
}

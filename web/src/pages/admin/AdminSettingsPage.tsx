import { useCallback, useEffect, useState } from "react";
import { Cog6ToothIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { api } from "../../lib/api";
import type {
  AdminContentResponse,
  AnnouncementSetting,
  SiteSettings,
} from "../../types";

export default function AdminSettingsPage() {
  const [maintenance, setMaintenance] = useState(false);
  const [signupsOpen, setSignupsOpen] = useState(true);
  const [announcement, setAnnouncement] = useState<AnnouncementSetting>({
    enabled: false,
    text: "",
    level: "info",
    link: "",
  });
  const [featuredIds, setFeaturedIds] = useState<number[]>([]);
  const [titles, setTitles] = useState<Record<number, string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [projQuery, setProjQuery] = useState("");
  const [projResults, setProjResults] = useState<{ id: number; title: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [full, pub] = await Promise.all([
        api.get<SiteSettings>("/api/admin/settings"),
        api.get<SiteSettings>("/api/settings/public").catch(() => null),
      ]);
      setMaintenance(Boolean(full.maintenance?.enabled));
      setSignupsOpen(full.signupsOpen !== false);
      setAnnouncement({
        enabled: Boolean(full.announcement?.enabled),
        text: full.announcement?.text || "",
        level: full.announcement?.level || "info",
        link: full.announcement?.link || "",
      });
      setFeaturedIds(Array.isArray(full.featured?.projectIds) ? full.featured.projectIds : []);
      if (pub?.featuredProjects) {
        const map: Record<number, string> = {};
        for (const p of pub.featuredProjects) map[p.id] = p.title;
        setTitles(map);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!projQuery.trim()) {
      setProjResults([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .get<AdminContentResponse>(`/api/admin/content?type=project&limit=8&q=${encodeURIComponent(projQuery.trim())}`)
        .then((res) => setProjResults(res.items.map((i) => ({ id: i.id, title: i.title }))))
        .catch(() => setProjResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [projQuery]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/api/admin/settings", {
        maintenance: { enabled: maintenance },
        signupsOpen,
        announcement: { ...announcement, enabled: announcement.enabled && Boolean(announcement.text.trim()) },
        featured: { projectIds: featuredIds },
      });
      setSavedAt(Date.now());
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const addFeatured = (id: number, title: string) => {
    setFeaturedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setTitles((prev) => ({ ...prev, [id]: title }));
    setProjQuery("");
    setProjResults([]);
  };

  const removeFeatured = (id: number) => {
    setFeaturedIds((prev) => prev.filter((x) => x !== id));
  };

  if (loading) return <div className="card empty-state"><p>Загрузка настроек…</p></div>;

  return (
    <div className="admin-section">
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">admin // настройки</span>
          <h2 className="page-title">
            <Cog6ToothIcon style={{ width: 22, height: 22, verticalAlign: "-3px", marginRight: 8 }} />
            Настройки сайта
          </h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {savedAt && <span className="badge badge-success">Сохранено</span>}
          <button className="btn btn-primary btn-sm" disabled={saving} onClick={save}>
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column" }}>
        <div className="admin-switch-row">
          <div className="admin-switch-text">
            <strong>Режим техобслуживания</strong>
            <span>Обычные пользователи видят заглушку, админы заходят как обычно.</span>
          </div>
          <input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} />
        </div>
        <div className="admin-switch-row">
          <div className="admin-switch-text">
            <strong>Открыта регистрация</strong>
            <span>Если выключено — новые пользователи не смогут зарегистрироваться.</span>
          </div>
          <input type="checkbox" checked={signupsOpen} onChange={(e) => setSignupsOpen(e.target.checked)} />
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="admin-switch-row" style={{ borderBottom: "none", paddingBottom: 0 }}>
          <div className="admin-switch-text">
            <strong>Баннер-объявление</strong>
            <span>Плавающая плашка для всех пользователей сверху страницы.</span>
          </div>
          <input type="checkbox" checked={announcement.enabled} onChange={(e) => setAnnouncement((a) => ({ ...a, enabled: e.target.checked }))} />
        </div>
        <textarea
          className="admin-search"
          style={{ minHeight: 70, resize: "vertical", fontFamily: "var(--font-body)" }}
          placeholder="Текст объявления…"
          value={announcement.text}
          onChange={(e) => setAnnouncement((a) => ({ ...a, text: e.target.value }))}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select
            className="admin-select"
            value={announcement.level}
            onChange={(e) => setAnnouncement((a) => ({ ...a, level: e.target.value as AnnouncementSetting["level"] }))}
          >
            <option value="info">Инфо</option>
            <option value="warning">Внимание</option>
            <option value="success">Успех</option>
          </select>
          <input
            className="admin-search"
            style={{ flex: 1, minWidth: 200 }}
            placeholder="Ссылка (необязательно)"
            value={announcement.link || ""}
            onChange={(e) => setAnnouncement((a) => ({ ...a, link: e.target.value }))}
          />
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="admin-switch-text">
          <strong>Избранное / витрина</strong>
          <span>Проекты, которые показываются в разделе «Обзор».</span>
        </div>

        {featuredIds.length > 0 && (
          <div className="admin-chip-list">
            {featuredIds.map((id) => (
              <span key={id} className="admin-chip">
                {titles[id] || `#${id}`}
                <button type="button" onClick={() => removeFeatured(id)} title="Убрать">
                  <XMarkIcon style={{ width: 13, height: 13, verticalAlign: "-2px" }} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div style={{ position: "relative" }}>
          <MagnifyingGlassIcon
            style={{ width: 15, height: 15, position: "absolute", left: 11, top: 10, color: "var(--text-tertiary)" }}
          />
          <input
            className="admin-search"
            style={{ paddingLeft: 32, width: "100%" }}
            placeholder="Найти проект по названию…"
            value={projQuery}
            onChange={(e) => setProjQuery(e.target.value)}
          />
          {projResults.length > 0 && (
            <div className="card" style={{ marginTop: 6, padding: 6, display: "flex", flexDirection: "column", gap: 2 }}>
              {projResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ justifyContent: "flex-start" }}
                  onClick={() => addFeatured(p.id, p.title)}
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

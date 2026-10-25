import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FireIcon,
  SparklesIcon,
  RocketLaunchIcon,
  UserGroupIcon,
  HashtagIcon,
  ArrowTrendingUpIcon,
  StarIcon,
} from "@heroicons/react/24/solid";
import FramedAvatar from "../components/ui/FramedAvatar";
import ProjectList from "../components/ui/ProjectList";
import { api } from "../lib/api";
import type { FeaturedProject, Project, SiteSettings } from "../types";

interface Creator {
  id: number;
  username: string;
  avatarUrl?: string | null;
  frameId?: string | null;
  bio?: string | null;
  followersCount?: number;
}

interface DiscoverData {
  topProjects: Project[];
  newProjects: Project[];
  trendingTags: { tag: string; count: number }[];
  creators: Creator[];
}

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DiscoverData | null>(null);
  const [featured, setFeatured] = useState<FeaturedProject[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [res, settings] = await Promise.all([
        api.get<DiscoverData>("/api/discover"),
        api.get<SiteSettings>("/api/settings/public").catch(() => null),
      ]);
      setData(res);
      setFeatured(settings?.featuredProjects ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить обзор");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <div className="page-header">
        <div className="page-heading">
          <span className="page-eyebrow">discover // витрина сцены</span>
          <h2 className="page-title">
            <SparklesIcon style={{ width: 22, height: 22, verticalAlign: "-3px" }} /> Обзор
          </h2>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!data ? (
        <div className="card empty-state"><p className="text-text-secondary">Загрузка…</p></div>
      ) : (
        <>
          {data.trendingTags.length > 0 && (
            <div className="card">
              <h3 className="panel-title" style={{ marginBottom: 12 }}>
                <FireIcon style={{ width: 16, height: 16, verticalAlign: "-3px" }} /> В тренде
              </h3>
              <div className="tag-cloud">
                {data.trendingTags.map((t) => (
                  <span key={t.tag} className="tag-chip">
                    <HashtagIcon style={{ width: 12, height: 12 }} />
                    {t.tag}
                    <span className="tag-count">{t.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {featured.length > 0 && (
            <section>
              <div className="panel-head">
                <h3 className="panel-title">
                  <StarIcon style={{ width: 16, height: 16, verticalAlign: "-3px" }} /> Выбор редакции
                </h3>
              </div>
              <ProjectList
                projects={featured.map((f) => ({
                  id: f.id,
                  title: f.title,
                  coverUrl: f.coverUrl,
                  UserId: f.owner?.id ?? 0,
                  owner: f.owner ?? undefined,
                }))}
                onSelect={(id) => navigate(`/projects/${id}`)}
              />
            </section>
          )}

          <section>
            <div className="panel-head">
              <h3 className="panel-title">
                <ArrowTrendingUpIcon style={{ width: 16, height: 16, verticalAlign: "-3px" }} /> Популярное
              </h3>
            </div>
            {data.topProjects.length === 0 ? (
              <div className="card empty-state"><p className="text-text-secondary">Пока нет публичных проектов.</p></div>
            ) : (
              <ProjectList projects={data.topProjects} onSelect={(id) => navigate(`/projects/${id}`)} />
            )}
          </section>

          <div>
            <div className="panel-head">
              <h3 className="panel-title">
                <RocketLaunchIcon style={{ width: 16, height: 16, verticalAlign: "-3px" }} /> Новое
              </h3>
            </div>
            {data.newProjects.length === 0 ? (
              <div className="card empty-state"><p className="text-text-secondary">Пока нет публичных проектов.</p></div>
            ) : (
              <ProjectList projects={data.newProjects} onSelect={(pid) => navigate(`/projects/${pid}`)} />
            )}
          </div>

          <div>
            <div className="panel-head">
              <h3 className="panel-title">
                <UserGroupIcon style={{ width: 16, height: 16, verticalAlign: "-3px" }} /> Творцы
              </h3>
            </div>
            <div className="creator-grid">
              {data.creators.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="creator-card"
                  onClick={() => navigate(`/u/${c.id}`)}
                >
                  <FramedAvatar username={c.username} url={c.avatarUrl || undefined} frameId={c.frameId} size="lg" />
                  <div className="creator-info">
                    <strong>{c.username}</strong>
                    <span className="text-text-secondary">
                      <ArrowTrendingUpIcon style={{ width: 12, height: 12 }} /> {c.followersCount ?? 0} подписчиков
                    </span>
                    {c.bio && <span className="creator-bio">{c.bio}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

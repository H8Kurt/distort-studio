import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FireIcon, HashtagIcon, SparklesIcon, ArrowRightIcon } from "@heroicons/react/24/solid";
import { resolve } from "../../lib/feed";
import type { FeedItem } from "../../types";

interface FeedRailProps {
  items: FeedItem[];
}

export default function FeedRail({ items }: FeedRailProps) {
  const navigate = useNavigate();

  const popular = useMemo(() => {
    return items
      .filter((it) => it.type === "project" && it.project)
      .map((it) => it.project!)
      .sort((a, b) => (b.likesCount ?? 0) - (a.likesCount ?? 0))
      .slice(0, 4);
  }, [items]);

  const tags = useMemo(() => {
    const set = new Map<string, number>();
    items.forEach((it) => {
      if (it.type === "project" && it.project?.tags) {
        it.project.tags.forEach((t) => set.set(t, (set.get(t) ?? 0) + 1));
      }
    });
    return [...set.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag]) => tag);
  }, [items]);

  return (
    <aside className="page-rail">
      <div className="card rail-card">
        <div className="rail-title">
          <span>
            <SparklesIcon style={{ width: 16, height: 16, color: "var(--accent-primary)", verticalAlign: "-2px" }} />{" "}
            Добро пожаловать
          </span>
        </div>
        <p className="text-text-secondary" style={{ fontSize: "0.85rem" }}>
          Делитесь работами, находите авторов и собирайте свою ленту.
        </p>
        <button className="btn btn-primary btn-sm" style={{ width: "100%", marginTop: "0.75rem" }} onClick={() => navigate("/projects")}>
          Создать проект <ArrowRightIcon style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {popular.length > 0 && (
        <div className="card rail-card">
          <div className="rail-title">
            <span>
              <FireIcon style={{ width: 16, height: 16, color: "var(--accent-primary)", verticalAlign: "-2px" }} /> Популярное
            </span>
          </div>
          <div className="rail-list">
            {popular.map((p) => {
              const cover = resolve(p.coverUrl);
              return (
                <button key={p.id} className="rail-project" onClick={() => navigate(`/projects/${p.id}`)}>
                  <span className="rail-project-thumb">
                    {cover ? <img src={cover} alt={p.title} /> : <FireIcon style={{ width: 16, height: 16 }} />}
                  </span>
                  <span className="rail-project-info">
                    <span className="rail-project-title">{p.title}</span>
                    <span className="rail-project-sub">
                      @{p.owner?.username || "автор"} · {p.likesCount ?? 0} лайков
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tags.length > 0 && (
        <div className="card rail-card">
          <div className="rail-title">
            <span>
              <HashtagIcon style={{ width: 16, height: 16, color: "var(--accent-primary)", verticalAlign: "-2px" }} /> Теги
            </span>
          </div>
          <div className="feed-tags">
            {tags.map((t) => (
              <span key={t} className="badge badge-neutral">
                #{t}
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

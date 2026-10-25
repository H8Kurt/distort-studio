import { useNavigate } from "react-router-dom";
import {
  MusicalNoteIcon,
  FireIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";
import Avatar from "../ui/Avatar";
import { resolve, timeAgo, type FeedMode } from "../../lib/feed";
import type { Project } from "../../types";

interface ProjectFeedCardProps {
  project: Project;
  createdAt: string;
  mode: FeedMode;
  onToggleLike: (project: Project) => void;
}

export default function ProjectFeedCard({ project, createdAt, mode, onToggleLike }: ProjectFeedCardProps) {
  const navigate = useNavigate();
  const cover = resolve(project.coverUrl);
  const ownerId = project.owner?.id ?? project.UserId;
  const grid = mode === "grid";

  if (grid) {
    return (
      <article className="card card-hover feed-card project-card-grid animate-fade-in">
        <button className="feed-thumb" onClick={() => navigate(`/projects/${project.id}`)}>
          {cover ? <img src={cover} alt={project.title} /> : <MusicalNoteIcon />}
        </button>
        <div className="grid-card-body">
          <h3 className="feed-title">{project.title}</h3>
          <div className="grid-card-foot">
            <span className="feed-meta">
              <HeartIcon style={{ width: 13, height: 13 }} /> {project.likesCount ?? 0}
            </span>
            <span className="feed-meta">
              <PhotoIcon style={{ width: 13, height: 13 }} /> {project.mediaCount ?? 0}
            </span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="card card-hover feed-card animate-fade-in">
      <header className="feed-head">
        <button className="feed-owner-btn" onClick={() => navigate(`/u/${ownerId}`)} title="Профиль автора">
          <Avatar username={project.owner?.username || "?"} url={project.owner?.avatarUrl || undefined} size="sm" />
        </button>
        <div style={{ minWidth: 0 }}>
          <button className="feed-owner" onClick={() => navigate(`/u/${ownerId}`)}>
            @{project.owner?.username || "unknown"}
          </button>
          <div className="feed-date">
            опубликовал проект{createdAt ? ` · ${timeAgo(createdAt)}` : ""}
          </div>
        </div>
        <span className="badge badge-primary" style={{ marginLeft: "auto" }}>
          <FireIcon style={{ width: 12, height: 12 }} /> Проект
        </span>
      </header>

      <button className="feed-thumb" onClick={() => navigate(`/projects/${project.id}`)}>
        {cover ? <img src={cover} alt={project.title} /> : <MusicalNoteIcon />}
      </button>

      <div>
        <h3 className="feed-title">{project.title}</h3>
        <p className="text-text-secondary line-clamp-2 feed-desc">{project.description || "Без описания"}</p>
        {project.tags && project.tags.length > 0 && (
          <div className="feed-tags">
            {project.tags.slice(0, 4).map((t) => (
              <span key={t} className="badge badge-neutral">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="feed-foot">
        <button className={`like-btn${project.isLiked ? " liked" : ""}`} onClick={() => onToggleLike(project)}>
          <HeartIcon style={{ width: 15, height: 15 }} /> {project.likesCount ?? 0}
        </button>
        <span className="feed-meta">
          <ChatBubbleLeftIcon style={{ width: 13, height: 13 }} /> {project.commentCount ?? 0}
        </span>
        <span className="feed-meta">
          <PhotoIcon style={{ width: 13, height: 13 }} /> {project.mediaCount ?? 0}
        </span>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => navigate(`/projects/${project.id}`)}>
          Открыть
        </button>
      </div>
    </article>
  );
}

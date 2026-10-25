import React from "react";
import { MusicalNoteIcon, PhotoIcon, LockClosedIcon, GlobeAltIcon } from "@heroicons/react/24/solid";
import { API_URL } from "../../lib/api";
import type { Project } from "../../types";

interface ProjectCardProps {
  project: Project;
  active?: boolean;
  onSelect: (id: number) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, active, onSelect }) => {
  const isPublic = project.visibility === "PUBLIC";
  const cover =
    project.coverUrl &&
    (project.coverUrl.startsWith("http") ? project.coverUrl : `${API_URL}${project.coverUrl}`);

  return (
    <button
      type="button"
      onClick={() => onSelect(project.id)}
      className="card card-hover"
      style={{
        textAlign: "left",
        cursor: "pointer",
        borderColor: active ? "var(--accent-primary)" : undefined,
        boxShadow: active ? "0 0 0 3px var(--accent-glow)" : undefined,
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div
        className="proj-thumb"
        style={{
          height: 120,
          borderRadius: 10,
          background: "var(--accent-gradient)",
          opacity: 0.92,
          overflow: "hidden",
        }}
      >
        {cover ? (
          <img src={cover} alt={project.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <MusicalNoteIcon style={{ width: 40, height: 40 }} />
        )}
      </div>

      <div>
        <div style={{ fontWeight: 700, fontSize: "1rem" }} className="line-clamp-1">
          {project.title}
        </div>
        <div
          className="text-text-secondary line-clamp-2"
          style={{ fontSize: "0.85rem", marginTop: 2, minHeight: "2.4em" }}
        >
          {project.description || "Без описания"}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span className="badge badge-neutral">
          <PhotoIcon style={{ width: 12, height: 12 }} />
          {project.mediaCount ?? 0}
        </span>
        <span className={`badge ${isPublic ? "badge-success" : "badge-warning"}`}>
          {isPublic ? (
            <GlobeAltIcon style={{ width: 12, height: 12 }} />
          ) : (
            <LockClosedIcon style={{ width: 12, height: 12 }} />
          )}
          {isPublic ? "Публичный" : "Приватный"}
        </span>
        {project.owner && (
          <span className="text-text-tertiary" style={{ fontSize: "0.75rem", marginLeft: "auto" }}>
            @{project.owner.username}
          </span>
        )}
      </div>
    </button>
  );
};

export default ProjectCard;

import { FolderIcon, CodeBracketSquareIcon, UserGroupIcon, TagIcon } from "@heroicons/react/24/solid";
import Avatar from "../../../components/ui/Avatar";
import type { WorkspaceProject } from "../../../types";

interface OverviewTabProps {
  project: WorkspaceProject;
}

export default function OverviewTab({ project }: OverviewTabProps) {
  const stats = [
    { label: "Файлов", value: project.mediaCount ?? 0, icon: FolderIcon },
    { label: "Версий", value: project.versionCount ?? 0, icon: CodeBracketSquareIcon },
    { label: "Участников", value: (project.collabs?.length ?? 0) + 1, icon: UserGroupIcon },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="card stat-card">
            <s.icon style={{ width: 22, height: 22, color: "var(--accent-primary)" }} />
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <h3 className="panel-title">О проекте</h3>
        <p className="text-text-secondary" style={{ fontSize: "0.92rem", lineHeight: 1.6 }}>
          {project.description || "Описание пока не добавлено. Откройте «Настройки», чтобы рассказать о проекте."}
        </p>
        {project.tags && project.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <TagIcon style={{ width: 14, height: 14, color: "var(--text-tertiary)" }} />
            {project.tags.map((t) => (
              <span key={t} className="chip">#{t}</span>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <h3 className="panel-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <UserGroupIcon style={{ width: 18, height: 18, color: "var(--accent-primary)" }} /> Команда
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {project.owner && (
            <div className="team-row">
              <Avatar username={project.owner.username} url={project.owner.avatarUrl || undefined} size="md" />
              <div>
                <div style={{ fontWeight: 600 }}>@{project.owner.username}</div>
                <div className="text-text-tertiary" style={{ fontSize: "0.78rem" }}>владелец</div>
              </div>
            </div>
          )}
          {project.collabs?.map((c) => (
            <div className="team-row" key={c.id}>
              <Avatar username={c.User?.username || "?"} url={c.User?.avatarUrl || undefined} size="md" />
              <div>
                <div style={{ fontWeight: 600 }}>@{c.User?.username || "unknown"}</div>
                <div className="text-text-tertiary" style={{ fontSize: "0.78rem" }}>{c.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

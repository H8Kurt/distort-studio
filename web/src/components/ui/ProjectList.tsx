import React from "react";
import ProjectCard from "./ProjectCard";
import type { Project } from "../../types";

interface ProjectListProps {
  projects: Project[];
  activeId?: number | null;
  onSelect: (id: number) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, activeId, onSelect }) => {
  if (!projects.length) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
        <p className="text-text-secondary">Проектов пока нет. Создайте первый!</p>
      </div>
    );
  }

  return (
    <div className="grid-auto">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          active={activeId === project.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

export default ProjectList;

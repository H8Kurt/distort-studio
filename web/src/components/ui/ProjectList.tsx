import React from 'react';
import { FolderIcon, PlusIcon } from "@heroicons/react/24/solid";
import ProjectCard from '../ui/ProjectCard';
import type { Project } from '../../types/index.js';

interface ProjectListProps {
  projects: Project[];
  projectId: number | null;
  setProjectId: (id: number | null) => void;
  onEditProject: (id: number, newTitle: string, newDescription: string, newVisibility?: string) => void;
  onDeleteProject: (id: number) => void;
  onCreateProject: (title: string, description: string, visibility: 'PRIVATE' | 'PUBLIC' | 'TEAM') => Promise<void>;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  visibilityFilter: string;
  setVisibilityFilter: (filter: string) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  projectId,
  setProjectId,
  onEditProject,
  onDeleteProject,
  onCreateProject,
  viewMode,
  setViewMode,
  visibilityFilter,
  setVisibilityFilter
}) => {
  const [showNewProjectForm, setShowNewProjectForm] = React.useState(false);
  const [newProject, setNewProject] = React.useState({ 
    title: "", 
    description: "", 
    visibility: "PRIVATE" as 'PRIVATE' | 'PUBLIC' | 'TEAM' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title) return;
    await onCreateProject(newProject.title, newProject.description, newProject.visibility);
    setNewProject({ title: "", description: "", visibility: "PRIVATE" });
    setShowNewProjectForm(false);
  };

  const filteredProjects = projects.filter(p => !visibilityFilter || p.visibility === visibilityFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <FolderIcon className="w-6 h-6 text-purple-400" />
          Проекты
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="btn btn-sm btn-secondary"
            data-tooltip={viewMode === "grid" ? "Список" : "Сетка"}
          >
            {viewMode === "grid" ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            )}
          </button>
          <button 
            onClick={() => setShowNewProjectForm(!showNewProjectForm)}
            className="btn btn-primary btn-icon"
            data-tooltip="Новый проект"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Фильтры */}
      <div className="flex gap-2 mb-4">
        <select
          className="input text-sm py-1"
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
        >
          <option value="">Все статусы</option>
          <option value="PUBLIC">Публичные</option>
          <option value="PRIVATE">Приватные</option>
          <option value="TEAM">Командные</option>
        </select>
      </div>
      
      {/* Форма нового проекта */}
      {showNewProjectForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 space-y-3 animate-fade-in">
          <input
            className="input"
            placeholder="Название проекта"
            value={newProject.title}
            onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
            autoFocus
          />
          <textarea
            className="input resize-none"
            placeholder="Описание (опционально)"
            rows={2}
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
          />
          <select
            className="input"
            value={newProject.visibility}
            onChange={(e) => setNewProject({ ...newProject, visibility: e.target.value as 'PRIVATE' | 'PUBLIC' | 'TEAM' })}
          >
            <option value="PRIVATE">Приватный</option>
            <option value="PUBLIC">Публичный</option>
            <option value="TEAM">Командный</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary flex-1">
              <PlusIcon className="w-4 h-4" />
              Создать
            </button>
            <button 
              type="button" 
              onClick={() => setShowNewProjectForm(false)}
              className="btn btn-secondary"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {/* Список проектов */}
      <div className={`${viewMode === "grid" ? "grid grid-cols-1 gap-2" : "space-y-2"} max-h-[calc(100vh-350px)] overflow-y-auto pr-2`}>
        {filteredProjects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            isSelected={projectId === p.id}
            onSelect={() => setProjectId(p.id)}
            onEdit={() => {
              const newTitle = prompt("Новое название", p.title) || p.title;
              const newDescription = prompt("Описание", p.description) || p.description;
              const newVisibility = prompt("Статус (PRIVATE/PUBLIC/TEAM)", p.visibility || "PRIVATE") || p.visibility;
              onEditProject(p.id, newTitle, newDescription, newVisibility);
            }}
            onDelete={() => {
              if (confirm(`Удалить проект "${p.title}"?`)) {
                onDeleteProject(p.id);
              }
            }}
            viewMode={viewMode}
          />
        ))}

        {filteredProjects.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <FolderIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Нет проектов</p>
            <p className="text-sm">Создайте первый проект!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectList;

import React, { useState } from 'react';
import { PhotoIcon, FolderIcon, ClockIcon, UserGroupIcon } from "@heroicons/react/24/solid";
import ProjectList from '../components/ui/ProjectList';
import MediaCard from '../components/ui/MediaCard';
import UploadForm from '../UploadForm';
import type { Project, UploadFile, User } from '../types';

interface ProjectsPageProps {
  token: string | null;
  currentUser: User | null;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  projectId: number | null;
  setProjectId: React.Dispatch<React.SetStateAction<number | null>>;
  media: UploadFile[];
  setMedia: React.Dispatch<React.SetStateAction<UploadFile[]>>;
}

const ProjectsPage: React.FC<ProjectsPageProps> = ({
  token,
  currentUser,
  projects,
  setProjects,
  projectId,
  setProjectId,
  media,
  setMedia,
}) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("");

  const addProject = async (title: string, description: string, visibility: 'PRIVATE' | 'PUBLIC' | 'TEAM') => {
    if (!token) return;
    const res = await fetch("http://localhost:4000/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description, visibility }),
    });
    const created = await res.json();
    setProjects((prev: Project[]) => [...prev, created]);
  };

  const deleteProject = async (id: number) => {
    if (!token) return;
    await fetch(`http://localhost:4000/api/projects/${id}`, { 
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (projectId === id) {
      setProjectId(null);
      setMedia([]);
    }
    setProjects((prev: Project[]) => prev.filter(p => p.id !== id));
  };

  const editProject = async (
    id: number,
    newTitle: string,
    newDescription: string,
    newVisibility?: string
  ) => {
    if (!token) return;
    await fetch(`http://localhost:4000/api/projects/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ 
        title: newTitle, 
        description: newDescription,
        visibility: newVisibility
      }),
    });
    setProjects((prev: Project[]) => prev.map(p => 
      p.id === id ? { ...p, title: newTitle, description: newDescription, visibility: (newVisibility || p.visibility) as 'PRIVATE' | 'PUBLIC' | 'TEAM' } : p
    ));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Левая колонка - Проекты */}
      <div className="lg:col-span-4 xl:col-span-3">
        <ProjectList
          projects={projects}
          projectId={projectId}
          setProjectId={setProjectId}
          onEditProject={editProject}
          onDeleteProject={deleteProject}
          onCreateProject={addProject}
          viewMode={viewMode}
          setViewMode={setViewMode}
          visibilityFilter={visibilityFilter}
          setVisibilityFilter={setVisibilityFilter}
        />
      </div>

      {/* Правая колонка - Контент проекта */}
      <div className="lg:col-span-8 xl:col-span-9">
        {projectId ? (
          <div className="animate-fade-in">
            {/* Заголовок проекта с вкладками */}
            <div className="card mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {projects.find(p => p.id === projectId)?.title || "Проект"}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {projects.find(p => p.id === projectId)?.description || "Нет описания"}
                  </p>
                </div>
              </div>

              {/* Вкладки навигации */}
              <div className="flex gap-2 border-t border-gray-700/50 pt-4">
                <button
                  onClick={() => {}}
                  className={`btn flex-1 btn-primary`}
                >
                  <PhotoIcon className="w-4 h-4" />
                  Медиа
                </button>
                <a href={`/versions`} className="btn btn-secondary flex-1">
                  <FolderIcon className="w-4 h-4" />
                  Версии
                </a>
                <a href={`/collabs`} className="btn btn-secondary flex-1">
                  <UserGroupIcon className="w-4 h-4" />
                  Коллабы
                </a>
              </div>
            </div>

            {/* Контент вкладок - только медиа на главной */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <PhotoIcon className="w-6 h-6 text-purple-400" />
                Медиа проекта
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <ClockIcon className="w-4 h-4" />
                {media.length} файлов
              </div>
            </div>

            <div className="card mb-6">
              <UploadForm
                projectId={projectId}
                onUploaded={(mediaItem: UploadFile) => {
                  setMedia((prev: UploadFile[]) => [mediaItem, ...prev]);
                }}
              />
            </div>

            {media.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {media.map((u, i) => (
                  <MediaCard key={i} media={u} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 card">
                <PhotoIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-lg mb-2">Нет медиафайлов</p>
                <p className="text-gray-500 text-sm">Загрузите первые файлы в этот проект</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <FolderIcon className="w-24 h-24 mx-auto mb-4 text-gray-700" />
              <h3 className="text-2xl font-semibold text-gray-500 mb-2">Выберите проект</h3>
              <p className="text-gray-600">Выберите проект из списка слева или создайте новый</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;

import React from 'react';
import { PencilIcon, TrashIcon, ChevronRightIcon, FolderIcon } from "@heroicons/react/24/solid";
import type { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  viewMode?: "grid" | "list";
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  viewMode = "grid"
}) => {
  const visibilityColors = {
    PRIVATE: "bg-gray-500",
    PUBLIC: "bg-green-500",
    TEAM: "bg-blue-500"
  };
  
  const visibilityLabels = {
    PRIVATE: "Приватный",
    PUBLIC: "Публичный",
    TEAM: "Командный"
  };

  if (viewMode === "list") {
    return (
      <div 
        className={`group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden flex items-center gap-4 ${
          isSelected 
            ? "bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-purple-500/50 shadow-lg shadow-purple-500/20" 
            : "bg-gray-800/50 border-gray-700/50 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10"
        }`}
        onClick={onSelect}
      >
        {/* Индикатор выбора */}
        {isSelected && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-blue-500 rounded-l-xl" />
        )}
        
        <FolderIcon className="w-8 h-8 text-purple-400 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-white truncate">{project.title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs text-white ${visibilityColors[project.visibility || 'PRIVATE']}`}>
              {visibilityLabels[project.visibility || 'PRIVATE']}
            </span>
          </div>
          {project.description && (
            <p className="text-sm text-gray-400 truncate">{project.description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 rounded-lg hover:bg-yellow-500/20 text-yellow-400 transition-colors"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
          <ChevronRightIcon className={`w-5 h-5 text-purple-400 transition-transform ${isSelected ? "rotate-90" : ""}`} />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden ${
        isSelected 
          ? "bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/50 shadow-lg shadow-purple-500/20" 
          : "bg-gray-800/50 border-gray-700/50 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10"
      }`}
      onClick={onSelect}
    >
      {/* Декоративный градиент */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FolderIcon className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <h3 className="text-lg font-semibold text-white truncate">{project.title}</h3>
          </div>
          <div className="flex items-center gap-2 ml-7 mb-2">
            <span className={`px-2 py-0.5 rounded-full text-xs text-white ${visibilityColors[project.visibility || 'PRIVATE']}`}>
              {visibilityLabels[project.visibility || 'PRIVATE']}
            </span>
          </div>
          {project.description && (
            <p className="text-sm text-gray-400 line-clamp-2 ml-7">{project.description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 rounded-lg hover:bg-yellow-500/20 text-yellow-400 transition-colors tooltip"
            data-tooltip="Редактировать"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors tooltip"
            data-tooltip="Удалить"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
          <ChevronRightIcon className={`w-5 h-5 text-purple-400 transition-transform ${isSelected ? "rotate-90" : ""}`} />
        </div>
      </div>
      
      {/* Индикатор выбора */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-blue-500 rounded-l-xl" />
      )}
    </div>
  );
};

export default ProjectCard;

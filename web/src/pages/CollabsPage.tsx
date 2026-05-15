import React, { useState, useEffect } from 'react';
import { FolderIcon } from "@heroicons/react/24/solid";
import CollaborationPanel from '../CollaborationPanel';
import type { Project, Collaborator, User } from '../types';

interface CollabsPageProps {
  token: string | null;
  currentUser: User | null;
  projects: Project[];
  projectId: number | null;
  setProjectId: React.Dispatch<React.SetStateAction<number | null>>;
}

const CollabsPage: React.FC<CollabsPageProps> = ({
  token,
  currentUser,
  projects,
  projectId,
  setProjectId
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  const fetchProjectCollaborators = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:4000/api/projects/${id}/collabs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch collaborators");
      const data = await res.json();
      setCollaborators(data);
    } catch (err) {
      console.error("Ошибка загрузки коллабораторов:", err);
      setCollaborators([]);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectCollaborators(projectId);
    }
  }, [projectId, token]);

  const inviteCollaborator = async (userId: number, role: "editor" | "viewer" | "owner") => {
    if (!projectId || !token) return;
    const res = await fetch(`http://localhost:4000/api/projects/${projectId}/collabs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ userId, role }),
    });
    if (!res.ok) throw new Error("Failed to invite");
    await fetchProjectCollaborators(projectId);
  };

  const removeCollaborator = async (userId: number) => {
    if (!projectId || !token) return;
    if (!confirm("Удалить участника из проекта?")) return;
    const res = await fetch(`http://localhost:4000/api/projects/${projectId}/collaborators/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to remove");
    await fetchProjectCollaborators(projectId);
  };

  const changeRole = async (userId: number, role: "editor" | "viewer") => {
    if (!projectId || !token) return;
    const res = await fetch(`http://localhost:4000/api/projects/${projectId}/collaborators/${userId}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error("Failed to change role");
    await fetchProjectCollaborators(projectId);
  };

  if (!projectId) {
    return (
      <div className="text-center py-16">
        <FolderIcon className="w-24 h-24 mx-auto mb-4 text-gray-700" />
        <h3 className="text-2xl font-semibold text-gray-500 mb-2">Проект не выбран</h3>
        <p className="text-gray-600 mb-4">Выберите проект для управления участниками</p>
        <button onClick={() => setProjectId(null)} className="btn btn-primary">
          К списку проектов
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button onClick={() => setProjectId(null)} className="btn btn-secondary mb-4">
          ← Назад к проектам
        </button>
        <h2 className="text-2xl font-bold text-white">
          {projects.find(p => p.id === projectId)?.title || "Проект"}
        </h2>
        <p className="text-gray-400">Участники проекта</p>
      </div>

      <CollaborationPanel
        currentUserId={currentUser!.id}
        collaborators={collaborators}
        onInvite={inviteCollaborator}
        onRemove={removeCollaborator}
        onRoleChange={changeRole}
      />
    </div>
  );
};

export default CollabsPage;

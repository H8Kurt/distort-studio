import React, { useState, useEffect } from 'react';
import { FolderIcon, PlusIcon, PencilIcon } from "@heroicons/react/24/solid";
import VersionsPanel from '../VersionsPanel';
import type { Project, Version } from '../types/index.js';

interface VersionsPageProps {
  token: string | null;
  projects: Project[];
  projectId: number | null;
  setProjectId: React.Dispatch<React.SetStateAction<number | null>>;
}

const VersionsPage: React.FC<VersionsPageProps> = ({
  token,
  projects,
  projectId,
  setProjectId
}) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [showForkModal, setShowForkModal] = useState(false);
  const [forkName, setForkName] = useState("");
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchName, setBranchName] = useState("");

  const fetchProjectVersions = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:4000/api/projects/${id}/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch versions");
      const data = await res.json();
      setVersions(data);
    } catch (err) {
      console.error("Ошибка загрузки версий:", err);
      setVersions([]);
    }
  };

  const fetchProjectBranches = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:4000/api/projects/${id}/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch branches");
      const data = await res.json();
      setBranches(data);
    } catch (err) {
      console.error("Ошибка загрузки веток:", err);
      setBranches([]);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectVersions(projectId);
      fetchProjectBranches(projectId);
    }
  }, [projectId, token]);

  const createVersion = async (message: string) => {
    if (!projectId || !token) return;
    const res = await fetch(`http://localhost:4000/api/projects/${projectId}/versions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error("Failed to create version");
    await fetchProjectVersions(projectId);
  };

  const restoreVersion = async (versionId: number) => {
    if (!projectId || !token) return;
    if (!confirm("Восстановить эту версию? Текущие изменения будут сохранены как новая версия.")) return;
    const res = await fetch(`http://localhost:4000/api/projects/${projectId}/versions/${versionId}/restore`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to restore version");
    await fetchProjectVersions(projectId);
  };

  const forkProject = async () => {
    if (!projectId || !token) return;
    if (!forkName.trim()) {
      alert("Введите название форка");
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/api/projects/${projectId}/fork`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: forkName }),
      });
      if (!res.ok) throw new Error("Failed to fork project");
      const forkedProject = await res.json();
      alert(`Проект успешно форкнут! Новый проект ID: ${forkedProject.id}`);
      setShowForkModal(false);
      setForkName("");
    } catch (err: any) {
      alert(err.message || "Ошибка создания форка");
    }
  };

  const createBranch = async () => {
    if (!projectId || !token) return;
    if (!branchName.trim()) {
      alert("Введите название ветки");
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/api/projects/${projectId}/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: branchName }),
      });
      if (!res.ok) throw new Error("Failed to create branch");
      await fetchProjectBranches(projectId);
      setShowBranchModal(false);
      setBranchName("");
    } catch (err: any) {
      alert(err.message || "Ошибка создания ветки");
    }
  };

  const compareVersions = (v1: number, v2: number) => {
    alert(`Сравнение версий ${v1} и ${v2}\n(Функционал в разработке)`);
  };

  if (!projectId) {
    return (
      <div className="text-center py-16">
        <FolderIcon className="w-24 h-24 mx-auto mb-4 text-gray-700" />
        <h3 className="text-2xl font-semibold text-gray-500 mb-2">Проект не выбран</h3>
        <p className="text-gray-600 mb-4">Выберите проект для работы с версиями</p>
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {projects.find(p => p.id === projectId)?.title || "Проект"}
            </h2>
            <p className="text-gray-400">Управление версиями проекта</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForkModal(true)} className="btn btn-secondary">
              <FolderIcon className="w-4 h-4" />
              Форк проекта
            </button>
            <button onClick={() => setShowBranchModal(true)} className="btn btn-primary">
              <PlusIcon className="w-4 h-4" />
              Создать ветку
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно форка */}
      {showForkModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Создать форк проекта</h3>
            <input
              className="input w-full mb-4"
              placeholder="Название форка"
              value={forkName}
              onChange={(e) => setForkName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={forkProject} className="btn btn-primary flex-1">
                Создать форк
              </button>
              <button onClick={() => { setShowForkModal(false); setForkName(""); }} className="btn btn-secondary">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания ветки */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Создать ветку</h3>
            <input
              className="input w-full mb-4"
              placeholder="Название ветки"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={createBranch} className="btn btn-primary flex-1">
                Создать
              </button>
              <button onClick={() => { setShowBranchModal(false); setBranchName(""); }} className="btn btn-secondary">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список веток */}
      {branches.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <FolderIcon className="w-5 h-5 text-purple-400" />
            Ветки проекта
          </h3>
          <div className="flex flex-wrap gap-2">
            {branches.map((branch) => (
              <div key={branch.id} className="px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600">
                <span className="text-sm text-white font-medium">{branch.name}</span>
                {branch.Version && (
                  <span className="text-xs text-gray-400 ml-2">v{branch.Version.id}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <VersionsPanel
        versions={versions}
        onCreateVersion={createVersion}
        onRestoreVersion={restoreVersion}
        onCompareVersions={compareVersions}
      />
    </div>
  );
};

export default VersionsPage;

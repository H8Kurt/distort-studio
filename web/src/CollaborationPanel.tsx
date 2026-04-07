import { useState } from "react";
import { 
  UserGroupIcon, 
  PlusIcon, 
  TrashIcon,
  EnvelopeIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/solid";

interface Collaborator {
  id: number;
  username: string;
  email: string;
  role: "owner" | "editor" | "viewer";
}

interface CollaborationPanelProps {
  projectId: number;
  currentUserId: number;
  collaborators: Collaborator[];
  onInvite: (email: string, role: "editor" | "viewer") => Promise<void>;
  onRemove: (userId: number) => Promise<void>;
  onRoleChange: (userId: number, role: "editor" | "viewer") => Promise<void>;
}

export default function CollaborationPanel({ 
  currentUserId,
  collaborators, 
  onInvite, 
  onRemove,
  onRoleChange 
}: Omit<CollaborationPanelProps, 'projectId'>) {
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"editor" | "viewer">("viewer");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    
    setInviting(true);
    setError(null);
    setSuccess(null);
    
    try {
      await onInvite(newEmail, newRole);
      setNewEmail("");
      setSuccess("Приглашение отправлено!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Ошибка приглашения");
    } finally {
      setInviting(false);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "owner":
        return "badge-success";
      case "editor":
        return "badge-primary";
      case "viewer":
        return "badge-warning";
      default:
        return "badge-secondary";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return "Владелец";
      case "editor":
        return "Редактор";
      case "viewer":
        return "Наблюдатель";
      default:
        return role;
    }
  };

  const isOwner = collaborators.some(c => c.id === currentUserId && c.role === "owner");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <UserGroupIcon className="w-6 h-6 text-purple-400" />
          Участники проекта
        </h3>
        <span className="text-sm text-gray-400">{collaborators.length} человек</span>
      </div>

      {/* Форма приглашения */}
      {isOwner && (
        <div className="card">
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email для приглашения
                </label>
                <input
                  className="input"
                  placeholder="colleague@example.com"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={inviting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Роль
                </label>
                <select
                  className="input"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "editor" | "viewer")}
                  disabled={inviting}
                >
                  <option value="viewer">Наблюдатель</option>
                  <option value="editor">Редактор</option>
                </select>
              </div>
              
              <button
                type="submit"
                disabled={!newEmail.trim() || inviting}
                className="btn btn-primary mt-[22px]"
              >
                <PlusIcon className="w-5 h-5" />
                {inviting ? "Отправка..." : "Пригласить"}
              </button>
            </div>
            
            <div className="flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                Редактор может загружать файлы и создавать версии
              </span>
              <span className="flex items-center gap-1">
                <EnvelopeIcon className="w-3.5 h-3.5" />
                Наблюдатель только просматривает проект
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                {success}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Список участников */}
      <div className="space-y-3">
        {collaborators.length === 0 ? (
          <div className="text-center py-12 card">
            <UserGroupIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 text-lg mb-2">Нет участников</p>
            <p className="text-gray-500 text-sm">Пригласите коллег в проект</p>
          </div>
        ) : (
          collaborators.map((collaborator) => (
            <div
              key={collaborator.id}
              className="card group flex items-center justify-between hover:border-purple-500/30 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                {/* Аватар */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                  {collaborator.username.charAt(0).toUpperCase()}
                </div>
                
                {/* Информация */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-base font-semibold text-white">
                      {collaborator.username}
                    </h4>
                    <span className={`badge ${getRoleBadgeClass(collaborator.role)}`}>
                      {getRoleLabel(collaborator.role)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{collaborator.email}</p>
                </div>
              </div>

              {/* Действия */}
              <div className="flex items-center gap-2">
                {/* Смена роли (только для владельца или редакторов) */}
                {isOwner && collaborator.role !== "owner" && (
                  <>
                    <select
                      className="input text-sm py-1.5 px-3"
                      value={collaborator.role}
                      onChange={(e) => onRoleChange(collaborator.id, e.target.value as "editor" | "viewer")}
                    >
                      <option value="viewer">Наблюдатель</option>
                      <option value="editor">Редактор</option>
                    </select>
                    
                    <button
                      onClick={() => onRemove(collaborator.id)}
                      className="btn btn-danger btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Удалить из проекта"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </>
                )}
                
                {/* Владелец не может быть удалён */}
                {collaborator.role === "owner" && (
                  <span className="text-xs text-gray-500 italic">Владелец проекта</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

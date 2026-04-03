import { useState } from "react";
import { 
  FolderArrowDownIcon, 
  PlusIcon, 
  ArrowDownTrayIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon
} from "@heroicons/react/24/solid";

interface Version {
  id: number;
  versionNumber: string;
  message: string;
  createdAt: string;
  author: {
    id: number;
    username: string;
  };
  isCurrent?: boolean;
}

interface VersionsPanelProps {
  projectId: number;
  versions: Version[];
  onCreateVersion: (message: string) => Promise<void>;
  onRestoreVersion: (versionId: number) => Promise<void>;
  onCompareVersions: (v1: number, v2: number) => void;
}

export default function VersionsPanel({ 
  projectId, 
  versions, 
  onCreateVersion, 
  onRestoreVersion,
  onCompareVersions 
}: VersionsPanelProps) {
  const [newMessage, setNewMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setCreating(true);
    try {
      await onCreateVersion(newMessage);
      setNewMessage("");
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const toggleCompareSelection = (id: number) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter(v => v !== id));
    } else if (selectedForCompare.length < 2) {
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  const handleCompare = () => {
    if (selectedForCompare.length === 2) {
      onCompareVersions(selectedForCompare[0], selectedForCompare[1]);
      setSelectedForCompare([]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <FolderArrowDownIcon className="w-6 h-6 text-purple-400" />
          История версий
        </h3>
        {selectedForCompare.length === 2 && (
          <button
            onClick={handleCompare}
            className="btn btn-primary"
          >
            Сравнить версии
          </button>
        )}
      </div>

      {/* Форма создания версии */}
      <div className="card">
        <form onSubmit={handleCreateVersion} className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Создать новую версию
              </label>
              <input
                className="input"
                placeholder="Опишите изменения в этой версии..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={creating}
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || creating}
              className="btn btn-primary mt-[22px]"
            >
              <PlusIcon className="w-5 h-5" />
              {creating ? "Создание..." : "Создать версию"}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Версия сохранит текущее состояние всех медиафайлов проекта
          </p>
        </form>
      </div>

      {/* Список версий */}
      <div className="space-y-3">
        {versions.length === 0 ? (
          <div className="text-center py-12 card">
            <FolderArrowDownIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 text-lg mb-2">Нет сохранённых версий</p>
            <p className="text-gray-500 text-sm">Создайте первую версию проекта</p>
          </div>
        ) : (
          versions.map((version) => (
            <div
              key={version.id}
              className={`card group transition-all duration-300 ${
                version.isCurrent 
                  ? "bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30" 
                  : "hover:border-purple-500/30"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  {/* Чекбокс для сравнения */}
                  <label className="mt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedForCompare.includes(version.id)}
                      onChange={() => toggleCompareSelection(version.id)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500/50"
                    />
                  </label>

                  {/* Иконка версии */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    version.isCurrent
                      ? "bg-gradient-to-br from-green-500 to-emerald-500"
                      : "bg-gradient-to-br from-purple-500 to-blue-500"
                  }`}>
                    {version.isCurrent ? (
                      <CheckCircleIcon className="w-6 h-6 text-white" />
                    ) : (
                      <FolderArrowDownIcon className="w-6 h-6 text-white" />
                    )}
                  </div>

                  {/* Информация о версии */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-semibold text-white">
                        Версия {version.versionNumber}
                      </h4>
                      {version.isCurrent && (
                        <span className="badge badge-success">Текущая</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{version.message}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5" />
                        {version.author.username}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {new Date(version.createdAt).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Кнопки действий */}
                {!version.isCurrent && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onRestoreVersion(version.id)}
                      className="btn btn-secondary"
                      title="Восстановить версию"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Восстановить
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

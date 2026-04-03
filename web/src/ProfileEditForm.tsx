import { useState } from "react";
import { UserIcon, SparklesIcon, CameraIcon } from "@heroicons/react/24/solid";

interface User {
  id: number;
  username: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  rebelRank?: number;
}

interface ProfileEditFormProps {
  user: User;
  onSave: (data: Partial<User>) => Promise<void>;
  onCancel: () => void;
}

export default function ProfileEditForm({ user, onSave, onCancel }: ProfileEditFormProps) {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSave({ username, email, bio, avatarUrl });
    } catch (err: any) {
      setError(err.message || "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <UserIcon className="w-6 h-6 text-purple-400" />
          Редактирование профиля
        </h3>
      </div>

      <div className="space-y-5">
        {/* Аватар */}
        <div className="flex items-center gap-4 pb-6 border-b border-gray-700/50">
          <div className="relative">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="avatar" 
                className="w-20 h-20 rounded-full object-cover border-2 border-purple-500/50"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                {username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center border-2 border-gray-700">
              <CameraIcon className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-1">URL аватара</label>
            <input
              className="input"
              placeholder="https://example.com/avatar.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Оставьте пустым для использования инициалов</p>
          </div>
        </div>

        {/* Основные поля */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Имя пользователя</label>
            <input
              className="input"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              className="input"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {/* О себе */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">О себе</label>
          <textarea
            className="input resize-none"
            placeholder="Расскажите немного о себе..."
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">Краткое описание для вашего профиля</p>
        </div>

        {/* Статус Rebel Rank */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-purple-500/20">
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <SparklesIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Rebel Rank</span>
          </div>
          <p className="text-2xl font-bold text-white">{user.rebelRank || 1}</p>
          <p className="text-xs text-gray-500 mt-1">Ваш уровень активности в системе</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Кнопки */}
        <div className="flex gap-3 pt-4 border-t border-gray-700/50">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex-1"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Сохранение...
              </>
            ) : (
              <>
                <UserIcon className="w-5 h-5" />
                Сохранить изменения
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn btn-secondary px-6"
          >
            Отмена
          </button>
        </div>
      </div>
    </form>
  );
}

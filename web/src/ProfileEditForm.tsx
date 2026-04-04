import { useState } from "react";
import { UserIcon, SparklesIcon, CameraIcon, XMarkIcon } from "@heroicons/react/24/solid";

interface User {
  id: number;
  username: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  rebelRank?: number;
  location?: string;
  website?: string;
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
  const [coverUrl, setCoverUrl] = useState(user.coverUrl || "");
  const [location, setLocation] = useState(user.location || "");
  const [website, setWebsite] = useState(user.website || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSave({ username, email, bio, avatarUrl, coverUrl, location, website });
    } catch (err: any) {
      setError(err.message || "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border-color overflow-hidden animate-fade-in">
      {/* Предпросмотр шапки */}
      <div className="relative h-48 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600">
        {coverUrl && (
          <>
            <img src={coverUrl} alt="cover preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setCoverUrl("")}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-red-500 backdrop-blur-sm transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-white" />
            </button>
          </>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <UserIcon className="w-6 h-6 text-accent-primary" />
            Редактирование профиля
          </h3>
        </div>

        <div className="space-y-6">
          {/* Аватар и обложка */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-border-color">
            {/* Аватар */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Аватар</label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="avatar" 
                      className="w-20 h-20 rounded-full object-cover border-2 border-accent-primary"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                      {username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    className="input"
                    placeholder="URL аватара"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                  />
                  <p className="text-xs text-text-muted mt-1">Ссылка на изображение</p>
                </div>
              </div>
            </div>

            {/* Обложка */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Шапка профиля</label>
              <div className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  placeholder="URL обложки"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                />
                {coverUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverUrl("")}
                    className="btn btn-danger btn-icon"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1">Рекомендуемый размер: 1500x500px</p>
            </div>
          </div>

          {/* Основные поля */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Имя пользователя *</label>
              <input
                className="input"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Email *</label>
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

          {/* Локация и сайт */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Город</label>
              <input
                className="input"
                placeholder="Москва, Россия"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Веб-сайт</label>
              <input
                className="input"
                placeholder="https://mysite.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
          </div>

          {/* О себе */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">О себе</label>
            <textarea
              className="input resize-none"
              placeholder="Расскажите немного о себе..."
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <p className="text-xs text-text-muted mt-1">Краткое описание для вашего профиля</p>
          </div>

          {/* Статус Rebel Rank */}
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-accent-primary/20">
            <div className="flex items-center gap-2 text-accent-primary mb-2">
              <SparklesIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Rebel Rank</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{user.rebelRank || 1}</p>
            <p className="text-xs text-text-muted mt-1">Ваш уровень активности в системе</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
              {error}
            </div>
          )}

          {/* Кнопки */}
          <div className="flex gap-3 pt-4 border-t border-border-color">
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
      </div>
    </form>
  );
}

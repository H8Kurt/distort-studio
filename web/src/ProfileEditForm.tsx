import { useRef, useState, type FormEvent } from "react";
import FramedAvatar from "./components/ui/FramedAvatar";
import { api } from "./lib/api";
import { BANNERS, FRAMES, bannerStyle } from "./lib/cosmetics";
import type { User } from "./types";

interface ProfileEditFormProps {
  user: User;
  onSaved: (user: User) => void;
  onCancel: () => void;
}

interface UploadResult {
  url: string;
  thumbUrl?: string | null;
}

export default function ProfileEditForm({ user, onSaved, onCancel }: ProfileEditFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [bannerUrl, setBannerUrl] = useState(user.bannerUrl || "");
  const [frameId, setFrameId] = useState(user.frameId || "none");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File, apply: (url: string) => void) => {
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.postForm<UploadResult>("/api/upload/file", form);
      apply(res.thumbUrl || res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки изображения");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const updated = await api.put<User>(`/api/users/${user.id}`, {
        username,
        email,
        bio,
        avatarUrl: avatarUrl || null,
        bannerUrl: bannerUrl || null,
        frameId,
      });
      onSaved({ ...user, ...updated });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card animate-scale-in" style={{ display: "grid", gap: "1.1rem" }}>
      <h3>Редактировать профиль</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label>Имя пользователя</label>
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label>Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label>О себе</label>
        <textarea className="input" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Расскажите о своём стиле…" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label>Аватар</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <FramedAvatar username={username || "?"} url={avatarUrl || null} frameId={frameId} size="lg" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f, setAvatarUrl);
                e.target.value = "";
              }}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? "Загружаем…" : "Загрузить изображение"}
            </button>
            <input className="input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="…или ссылка на изображение" />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label>Рамка аватара</label>
        <div className="frame-picker">
          {FRAMES.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`frame-swatch${frameId === f.id ? " active" : ""}`}
              onClick={() => setFrameId(f.id)}
              title={f.name}
            >
              <span className="frame-swatch-ring" style={{ background: f.gradient }} />
              <span className="frame-swatch-name">{f.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label>Баннер профиля</label>
        <div className="banner-preview" style={bannerStyle(bannerUrl || null)} />
        <div className="banner-picker">
          {BANNERS.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`banner-swatch${(bannerUrl || "preset:none") === `preset:${b.id}` ? " active" : ""}`}
              style={{ backgroundImage: b.gradient }}
              onClick={() => setBannerUrl(`preset:${b.id}`)}
              title={b.name}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            id="banner-upload"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadImage(f, setBannerUrl);
              e.target.value = "";
            }}
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => document.getElementById("banner-upload")?.click()} disabled={uploading}>
            Загрузить свой баннер
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBannerUrl("")}>
            Сбросить
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: "flex", gap: "0.6rem" }}>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  );
}

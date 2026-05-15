import React, { useState } from 'react';
import { 
  PlusIcon, 
  ArrowUpOnSquareIcon, 
  TagIcon, 
  CurrencyDollarIcon,
  PhotoIcon,
  XMarkIcon,
  CheckCircleIcon
} from "@heroicons/react/24/solid";
import type { Asset } from '../../types';

interface AssetUploadFormProps {
  token: string;
  onUploaded?: (asset: Asset) => void;
  onCancel?: () => void;
}

const CATEGORIES = [
  'Текстуры',
  'Модели',
  'Аудио',
  'Видео',
  'Шрифты',
  'UI Kits',
  'Иконки',
  'Другое'
];

const FILE_TYPES = ['image', 'video', 'audio', '3d', 'font', 'other'];

const AssetUploadForm: React.FC<AssetUploadFormProps> = ({ 
  token, 
  onUploaded,
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    category: 'Другое',
    fileType: 'image' as Asset['fileType'],
    tags: '',
    isFree: true
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMainFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !mainFile) return;

    setUploading(true);

    try {
      // Создаем FormData для загрузки
      const uploadData = new FormData();
      uploadData.append('title', formData.title);
      uploadData.append('description', formData.description);
      uploadData.append('price', formData.isFree ? '0' : formData.price.toString());
      uploadData.append('category', formData.category);
      uploadData.append('fileType', formData.fileType);
      uploadData.append('isFree', formData.isFree.toString());
      uploadData.append('tags', formData.tags.split(',').map(t => t.trim()).filter(Boolean).join(','));
      
      if (thumbnailFile) {
        uploadData.append('thumbnail', thumbnailFile);
      }
      uploadData.append('file', mainFile);

      const res = await fetch('http://localhost:4000/api/assets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: uploadData
      });

      if (!res.ok) throw new Error('Ошибка загрузки');

      const asset = await res.json();
      setSuccess(true);
      onUploaded?.(asset);
      
      setTimeout(() => {
        setSuccess(false);
        onCancel?.();
      }, 2000);
    } catch (err) {
      console.error(err);
      alert('Ошибка при загрузке ассета');
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h3 className="text-xl font-bold text-white mb-2">Ассет успешно загружен!</h3>
        <p className="text-text-tertiary">Он появится в магазине после модерации</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <PlusIcon className="w-6 h-6 text-accent-primary" />
          Опубликовать ассет
        </h3>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-sm btn-secondary">
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Основная информация */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Название *
          </label>
          <input
            type="text"
            className="input"
            placeholder="Например: Neon Textures Pack"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Описание
          </label>
          <textarea
            className="input resize-none"
            placeholder="Опишите ваш ассет..."
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </div>

      {/* Категория и тип файла */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Категория
          </label>
          <select
            className="input"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Тип файла
          </label>
          <select
            className="input"
            value={formData.fileType}
            onChange={(e) => setFormData({ ...formData, fileType: e.target.value as Asset['fileType'] })}
          >
            {FILE_TYPES.map(type => (
              <option key={type} value={type}>
                {type === '3d' ? '3D Модель' : type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Цена */}
      <div className="card bg-bg-hover border-border-color">
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isFree}
              onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
              className="w-4 h-4 rounded border-border-color accent-accent-primary"
            />
            <span className="text-sm font-medium text-text-secondary">Бесплатный ассет</span>
          </label>
        </div>

        {!formData.isFree && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Цена ($)
            </label>
            <div className="relative">
              <CurrencyDollarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <input
                type="number"
                className="input pl-10"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Теги */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Теги (через запятую)
        </label>
        <div className="relative">
          <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            className="input pl-10"
            placeholder="neon, cyberpunk, texture, 4k"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          />
        </div>
      </div>

      {/* Загрузка файлов */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Превью */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Превью (обложка)
          </label>
          <div className="relative">
            {thumbnailPreview ? (
              <div className="relative aspect-square rounded-xl overflow-hidden border border-border-color">
                <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setThumbnailFile(null);
                    setThumbnailPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-red-500 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-border-color hover:border-accent-primary transition-colors cursor-pointer bg-bg-hover">
                <PhotoIcon className="w-8 h-8 text-text-muted mb-2" />
                <span className="text-sm text-text-tertiary">Загрузить превью</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Основной файл */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Файл ассета *
          </label>
          <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-border-color hover:border-accent-primary transition-colors cursor-pointer bg-bg-hover">
            {mainFile ? (
              <div className="text-center">
                <CheckCircleIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <span className="text-sm text-text-secondary">{mainFile.name}</span>
              </div>
            ) : (
              <>
                <ArrowUpOnSquareIcon className="w-8 h-8 text-text-muted mb-2" />
                <span className="text-sm text-text-tertiary">Загрузить файл</span>
              </>
            )}
            <input
              type="file"
              onChange={handleMainFileChange}
              className="hidden"
              required
            />
          </label>
        </div>
      </div>

      {/* Кнопка отправки */}
      <button
        type="submit"
        disabled={uploading || !formData.title || !mainFile}
        className="w-full btn btn-primary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Загрузка...
          </>
        ) : (
          <>
            <ArrowUpOnSquareIcon className="w-5 h-5" />
            Опубликовать ассет
          </>
        )}
      </button>
    </form>
  );
};

export default AssetUploadForm;

import React, { useState } from 'react';
import { 
  PhotoIcon, 
  HeartIcon, 
  EyeIcon,
  Squares2X2Icon,
  FilmIcon
} from "@heroicons/react/24/solid";
import GalleryCard from '../components/ui/GalleryCard';
import type { GalleryItem, User } from '../types';

interface ProjectsGalleryProps {
  token: string;
  currentUser: User | null;
}

// Демо данные для галереи
const DEMO_GALLERY: GalleryItem[] = [
  {
    id: 1,
    title: "Cyberpunk City Collection",
    description: "Серия работ в стиле киберпанк с неоновыми городами",
    coverImage: "https://picsum.photos/seed/cyber1/600/450",
    images: [
      "https://picsum.photos/seed/cyber1/800/600",
      "https://picsum.photos/seed/cyber2/800/600",
      "https://picsum.photos/seed/cyber3/800/600"
    ],
    likesCount: 234,
    viewsCount: 1892,
    UserId: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: "Abstract 3D Art",
    description: "Абстрактные 3D композиции и формы",
    coverImage: "https://picsum.photos/seed/abstract1/600/450",
    images: [
      "https://picsum.photos/seed/abstract1/800/600",
      "https://picsum.photos/seed/abstract2/800/600"
    ],
    likesCount: 189,
    viewsCount: 1456,
    UserId: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    title: "Nature Photography",
    description: "Фотографии природы со всего мира",
    coverImage: "https://picsum.photos/seed/nature1/600/450",
    images: [
      "https://picsum.photos/seed/nature1/800/600",
      "https://picsum.photos/seed/nature2/800/600",
      "https://picsum.photos/seed/nature3/800/600",
      "https://picsum.photos/seed/nature4/800/600"
    ],
    likesCount: 567,
    viewsCount: 3421,
    UserId: 3,
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    title: "Character Designs",
    description: "Концепты персонажей для игр и анимации",
    coverImage: "https://picsum.photos/seed/char1/600/450",
    images: [
      "https://picsum.photos/seed/char1/800/600",
      "https://picsum.photos/seed/char2/800/600"
    ],
    likesCount: 345,
    viewsCount: 2134,
    UserId: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 5,
    title: "Minimalist Posters",
    description: "Минималистичные постеры и плакаты",
    coverImage: "https://picsum.photos/seed/minimal1/600/450",
    images: [
      "https://picsum.photos/seed/minimal1/800/600",
      "https://picsum.photos/seed/minimal2/800/600",
      "https://picsum.photos/seed/minimal3/800/600"
    ],
    likesCount: 278,
    viewsCount: 1789,
    UserId: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: 6,
    title: "Digital Paintings",
    description: "Цифровая живопись и иллюстрации",
    coverImage: "https://picsum.photos/seed/digital1/600/450",
    images: [
      "https://picsum.photos/seed/digital1/800/600",
      "https://picsum.photos/seed/digital2/800/600"
    ],
    likesCount: 412,
    viewsCount: 2567,
    UserId: 3,
    createdAt: new Date().toISOString()
  }
];

const ProjectsGallery: React.FC<ProjectsGalleryProps> = ({ token, currentUser }) => {
  const [galleryItems] = useState<GalleryItem[]>(DEMO_GALLERY);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleItemClick = (item: GalleryItem) => {
    setSelectedItem(item);
    setCurrentImageIndex(0);
  };

  const closeLightbox = () => {
    setSelectedItem(null);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (selectedItem && currentImageIndex < selectedItem.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const prevImage = () => {
    if (selectedItem && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
            <PhotoIcon className="w-8 h-8 text-accent-primary" />
            Галерея проектов
          </h1>
          <p className="text-text-tertiary">
            Вдохновляйтесь работами других авторов и делитесь своими
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`btn btn-sm ${viewMode === "grid" ? "btn-primary" : "btn-secondary"}`}
          >
            <Squares2X2Icon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`btn btn-sm ${viewMode === "list" ? "btn-primary" : "btn-secondary"}`}
          >
            <FilmIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="flex items-center gap-6 text-sm text-text-muted">
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-card rounded-lg border border-border-color">
          <PhotoIcon className="w-4 h-4 text-accent-primary" />
          {galleryItems.length} галерей
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-card rounded-lg border border-border-color">
          <HeartIcon className="w-4 h-4 text-red-500" />
          {galleryItems.reduce((sum, item) => sum + (item.likesCount || 0), 0)} лайков
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-card rounded-lg border border-border-color">
          <EyeIcon className="w-4 h-4 text-blue-500" />
          {galleryItems.reduce((sum, item) => sum + (item.viewsCount || 0), 0)} просмотров
        </span>
      </div>

      {/* Сетка галереи */}
      {galleryItems.length > 0 ? (
        <div className={
          viewMode === "grid" 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            : "grid grid-cols-1 gap-4"
        }>
          {galleryItems.map(item => (
            <GalleryCard 
              key={item.id} 
              item={{
                ...item,
                User: { id: item.UserId, username: `user${item.UserId}` } as User
              }}
              onClick={handleItemClick}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 card">
          <PhotoIcon className="w-16 h-16 mx-auto mb-4 text-text-muted" />
          <h3 className="text-xl font-semibold text-white mb-2">Галерея пуста</h3>
          <p className="text-text-tertiary">Будьте первым, кто добавит свою работу!</p>
        </div>
      )}

      {/* Lightbox для просмотра */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-5xl">
            {/* Кнопка закрытия */}
            <button 
              onClick={closeLightbox}
              className="absolute -top-12 right-0 btn btn-sm btn-secondary"
            >
              Закрыть
            </button>

            {/* Навигация */}
            {selectedItem.images.length > 1 && (
              <>
                <button 
                  onClick={prevImage}
                  disabled={currentImageIndex === 0}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 btn btn-icon btn-secondary disabled:opacity-30"
                >
                  ←
                </button>
                <button 
                  onClick={nextImage}
                  disabled={currentImageIndex === selectedItem.images.length - 1}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 btn btn-icon btn-secondary disabled:opacity-30"
                >
                  →
                </button>
              </>
            )}

            {/* Изображение */}
            <div className="bg-bg-card border border-border-color rounded-2xl overflow-hidden">
              <img 
                src={selectedItem.images[currentImageIndex]} 
                alt={selectedItem.title}
                className="w-full h-[70vh] object-contain bg-black"
              />
              
              {/* Инфо панель */}
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {selectedItem.title}
                    </h2>
                    <p className="text-text-tertiary">
                      {selectedItem.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-text-muted">
                      <HeartIcon className="w-5 h-5" />
                      {selectedItem.likesCount}
                    </span>
                    <span className="flex items-center gap-1.5 text-text-muted">
                      <EyeIcon className="w-5 h-5" />
                      {selectedItem.viewsCount}
                    </span>
                  </div>
                </div>

                {/* Прогресс */}
                {selectedItem.images.length > 1 && (
                  <div className="flex items-center gap-2">
                    {selectedItem.images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImageIndex(i)}
                        className={`h-1.5 rounded-full transition-all ${
                          i === currentImageIndex 
                            ? 'w-8 bg-accent-primary' 
                            : 'w-4 bg-bg-hover hover:bg-accent-primary/50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsGallery;

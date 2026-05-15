import React, { useState } from 'react';
import { 
  ShoppingCartIcon, 
  FireIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  PlusIcon
} from "@heroicons/react/24/solid";
import AssetCard from '../components/ui/AssetCard';
import AssetUploadForm from '../components/ui/AssetUploadForm';
import type { Asset, User } from '../types';

interface AssetsMarketplaceProps {
  token: string;
  currentUser: User | null;
}

const CATEGORIES = [
  'Все',
  'Текстуры',
  'Модели',
  'Аудио',
  'Видео',
  'Шрифты',
  'UI Kits',
  'Иконки',
  'Другое'
];

// Демо данные для примера
const DEMO_ASSETS: Asset[] = [
  {
    id: 1,
    title: "Neon Cyberpunk Textures",
    description: "Набор текстур в стиле киберпанк с неоновыми эффектами",
    price: 15.99,
    category: "Текстуры",
    fileType: "image",
    tags: ["neon", "cyberpunk", "texture", "4k"],
    isFree: false,
    fileUrl: "/assets/neon-textures.zip",
    UserId: 1,
    downloadsCount: 234,
    likesCount: 89,
    thumbnailUrl: "https://picsum.photos/seed/neon/400/400"
  },
  {
    id: 2,
    title: "Ambient Sound Pack",
    description: "Атмосферные звуки для ваших проектов",
    price: 0,
    category: "Аудио",
    fileType: "audio",
    tags: ["ambient", "sound", "atmosphere"],
    isFree: true,
    fileUrl: "/assets/ambient-sounds.zip",
    UserId: 2,
    downloadsCount: 567,
    likesCount: 142,
    thumbnailUrl: "https://picsum.photos/seed/sound/400/400"
  },
  {
    id: 3,
    title: "Modern UI Kit",
    description: "Готовый UI kit для веб и мобильных приложений",
    price: 29.99,
    category: "UI Kits",
    fileType: "other",
    tags: ["ui", "kit", "modern", "figma"],
    isFree: false,
    fileUrl: "/assets/ui-kit.zip",
    UserId: 1,
    downloadsCount: 189,
    likesCount: 76,
    thumbnailUrl: "https://picsum.photos/seed/ui/400/400"
  },
  {
    id: 4,
    title: "Abstract 3D Shapes",
    description: "Коллекция абстрактных 3D форм",
    price: 0,
    category: "Модели",
    fileType: "3d",
    tags: ["3d", "abstract", "shapes", "blender"],
    isFree: true,
    fileUrl: "/assets/3d-shapes.zip",
    UserId: 3,
    downloadsCount: 892,
    likesCount: 234,
    thumbnailUrl: "https://picsum.photos/seed/3d/400/400"
  }
];

const AssetsMarketplace: React.FC<AssetsMarketplaceProps> = ({ token, currentUser }) => {
  const [assets, setAssets] = useState<Asset[]>(DEMO_ASSETS);
  const [selectedCategory, setSelectedCategory] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"popular" | "newest" | "price">("popular");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");

  const filteredAssets = assets.filter(asset => {
    const matchesCategory = selectedCategory === "Все" || asset.category === selectedCategory;
    const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPrice = priceFilter === "all" || 
                        (priceFilter === "free" && asset.isFree) ||
                        (priceFilter === "paid" && !asset.isFree);
    
    return matchesCategory && matchesSearch && matchesPrice;
  });

  const sortedAssets = [...filteredAssets].sort((a, b) => {
    switch (sortBy) {
      case "popular":
        return (b.likesCount || 0) - (a.likesCount || 0);
      case "newest":
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case "price":
        return a.price - b.price;
      default:
        return 0;
    }
  });

  const handleUploadSuccess = (newAsset: Asset) => {
    setAssets([newAsset, ...assets]);
    setShowUploadForm(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
            <ShoppingCartIcon className="w-8 h-8 text-accent-primary" />
            Магазин ассетов
          </h1>
          <p className="text-text-tertiary">
            Покупайте и продавайте цифровые активы для ваших проектов
          </p>
        </div>
        
        {currentUser && (
          <button 
            onClick={() => setShowUploadForm(true)}
            className="btn btn-primary"
          >
            <PlusIcon className="w-5 h-5" />
            Продать ассет
          </button>
        )}
      </div>

      {/* Форма загрузки (модальное окно) */}
      {showUploadForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-card border border-border-color rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <AssetUploadForm 
              token={token}
              onUploaded={handleUploadSuccess}
              onCancel={() => setShowUploadForm(false)}
            />
          </div>
        </div>
      )}

      {/* Фильтры и поиск */}
      <div className="card space-y-4">
        {/* Поиск */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            className="input pl-12"
            placeholder="Поиск ассетов по названию, описанию или тегам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Категории */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <FunnelIcon className="w-5 h-5 text-text-muted flex-shrink-0" />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-accent-primary text-white shadow-lg shadow-accent-glow/30'
                  : 'bg-bg-hover text-text-secondary hover:bg-bg-elevated'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Дополнительные фильтры */}
        <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-border-color">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Цена:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPriceFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  priceFilter === "all"
                    ? 'bg-accent-primary text-white'
                    : 'bg-bg-hover text-text-secondary hover:bg-bg-elevated'
                }`}
              >
                Все
              </button>
              <button
                onClick={() => setPriceFilter("free")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  priceFilter === "free"
                    ? 'bg-green-500 text-white'
                    : 'bg-bg-hover text-text-secondary hover:bg-bg-elevated'
                }`}
              >
                Бесплатные
              </button>
              <button
                onClick={() => setPriceFilter("paid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  priceFilter === "paid"
                    ? 'bg-accent-primary text-white'
                    : 'bg-bg-hover text-text-secondary hover:bg-bg-elevated'
                }`}
              >
                Платные
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ArrowsUpDownIcon className="w-5 h-5 text-text-muted" />
            <select
              className="input text-sm py-2"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="popular">Популярные</option>
              <option value="newest">Новые</option>
              <option value="price">Сначала дешевые</option>
            </select>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="flex items-center gap-4 text-sm text-text-muted">
        <span className="flex items-center gap-1.5">
          <FireIcon className="w-4 h-4 text-orange-500" />
          {sortedAssets.length} ассетов
        </span>
        {selectedCategory !== "Все" && (
          <span className="px-2 py-1 bg-accent-primary/20 text-accent-secondary rounded-md text-xs">
            {selectedCategory}
          </span>
        )}
      </div>

      {/* Сетка ассетов */}
      {sortedAssets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedAssets.map(asset => (
            <AssetCard 
              key={asset.id} 
              asset={{
                ...asset,
                User: { id: asset.UserId, username: `user${asset.UserId}` } as User
              }} 
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 card">
          <SparklesIcon className="w-16 h-16 mx-auto mb-4 text-text-muted" />
          <h3 className="text-xl font-semibold text-white mb-2">Ничего не найдено</h3>
          <p className="text-text-tertiary">Попробуйте изменить параметры поиска или фильтры</p>
        </div>
      )}
    </div>
  );
};

export default AssetsMarketplace;

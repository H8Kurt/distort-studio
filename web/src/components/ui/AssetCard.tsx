import React, { useState } from 'react';
import { 
  HeartIcon, 
  ArrowDownTrayIcon,
  CurrencyDollarIcon
} from "@heroicons/react/24/solid";
import type { Asset } from '../../types';

interface AssetCardProps {
  asset: Asset;
  onLike?: (id: number) => void;
  onDownload?: (id: number) => void;
  onBuy?: (id: number) => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ 
  asset, 
  onLike, 
  onDownload,
  onBuy 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.(asset.id);
  };

  const fileTypeIcons: Record<string, string> = {
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    '3d': '🧊',
    font: '🔤',
    other: '📦'
  };

  return (
    <div 
      className="group relative bg-bg-card border border-border-color rounded-2xl overflow-hidden transition-all duration-300 hover:border-accent-primary hover:shadow-xl hover:shadow-accent-glow/20 hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden bg-bg-secondary">
        {asset.thumbnailUrl ? (
          <img 
            src={asset.thumbnailUrl} 
            alt={asset.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            {fileTypeIcons[asset.fileType]}
          </div>
        )}
        
        {/* Overlay с действиями */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
            {/* Кнопки действий */}
            <div className="flex gap-2">
              {asset.isFree || asset.price === 0 ? (
                <button 
                  onClick={() => onDownload?.(asset.id)}
                  className="flex-1 btn btn-primary btn-sm"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Скачать
                </button>
              ) : (
                <button 
                  onClick={() => onBuy?.(asset.id)}
                  className="flex-1 btn btn-primary btn-sm"
                >
                  <CurrencyDollarIcon className="w-4 h-4" />
                  Купить
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={handleLike}
                className={`flex-1 btn btn-sm ${isLiked ? 'btn-danger' : 'btn-secondary'}`}
              >
                <HeartIcon className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                {isLiked ? 'Любимое' : 'В избранное'}
              </button>
            </div>
          </div>
        </div>

        {/* Badge типа файла */}
        <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-xs font-medium text-white uppercase">
          {asset.fileType}
        </div>

        {/* Бесплатный badge */}
        {asset.isFree && (
          <div className="absolute top-3 right-3 px-2.5 py-1 bg-green-500/90 backdrop-blur-sm rounded-lg text-xs font-bold text-white">
            FREE
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-text-primary text-base line-clamp-1 mb-1">
            {asset.title}
          </h3>
          <p className="text-text-tertiary text-sm line-clamp-2">
            {asset.description}
          </p>
        </div>

        {/* Автор */}
        {asset.User && (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>by</span>
            <span className="text-accent-secondary font-medium">@{asset.User.username}</span>
          </div>
        )}

        {/* Теги */}
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {asset.tags.slice(0, 3).map((tag: string, i: number) => (
              <span 
                key={i}
                className="px-2 py-0.5 bg-bg-hover rounded-md text-xs text-text-tertiary"
              >
                #{tag}
              </span>
            ))}
            {asset.tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-text-muted">
                +{asset.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Статистика и цена */}
        <div className="flex items-center justify-between pt-3 border-t border-border-color">
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
              {asset.downloadsCount || 0}
            </span>
            <span className="flex items-center gap-1">
              <HeartIcon className="w-3.5 h-3.5" />
              {(asset.likesCount || 0) + (isLiked ? 1 : 0)}
            </span>
          </div>
          
          {asset.price > 0 && !asset.isFree && (
            <div className="text-lg font-bold text-accent-primary">
              ${asset.price}
            </div>
          )}
          {asset.isFree && (
            <div className="text-sm font-bold text-green-400">
              Бесплатно
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetCard;

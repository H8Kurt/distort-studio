import React, { useState } from 'react';
import { 
  PhotoIcon, 
  HeartIcon, 
  EyeIcon,
  ShareIcon,
  UserIcon,
  CalendarIcon
} from "@heroicons/react/24/solid";
import type { GalleryItem } from '../../types';

interface GalleryCardProps {
  item: GalleryItem;
  onClick?: (item: GalleryItem) => void;
}

const GalleryCard: React.FC<GalleryCardProps> = ({ item, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  return (
    <div 
      className="group relative bg-bg-card border border-border-color rounded-2xl overflow-hidden transition-all duration-300 hover:border-accent-primary hover:shadow-xl hover:shadow-accent-glow/20 hover:-translate-y-1 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(item)}
    >
      {/* Cover Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-bg-secondary">
        <img 
          src={item.coverImage} 
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <button className="w-full btn btn-primary btn-sm">
              <PhotoIcon className="w-4 h-4" />
              Смотреть галерею
            </button>
          </div>
        </div>

        {/* Stats overlay - всегда видны */}
        <div className="absolute top-3 right-3 flex gap-2">
          <div className="px-2.5 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg flex items-center gap-1.5 text-xs font-medium text-white">
            <HeartIcon className="w-3.5 h-3.5" />
            {(item.likesCount || 0) + (isLiked ? 1 : 0)}
          </div>
          <div className="px-2.5 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg flex items-center gap-1.5 text-xs font-medium text-white">
            <EyeIcon className="w-3.5 h-3.5" />
            {item.viewsCount || 0}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-text-primary text-base line-clamp-1 mb-1">
            {item.title}
          </h3>
          <p className="text-text-tertiary text-sm line-clamp-2">
            {item.description}
          </p>
        </div>

        {/* Автор и дата */}
        <div className="flex items-center justify-between text-xs text-text-muted">
          {item.User && (
            <div className="flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5" />
              <span>@{item.User.username}</span>
            </div>
          )}
          {item.createdAt && (
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{new Date(item.createdAt).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="flex gap-2 pt-3 border-t border-border-color">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }}
            className={`flex-1 btn btn-sm ${isLiked ? 'btn-danger' : 'btn-secondary'}`}
          >
            <HeartIcon className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            {isLiked ? 'Нравится' : 'Лайк'}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); }}
            className="btn btn-sm btn-secondary"
          >
            <ShareIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GalleryCard;

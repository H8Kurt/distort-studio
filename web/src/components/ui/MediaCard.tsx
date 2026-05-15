import React from 'react';
import { DocumentTextIcon } from "@heroicons/react/24/solid";
import type { UploadFile } from '../../types/index.js';

interface MediaCardProps {
  media: UploadFile;
}

const MediaCard: React.FC<MediaCardProps> = ({ media }) => {
  return (
    <div className="group relative bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
      <div className="aspect-square flex items-center justify-center bg-gray-900/50">
        {media.type === "image" ? (
          <>
            <img
              src={`http://localhost:4000${media.thumbUrl || media.url}`}
              alt={media.originalName || "файл"}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <a
              href={`http://localhost:4000/api/projects/media/${media.filename}/download`}
              download
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50"
            >
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          </>
        ) : (
          <div className="text-center p-4">
            <DocumentTextIcon className="w-12 h-12 text-purple-400 mx-auto mb-2" />
            <a
              href={`http://localhost:4000/api/projects/media/${media.filename}/download`}
              download
              className="text-sm text-purple-400 hover:text-purple-300 underline decoration-purple-500/50"
            >
              {media.originalName || "Скачать файл"}
            </a>
          </div>
        )}
      </div>
      
      {/* Оверлей при наведении */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
        <span className="text-xs text-white truncate">{media.originalName || "Без названия"}</span>
      </div>
    </div>
  );
};

export default MediaCard;

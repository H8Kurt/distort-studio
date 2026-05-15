export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  rebelRank?: number;
  createdAt?: string;
  location?: string;
  website?: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  UserId: number;
  visibility?: 'PRIVATE' | 'PUBLIC' | 'TEAM';
  coverImage?: string;
  mediaCount?: number;
  likesCount?: number;
  viewsCount?: number;
  updatedAt?: string;
}

export interface UploadFile {
  filename?: string;
  originalName?: string;
  thumbUrl?: string;
  type: string;
  url: string;
}

export interface Version {
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

export interface Collaborator {
  id: number;
  username: string;
  email: string;
  role: "owner" | "editor" | "viewer";
}

export interface Session {
  id: number;
  projectId: number;
  userId: number;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  Project?: Project;
}

export interface Asset {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  thumbnailUrl?: string;
  previewUrls?: string[];
  fileUrl: string;
  fileType: 'image' | 'video' | 'audio' | '3d' | 'font' | 'other';
  tags: string[];
  downloadsCount?: number;
  likesCount?: number;
  isFree: boolean;
  UserId: number;
  User?: User;
  ProjectId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GalleryItem {
  id: number;
  title: string;
  description: string;
  coverImage: string;
  images: string[];
  likesCount?: number;
  viewsCount?: number;
  UserId: number;
  User?: User;
  ProjectId?: number;
  createdAt?: string;
}

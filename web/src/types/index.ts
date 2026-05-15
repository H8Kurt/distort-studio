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

import React from "react";
import { API_URL } from "../../lib/api";

interface AvatarProps {
  username: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  url?: string | null;
}

const SIZES: Record<NonNullable<AvatarProps["size"]>, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 64,
  xl: 96,
};

function resolve(url: string): string {
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return `${API_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

const Avatar: React.FC<AvatarProps> = ({ username, size = "md", url }) => {
  const px = SIZES[size];
  const style = { width: px, height: px, fontSize: px * 0.42 };

  if (url) {
    return <img src={resolve(url)} alt={username} className="avatar" style={style} />;
  }
  return (
    <div className="avatar-fallback" style={style}>
      {username.charAt(0).toUpperCase()}
    </div>
  );
};

export default Avatar;

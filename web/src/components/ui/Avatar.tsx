import React from 'react';

interface AvatarProps {
  username: string;
  size?: "sm" | "md" | "lg";
  url?: string;
}

const Avatar: React.FC<AvatarProps> = ({ username, size = "md", url }) => {
  const sizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-16 h-16" };
  const colors = ["from-purple-500 to-pink-500", "from-blue-500 to-cyan-500", "from-green-500 to-emerald-500"];
  const colorIndex = username.length % colors.length;
  
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-bold shadow-lg`}>
      {url ? (
        <img src={url} alt={username} className="w-full h-full rounded-full object-cover" />
      ) : (
        username.charAt(0).toUpperCase()
      )}
    </div>
  );
};

export default Avatar;

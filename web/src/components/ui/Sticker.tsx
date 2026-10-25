import React from "react";

interface StickerProps {
  children: React.ReactNode;
  color?: string;
  rotate?: number;
  className?: string;
  style?: React.CSSProperties;
}

const Sticker: React.FC<StickerProps> = ({ children, color, rotate = -3, className = "", style }) => (
  <span
    className={`sticker ${className}`}
    style={{ ...(color ? { background: color } : null), transform: `rotate(${rotate}deg)`, ...style }}
  >
    {children}
  </span>
);

export default Sticker;

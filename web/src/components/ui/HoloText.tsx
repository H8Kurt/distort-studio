import React from "react";

interface HoloTextProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const HoloText: React.FC<HoloTextProps> = ({ children, className = "", style }) => (
  <span className={`holo-text ${className}`} style={style}>
    {children}
  </span>
);

export default HoloText;

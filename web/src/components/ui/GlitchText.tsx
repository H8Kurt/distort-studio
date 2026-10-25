import React from "react";

interface GlitchTextProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const GlitchText: React.FC<GlitchTextProps> = ({ children, className = "", style }) => (
  <span className={`glitch ${className}`} style={style}>
    {children}
  </span>
);

export default GlitchText;

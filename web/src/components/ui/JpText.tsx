import React from "react";

interface JpTextProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const JpText: React.FC<JpTextProps> = ({ children, className = "", style }) => (
  <span className={`jp ${className}`} style={style}>
    {children}
  </span>
);

export default JpText;

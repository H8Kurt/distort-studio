import React from "react";

interface ChromeTextProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const ChromeText: React.FC<ChromeTextProps> = ({ children, className = "", style }) => (
  <span className={`chrome-text ${className}`} style={style}>
    {children}
  </span>
);

export default ChromeText;

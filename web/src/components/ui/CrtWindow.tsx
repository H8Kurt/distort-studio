import React from "react";

interface CrtWindowProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}

const DOTS = ["crt-dot-1", "crt-dot-2", "crt-dot-3"];

const CrtWindow: React.FC<CrtWindowProps> = ({ title = "window", children, className = "", style, bodyStyle }) => (
  <div className={`crt-window ${className}`} style={style}>
    <div className="crt-titlebar">
      <span className="font-mono" style={{ fontSize: "0.72rem", opacity: 0.9 }}>
        {title}
      </span>
      <span className="crt-dots">
        {DOTS.map((c) => (
          <span key={c} className={c} />
        ))}
      </span>
    </div>
    <div style={{ padding: "1.1rem", ...bodyStyle }}>{children}</div>
  </div>
);

export default CrtWindow;

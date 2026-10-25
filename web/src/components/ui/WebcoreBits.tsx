import React from "react";

/* --- Windows 98 / 2000-е окно --- */
export function Win98Window({
  title = "window.exe",
  children,
  className = "",
  style,
  bodyStyle,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}) {
  return (
    <div className={`win98 ${className}`} style={style}>
      <div className="win98-bar">
        <span className="win98-title">{title}</span>
        <span className="win98-btns" aria-hidden>
          <i>_</i>
          <i>▢</i>
          <i>✕</i>
        </span>
      </div>
      <div className="win98-body" style={bodyStyle}>
        {children}
      </div>
    </div>
  );
}

/* --- Радужная пиксельная звезда --- */
export function PixelStar({ size = 40, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`pixel-star ${className}`} style={{ width: size, height: size, ...style }}>
      <svg width={size} height={size} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <polygon
          points="12,1 15,9 23,9 17,14 19,22 12,17 5,22 7,14 1,9 9,9"
          fill="url(#rb)"
          stroke="#3a1030"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="rb" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff6fb0" />
            <stop offset="0.35" stopColor="#ffe066" />
            <stop offset="0.65" stopColor="#7dffcf" />
            <stop offset="1" stopColor="#5bc0ff" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

/* --- Блёстка-искра --- */
export function Sparkle({ size = 22, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`sparkle ${className}`} style={{ width: size, height: size, ...style }}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="#fff59a" stroke="#ffb3d9" strokeWidth="1.2" />
      </svg>
    </span>
  );
}

/* --- Пиксельный призрак --- */
export function PixelGhost({ size = 56, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`lowpoly ${className}`} style={{ width: size, height: size, ...style }}>
      <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
        <g fill="#3a1030">
          <rect x="3" y="1" width="10" height="12" />
          <rect x="1" y="5" width="2" height="6" />
          <rect x="13" y="5" width="2" height="6" />
          <rect x="3" y="13" width="3" height="1" />
          <rect x="6" y="13" width="3" height="2" />
          <rect x="10" y="13" width="3" height="1" />
        </g>
        <g fill="#ffffff">
          <rect x="4" y="2" width="8" height="10" />
          <rect x="2" y="6" width="1" height="4" />
          <rect x="13" y="6" width="1" height="4" />
          <rect x="4" y="12" width="2" height="1" />
          <rect x="7" y="12" width="2" height="1" />
          <rect x="10" y="12" width="1" height="1" />
        </g>
        <g fill="#3a1030">
          <rect x="6" y="5" width="1" height="2" />
          <rect x="9" y="5" width="1" height="2" />
        </g>
        <g fill="#ff8fc7">
          <rect x="5" y="8" width="1" height="1" />
          <rect x="10" y="8" width="1" height="1" />
          <rect x="7" y="8" width="2" height="1" />
        </g>
      </svg>
    </span>
  );
}

/* --- Пиксельный кот --- */
export function PixelCat({ size = 56, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`lowpoly ${className}`} style={{ width: size, height: size, ...style }}>
      <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
        <g fill="#3a1030">
          <rect x="3" y="1" width="3" height="3" />
          <rect x="10" y="1" width="3" height="3" />
          <rect x="3" y="3" width="10" height="10" />
        </g>
        <g fill="#fff6fb">
          <rect x="4" y="2" width="1" height="2" />
          <rect x="11" y="2" width="1" height="2" />
          <rect x="4" y="4" width="8" height="8" />
        </g>
        <g fill="#3a1030">
          <rect x="6" y="6" width="1" height="2" />
          <rect x="9" y="6" width="1" height="2" />
        </g>
        <g fill="#ff8fc7">
          <rect x="7" y="8" width="2" height="1" />
        </g>
        <g fill="#ff5fa2">
          <rect x="11" y="3" width="2" height="2" />
        </g>
        <g stroke="#3a1030" strokeWidth="0.5">
          <line x1="3" y1="8" x2="1" y2="7" />
          <line x1="3" y1="9" x2="1" y2="9" />
          <line x1="13" y1="8" x2="15" y2="7" />
          <line x1="13" y1="9" x2="15" y2="9" />
        </g>
      </svg>
    </span>
  );
}

/* --- Каомодзи / эмодзи-декор --- */
export function Kaomoji({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`kaomoji ${className}`} style={style}>
      {children}
    </span>
  );
}

/* --- Радужный текст --- */
export function RainbowText({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`holo-text ${className}`} style={style}>
      {children}
    </span>
  );
}

/* --- Иконка рабочего стола --- */
export function DesktopIcon({
  icon,
  label,
  color = "#7bd0ff",
  className = "",
  style,
}: {
  icon: string;
  label: string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`desktop-icon ${className}`} style={style}>
      <span className="desktop-icon-glyph" style={{ background: color }}>
        {icon}
      </span>
      <span className="desktop-icon-label">{label}</span>
    </div>
  );
}

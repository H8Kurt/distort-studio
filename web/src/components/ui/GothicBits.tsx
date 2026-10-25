import React from "react";

/* --- латинская подпись курсивом --- */
export function LatinNote({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`latin ${className}`} style={style}>
      {children}
    </span>
  );
}

/* --- готический разделитель-орнамент --- */
export function OrnamentDivider({
  glyph = "✠",
  className = "",
  style,
}: {
  glyph?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`ornament-divider ${className}`} style={style} aria-hidden>
      <span style={{ letterSpacing: "0.3em" }}>{glyph}</span>
    </div>
  );
}

/* --- счётчик посетителей в готической рамке --- */
export function VisitorCounter({ count = 66613, label = "visitor" }: { count?: number; label?: string }) {
  const digits = String(count).padStart(6, "0");
  return (
    <span className="visitor-counter" title="Счётчик посетителей">
      {label && <span style={{ opacity: 0.7 }}>{label}</span>}
      <b>{digits}</b>
    </span>
  );
}

/* --- пиксельная летучая мышь --- */
export function PixelBat({ size = 40, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`lowpoly ${className}`} style={{ width: size, height: size, ...style }}>
      <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
        <g fill="#0d0d0d">
          <rect x="7" y="6" width="2" height="4" />
          <rect x="6" y="5" width="4" height="2" />
        </g>
        <g fill="#8a8a9a">
          <rect x="1" y="5" width="5" height="2" />
          <rect x="1" y="7" width="3" height="2" />
          <rect x="10" y="5" width="5" height="2" />
          <rect x="12" y="7" width="3" height="2" />
          <rect x="6" y="5" width="4" height="3" />
          <rect x="4" y="4" width="2" height="1" />
          <rect x="10" y="4" width="2" height="1" />
          <rect x="6" y="4" width="1" height="2" />
          <rect x="9" y="4" width="1" height="2" />
        </g>
        <g fill="#c8c8d0">
          <rect x="7" y="6" width="1" height="1" />
          <rect x="8" y="6" width="1" height="1" />
          <rect x="7" y="8" width="2" height="1" />
        </g>
      </svg>
    </span>
  );
}

/* --- пиксельный ворон --- */
export function PixelCrow({ size = 40, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`lowpoly ${className}`} style={{ width: size, height: size, ...style }}>
      <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
        <g fill="#0d0d0d">
          <rect x="4" y="3" width="5" height="4" />
          <rect x="3" y="4" width="7" height="3" />
          <rect x="6" y="6" width="5" height="5" />
          <rect x="8" y="10" width="2" height="2" />
          <rect x="10" y="11" width="2" height="1" />
        </g>
        <g fill="#8a8a9a">
          <rect x="4" y="4" width="4" height="2" />
          <rect x="7" y="7" width="3" height="4" />
        </g>
        <g fill="#4a0e0e">
          <rect x="2" y="4" width="2" height="1" />
        </g>
        <g fill="#c8c8d0">
          <rect x="6" y="4" width="1" height="1" />
        </g>
      </svg>
    </span>
  );
}

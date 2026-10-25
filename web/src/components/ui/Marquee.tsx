import React from "react";

interface MarqueeProps {
  items: React.ReactNode[];
  reverse?: boolean;
  className?: string;
}

const Marquee: React.FC<MarqueeProps> = ({ items, reverse = false, className = "" }) => (
  <div className={`marquee ${reverse ? "marquee-reverse" : ""} ${className}`} aria-hidden>
    <div className="marquee-track">
      {[...items, ...items].map((item, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "2.5rem" }}>
          {item}
        </span>
      ))}
    </div>
  </div>
);

export default Marquee;

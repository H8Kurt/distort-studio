import React from "react";

interface TapeProps {
  rotate?: number;
  className?: string;
  style?: React.CSSProperties;
}

const Tape: React.FC<TapeProps> = ({ rotate = -6, className = "", style }) => (
  <span
    aria-hidden
    className={`tape ${className}`}
    style={{ transform: `rotate(${rotate}deg)`, ...style }}
  />
);

export default Tape;

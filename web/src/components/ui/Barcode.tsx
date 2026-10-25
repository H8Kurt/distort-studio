import React from "react";

interface BarcodeProps {
  className?: string;
  style?: React.CSSProperties;
}

const Barcode: React.FC<BarcodeProps> = ({ className = "", style }) => (
  <span aria-hidden className={`barcode ${className}`} style={style} />
);

export default Barcode;

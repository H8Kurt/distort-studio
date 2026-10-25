import { useEffect, useState } from "react";

export const PALETTES = [
  { id: "blood", label: "Blood", sw: "linear-gradient(135deg,#8b2e2e,#4a0e0e)" },
  { id: "violet", label: "Violet", sw: "linear-gradient(135deg,#5a3a78,#2a1a3a)" },
  { id: "ash", label: "Ash", sw: "linear-gradient(135deg,#b0b0b8,#4a4a55)" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

function getInitialPalette(): PaletteId {
  const stored = localStorage.getItem("palette");
  if (PALETTES.some((p) => p.id === stored)) return stored as PaletteId;
  return "blood";
}

interface PaletteSwitcherProps {
  showLabel?: boolean;
}

export default function PaletteSwitcher({ showLabel = true }: PaletteSwitcherProps) {
  const [palette, setPalette] = useState<PaletteId>(getInitialPalette);

  useEffect(() => {
    document.documentElement.setAttribute("data-palette", palette);
    localStorage.setItem("palette", palette);
  }, [palette]);

  return (
    <div>
      {showLabel && (
        <div className="tech-label" style={{ marginBottom: 8 }}>
          палитра
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {PALETTES.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.label}
            aria-label={`Палитра: ${p.label}`}
            aria-pressed={palette === p.id}
            onClick={() => setPalette(p.id)}
            className="palette-swatch"
            style={{
              background: p.sw,
              outline: palette === p.id ? "2px solid var(--text-primary)" : "2px solid transparent",
              outlineOffset: 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

import { useMemo, useRef } from "react";
import { usePlayer } from "../../lib/player";

function seededHeights(seed: string, count: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    const r = ((h >>> 0) % 1000) / 1000;
    const env = 0.45 + 0.55 * Math.sin((i / count) * Math.PI);
    out.push(Math.max(0.14, Math.min(1, (0.35 + r * 0.65) * env)));
  }
  return out;
}

interface WaveformSeekProps {
  bars?: number;
  className?: string;
}

export default function WaveformSeek({ bars = 56, className = "" }: WaveformSeekProps) {
  const { current, currentTime, duration, seek, locked } = usePlayer();
  const ref = useRef<HTMLDivElement | null>(null);
  const heights = useMemo(() => seededHeights(current?.id ?? "idle", bars), [current?.id, bars]);

  const total = duration || current?.duration || 0;
  const progress = total > 0 ? Math.min(1, currentTime / total) : 0;

  const handle = (clientX: number) => {
    if (locked) return;
    const el = ref.current;
    if (!el || total <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    seek(ratio * total);
  };

  return (
    <div
      ref={ref}
      className={`pv-wave ${className}`.trim()}
      role="slider"
      aria-label="Позиция воспроизведения"
      aria-valuemin={0}
      aria-valuemax={Math.round(total)}
      aria-valuenow={Math.round(currentTime)}
      aria-disabled={locked}
      tabIndex={locked ? -1 : 0}
      onPointerDown={(e) => {
        if (locked) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        handle(e.clientX);
      }}
      onPointerMove={(e) => {
        if (locked) return;
        if (e.buttons === 1) handle(e.clientX);
      }}
      onKeyDown={(e) => {
        if (locked) return;
        if (e.key === "ArrowRight") seek(Math.min(total, currentTime + 5));
        if (e.key === "ArrowLeft") seek(Math.max(0, currentTime - 5));
      }}
    >
      {heights.map((h, i) => {
        const played = i / bars <= progress;
        return (
          <span
            key={i}
            className={`pv-wave-bar${played ? " played" : ""}`}
            style={{ transform: `scaleY(${h})` }}
          />
        );
      })}
    </div>
  );
}

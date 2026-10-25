import { useEffect, useRef } from "react";
import { usePlayer } from "../../lib/player";

interface VisualizerProps {
  bars?: number;
  className?: string;
  color?: string;
}

export default function Visualizer({ bars = 24, className = "", color }: VisualizerProps) {
  const { analyser, isPlaying } = usePlayer();
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const nodes = refs.current;
    if (!analyser) {
      nodes.forEach((n) => n && (n.style.transform = "scaleY(0.18)"));
      return;
    }
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const step = Math.max(1, Math.floor(data.length / bars));
      for (let i = 0; i < bars; i += 1) {
        const node = nodes[i];
        if (!node) continue;
        const v = data[i * step] / 255;
        node.style.transform = `scaleY(${Math.max(0.08, v)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [analyser, bars]);

  return (
    <div className={`pv-vis${isPlaying ? " playing" : ""} ${className}`.trim()} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="pv-vis-bar"
          style={color ? { background: color } : undefined}
        />
      ))}
    </div>
  );
}

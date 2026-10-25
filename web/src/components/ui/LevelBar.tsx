interface LevelBarProps {
  level: number;
  xp: number;
  xpToNext: number;
  progress: number;
}

export default function LevelBar({ level, xp, xpToNext, progress }: LevelBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
  return (
    <div className="level-bar">
      <div className="level-badge">
        <span className="level-badge-num">{level}</span>
        <span className="level-badge-label">ур.</span>
      </div>
      <div className="level-bar-main">
        <div className="level-bar-head">
          <span>Уровень {level}</span>
          <span className="text-text-secondary">{xp} XP · до {level + 1} уровня {xpToNext} XP</span>
        </div>
        <div className="level-bar-track">
          <div className="level-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

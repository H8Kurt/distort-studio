import { useState } from "react";
import { usePlayer } from "../../lib/player";
import PlayerView from "./PlayerViews";
import QueueDrawer from "./QueueDrawer";

export default function PlayerDock() {
  const { queue, expanded } = usePlayer();
  const [queueOpen, setQueueOpen] = useState(false);

  if (queue.length === 0) return null;

  return (
    <div className={`player-dock${expanded ? " expanded" : ""}`} role="region" aria-label="Плеер">
      <PlayerView onToggleQueue={() => setQueueOpen((v) => !v)} />
      <QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} />
    </div>
  );
}

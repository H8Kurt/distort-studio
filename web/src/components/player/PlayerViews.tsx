import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsRightLeftIcon,
  ArrowPathIcon,
  QueueListIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HeartIcon,
} from "@heroicons/react/24/solid";
import { usePlayer, formatTime } from "../../lib/player";
import Visualizer from "./Visualizer";
import WaveformSeek from "./WaveformSeek";
import AlbumArt from "./AlbumArt";

interface ViewProps {
  onToggleQueue: () => void;
}

function PlayToggle({ big = false }: { big?: boolean }) {
  const { isPlaying, toggle, locked } = usePlayer();
  return (
    <button
      type="button"
      className={`pv-play${big ? " big" : ""}`}
      onClick={toggle}
      disabled={locked}
      title={locked ? "Синхронизация с комнатой" : isPlaying ? "Пауза" : "Играть"}
      aria-label={isPlaying ? "Пауза" : "Играть"}
    >
      {isPlaying ? <PauseIcon /> : <PlayIcon />}
    </button>
  );
}

function SideControls({ onToggleQueue }: ViewProps) {
  const {
    shuffle, repeat, toggleShuffle, cycleRepeat,
    volume, muted, setVolume, toggleMute, view, setView, expanded, setExpanded,
    queue, locked,
  } = usePlayer();

  const VIEWS = ["cassette", "winamp", "minimal"] as const;
  const nextView = () => setView(VIEWS[(VIEWS.indexOf(view) + 1) % VIEWS.length]);
  const viewLabel = { cassette: "КАС", winamp: "WIN", minimal: "MIN" }[view];

  return (
    <div className="pv-side">
      {locked && (
        <span className="pv-live" title="Совместное прослушивание">
          <span className="pv-live-dot" />
          LIVE
        </span>
      )}
      <button
        type="button"
        className={`pv-icon-btn${shuffle ? " on" : ""}`}
        onClick={toggleShuffle}
        title="Перемешать"
        aria-pressed={shuffle}
      >
        <ArrowsRightLeftIcon />
      </button>
      <button
        type="button"
        className={`pv-icon-btn${repeat !== "off" ? " on" : ""}`}
        onClick={cycleRepeat}
        title={repeat === "one" ? "Повтор одного" : repeat === "all" ? "Повтор всех" : "Без повтора"}
        aria-pressed={repeat !== "off"}
      >
        <ArrowPathIcon />
        {repeat === "one" && <span className="pv-badge">1</span>}
      </button>

      <div className="pv-volume">
        <button type="button" className="pv-icon-btn" onClick={toggleMute} title="Звук">
          {muted || volume === 0 ? <SpeakerXMarkIcon /> : <SpeakerWaveIcon />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="pv-range"
          aria-label="Громкость"
        />
      </div>

      <button type="button" className="pv-icon-btn pv-view-btn" onClick={nextView} title="Вид плеера">
        <span>{viewLabel}</span>
      </button>
      <button
        type="button"
        className="pv-icon-btn"
        onClick={onToggleQueue}
        title="Очередь"
        aria-label="Очередь"
      >
        <QueueListIcon />
        {queue.length > 0 && <span className="pv-badge">{queue.length > 99 ? "99" : queue.length}</span>}
      </button>
      <button
        type="button"
        className="pv-icon-btn pv-mobile-only"
        onClick={() => setExpanded(!expanded)}
        title={expanded ? "Свернуть" : "Развернуть"}
      >
        {expanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
      </button>
    </div>
  );
}

function LikeButton() {
  const { current } = usePlayer();
  // Лайк доступен только для треков из библиотеки
  if (!current || current.source !== "library" || current.trackId == null) return null;
  return (
    <span className="pv-like-hint" title="Лайкнуть можно в библиотеке">
      <HeartIcon />
    </span>
  );
}

/* ============ Winamp ============ */
function WinampView({ onToggleQueue }: ViewProps) {
  const { current, currentTime, duration, isPlaying, prev, next, locked } = usePlayer();
  const total = duration || current?.duration || 0;
  return (
    <div className="pv-winamp">
      <div className="pv-winamp-top">
        <span className="pv-winamp-brand">DIST●RT</span>
        <span className="pv-winamp-title">
          {current ? `${current.artist ? `${current.artist} - ` : ""}${current.title}` : "Нет трека"}
        </span>
      </div>
      <div className="pv-winamp-body">
        <div className="pv-winamp-lcd">
          <span className="pv-lcd-time">{formatTime(currentTime)}</span>
          <span className="pv-lcd-sep">/</span>
          <span className="pv-lcd-total">{formatTime(total)}</span>
          <Visualizer bars={18} className="pv-lcd-vis" />
        </div>
        <div className="pv-winamp-art">
          <AlbumArt track={current} size={54} spinning={isPlaying} />
        </div>
        <div className="pv-winamp-controls">
          <WaveformSeek bars={40} className="pv-wave-compact" />
          <div className="pv-transport">
            <button className="pv-icon-btn" onClick={prev} disabled={locked} title="Назад"><BackwardIcon /></button>
            <PlayToggle />
            <button className="pv-icon-btn" onClick={next} disabled={locked} title="Вперёд"><ForwardIcon /></button>
            <LikeButton />
          </div>
        </div>
        <SideControls onToggleQueue={onToggleQueue} />
      </div>
    </div>
  );
}

/* ============ Cassette ============ */
function CassetteView({ onToggleQueue }: ViewProps) {
  const { current, currentTime, duration, isPlaying, prev, next, locked } = usePlayer();
  const total = duration || current?.duration || 0;
  const progress = total > 0 ? Math.min(1, currentTime / total) : 0;
  return (
    <div className="pv-cassette">
      <div className={`pv-tape${isPlaying ? " rolling" : ""}`}>
        <div className="pv-tape-label">
          <div className="pv-tape-side">SIDE A</div>
          <div className="pv-tape-name">{current?.title || "Пустая кассета"}</div>
          <div className="pv-tape-artist">{current?.artist || "Distort Studio"}</div>
        </div>
        <div className="pv-tape-window">
          <span className="pv-reel left" style={{ animationDuration: `${6 - progress * 3}s` }}>
            <span className="pv-reel-hub" />
          </span>
          <span className="pv-tape-track">
            <span className="pv-tape-progress" style={{ width: `${progress * 100}%` }} />
          </span>
          <span className="pv-reel right" style={{ animationDuration: `${3 + progress * 3}s` }}>
            <span className="pv-reel-hub" />
          </span>
        </div>
        <div className="pv-tape-times">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(total)}</span>
        </div>
      </div>
      <div className="pv-cassette-side">
        <div className="pv-cassette-time">
          <span className="pv-cassette-big">{formatTime(currentTime)}</span>
          <span className="pv-cassette-sub">
            {current?.title || "—"} {current?.artist ? `· ${current.artist}` : ""}
          </span>
        </div>
        <WaveformSeek bars={44} />
        <div className="pv-transport">
          <button className="pv-icon-btn" onClick={prev} disabled={locked} title="Назад"><BackwardIcon /></button>
          <PlayToggle big />
          <button className="pv-icon-btn" onClick={next} disabled={locked} title="Вперёд"><ForwardIcon /></button>
        </div>
        <SideControls onToggleQueue={onToggleQueue} />
      </div>
    </div>
  );
}

/* ============ Minimal ============ */
function MinimalView({ onToggleQueue }: ViewProps) {
  const { current, currentTime, duration, isPlaying, prev, next, locked } = usePlayer();
  const total = duration || current?.duration || 0;
  return (
    <div className="pv-minimal">
      <AlbumArt track={current} size={46} spinning={isPlaying} />
      <div className="pv-min-meta">
        <span className="pv-min-title">{current?.title || "Нет трека"}</span>
        <span className="pv-min-artist">{current?.artist || "—"}</span>
      </div>
      <div className="pv-min-main">
        <div className="pv-transport">
          <button className="pv-icon-btn" onClick={prev} disabled={locked} title="Назад"><BackwardIcon /></button>
          <PlayToggle />
          <button className="pv-icon-btn" onClick={next} disabled={locked} title="Вперёд"><ForwardIcon /></button>
        </div>
        <WaveformSeek bars={64} />
        <span className="pv-min-time">
          {formatTime(currentTime)} / {formatTime(total)}
        </span>
      </div>
      <Visualizer bars={12} className="pv-min-vis" />
      <SideControls onToggleQueue={onToggleQueue} />
    </div>
  );
}

export default function PlayerView({ onToggleQueue }: ViewProps) {
  const { view } = usePlayer();
  if (view === "cassette") return <CassetteView onToggleQueue={onToggleQueue} />;
  if (view === "minimal") return <MinimalView onToggleQueue={onToggleQueue} />;
  return <WinampView onToggleQueue={onToggleQueue} />;
}

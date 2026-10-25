import {
  RocketLaunchIcon,
  FireIcon,
  HeartIcon,
  UsersIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
  ShoppingBagIcon,
  ClockIcon,
  TrophyIcon,
  LockClosedIcon,
  FlagIcon,
} from "@heroicons/react/24/solid";
import type { Achievement } from "../../types";

const ICONS: Record<string, typeof RocketLaunchIcon> = {
  rocket: RocketLaunchIcon,
  fire: FireIcon,
  heart: HeartIcon,
  users: UsersIcon,
  star: StarIcon,
  chat: ChatBubbleLeftRightIcon,
  pen: PencilSquareIcon,
  archive: ArchiveBoxIcon,
  bag: ShoppingBagIcon,
  clock: ClockIcon,
  crown: TrophyIcon,
  flag: FlagIcon,
};

interface AchievementsGridProps {
  achievements: Achievement[];
}

export default function AchievementsGrid({ achievements }: AchievementsGridProps) {
  if (!achievements.length) {
    return <p className="text-text-secondary">Достижения появятся, когда вы начнёте творить.</p>;
  }
  return (
    <div className="achievements-grid">
      {achievements.map((a) => {
        const Icon = a.unlocked ? ICONS[a.icon] || TrophyIcon : LockClosedIcon;
        return (
          <div key={a.code} className={`achievement-card${a.unlocked ? " unlocked" : ""}`}>
            <div className="achievement-icon">
              <Icon style={{ width: 22, height: 22 }} />
            </div>
            <div className="achievement-body">
              <div className="achievement-title">{a.title}</div>
              <div className="achievement-desc">{a.description}</div>
              {!a.unlocked && (
                <div className="achievement-progress">
                  <div className="achievement-progress-bar" style={{ width: `${Math.round(a.progress * 100)}%` }} />
                  <span className="achievement-progress-text">
                    {a.value} / {a.goal}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

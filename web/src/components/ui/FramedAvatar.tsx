import Avatar from "./Avatar";
import { frameStyle } from "../../lib/cosmetics";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface FramedAvatarProps {
  username: string;
  url?: string | null;
  frameId?: string | null;
  size?: AvatarSize;
}

export default function FramedAvatar({ username, url, frameId, size = "xl" }: FramedAvatarProps) {
  const style = frameStyle(frameId);
  const hasFrame = style.background !== "transparent";
  return (
    <div className="framed-avatar" style={{ ...style, borderRadius: "50%", display: "inline-flex" }}>
      <Avatar username={username} url={url} size={size} />
      {hasFrame && <span className="framed-avatar-shine" aria-hidden />}
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import {
  HeartIcon,
  ChatBubbleLeftIcon,
  TrashIcon,
  LinkIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";
import Avatar from "../ui/Avatar";
import PostComments from "../PostComments";
import ReportButton from "../ui/ReportButton";
import { resolve, timeAgo, ratioStyle, type FeedMode } from "../../lib/feed";
import type { Post, User } from "../../types";

interface PostCardProps {
  post: Post;
  currentUser: User;
  mode: FeedMode;
  commentsOpen: boolean;
  onToggleLike: (post: Post) => void;
  onToggleComments: (postId: number) => void;
  onDelete: (post: Post) => void;
}

export default function PostCard({
  post,
  currentUser,
  mode,
  commentsOpen,
  onToggleLike,
  onToggleComments,
  onDelete,
}: PostCardProps) {
  const navigate = useNavigate();
  const authorId = post.author?.id ?? post.userId;
  const image = resolve(post.imageUrl);
  const thumb = resolve(post.thumbUrl || post.imageUrl);
  const isOwner = post.userId === currentUser.id;
  const grid = mode === "grid";

  return (
    <article className={`card card-hover feed-card animate-fade-in${grid ? " post-card-grid" : ""}`}>
      <header className="feed-head">
        <button className="feed-owner-btn" onClick={() => navigate(`/u/${authorId}`)} title="Профиль автора">
          <Avatar username={post.author?.username || "?"} url={post.author?.avatarUrl || undefined} size="sm" />
        </button>
        <div style={{ minWidth: 0 }}>
          <button className="feed-owner" onClick={() => navigate(`/u/${authorId}`)}>
            @{post.author?.username || "unknown"}
          </button>
          <div className="feed-date">{timeAgo(post.createdAt)}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {isOwner ? (
            <button className="icon-btn sm" onClick={() => onDelete(post)} aria-label="Удалить пост">
              <TrashIcon style={{ width: 14, height: 14 }} />
            </button>
          ) : (
            <ReportButton targetType="post" targetId={post.id} />
          )}
        </div>
      </header>

      {image && (
        <button
          type="button"
          className="post-image"
          style={ratioStyle(post.imageWidth, post.imageHeight)}
          onClick={() => window.open(image, "_blank", "noopener")}
        >
          <img src={thumb} alt="" loading="lazy" />
        </button>
      )}

      {post.content && <p className="post-content">{post.content}</p>}

      {post.Project && (
        <button className="post-project-link" onClick={() => navigate(`/projects/${post.Project!.id}`)}>
          <LinkIcon style={{ width: 14, height: 14 }} />
          {post.Project.title}
        </button>
      )}

      <div className="feed-foot">
        <button className={`like-btn${post.isLiked ? " liked" : ""}`} onClick={() => onToggleLike(post)}>
          <HeartIcon style={{ width: 15, height: 15 }} /> {post.likesCount ?? 0}
        </button>
        <button className="feed-meta feed-meta-btn" onClick={() => onToggleComments(post.id)}>
          <ChatBubbleLeftIcon style={{ width: 13, height: 13 }} /> {post.commentsCount ?? 0}
        </button>
        {image && (
          <span className="feed-meta">
            <PhotoIcon style={{ width: 13, height: 13 }} />
          </span>
        )}
      </div>

      {commentsOpen && (
        <PostComments postId={post.id} currentUserId={currentUser.id} postOwnerId={post.userId} />
      )}
    </article>
  );
}

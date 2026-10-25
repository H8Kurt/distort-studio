export interface User {
  id: number;
  username: string;
  email: string;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  frameId?: string | null;
  role?: string;
  status?: UserStatus;
  rebelRank?: number;
  emailVerified?: boolean;
  isOfficial?: boolean;
  createdAt?: string;
}

export type UserStatus = "active" | "suspended" | "banned";

export interface ProjectOwner {
  id: number;
  username: string;
  avatarUrl?: string | null;
  isOfficial?: boolean;
}

export interface Project {
  id: number;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  tags?: string[] | null;
  UserId: number;
  visibility?: "PRIVATE" | "PUBLIC" | "TEAM";
  mediaCount?: number;
  likesCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  publishedAt?: string | null;
  forkedFromId?: number | null;
  rootId?: number | null;
  owner?: ProjectOwner;
  updatedAt?: string;
  createdAt?: string;
}

export interface Post {
  id: number;
  userId: number;
  content: string;
  projectId?: number | null;
  imageUrl?: string | null;
  thumbUrl?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  createdAt: string;
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  isPinned?: boolean;
  author?: ProjectOwner | null;
  Project?: {
    id: number;
    title: string;
    coverUrl?: string | null;
    visibility?: string;
  } | null;
}

export interface PostComment {
  id: number;
  postId: number;
  userId: number;
  parentId?: number | null;
  content: string;
  createdAt?: string;
  author?: ProjectOwner | null;
}

export interface FeedItem {
  type: "project" | "post";
  createdAt: string;
  project?: Project;
  post?: Post;
}

export interface Achievement {
  code: string;
  title: string;
  description: string;
  icon: string;
  metric: string;
  goal: number;
  value: number;
  unlocked: boolean;
  progress: number;
}

export interface ProfileStats {
  xp: number;
  level: number;
  levelStartXp: number;
  nextLevelXp: number;
  xpToNext: number;
  xpForLevel: number;
  progress: number;
  achievements: Achievement[];
  raw: Record<string, number>;
}

export interface UserProfile extends ProjectOwner {
  bio?: string | null;
  role?: string;
  status?: UserStatus;
  bannerUrl?: string | null;
  frameId?: string | null;
  rebelRank?: number;
  createdAt?: string;
  followersCount: number;
  followingCount: number;
  projectsCount: number;
  likesCount: number;
  isFollowing: boolean;
  isSelf: boolean;
  isBlocked?: boolean;
  isMuted?: boolean;
  friendStatus?: FriendStatus;
  friendsCount?: number;
  projects: Project[];
  stats?: ProfileStats;
}

export type FriendStatus = "none" | "outgoing" | "incoming" | "friends";

export interface FriendUser {
  id: number;
  username: string;
  avatarUrl?: string | null;
  frameId?: string | null;
  bio?: string | null;
  lastSeenAt?: string | null;
}

export interface FriendRequests {
  incoming: { id: number; user: FriendUser }[];
  outgoing: { id: number; user: FriendUser }[];
}

export type ConversationType = "direct" | "group";
export type ConversationRole = "owner" | "admin" | "member";

export interface ConversationMember extends FriendUser {
  role: ConversationRole;
  muted?: boolean;
  lastReadAt?: string | null;
}

export interface ConversationSummary {
  id: number;
  type?: ConversationType;
  title?: string | null;
  avatarUrl?: string | null;
  ownerId?: number | null;
  user: FriendUser | null;
  members?: ConversationMember[];
  memberCount?: number;
  role?: ConversationRole;
  lastMessage: string;
  lastMessageAt?: string | null;
  unread: number;
}

export interface ConversationDetail {
  id: number;
  type: ConversationType;
  title: string | null;
  avatarUrl: string | null;
  ownerId: number | null;
  user: FriendUser | null;
  members: ConversationMember[];
  memberCount: number;
  role: ConversationRole;
}

export type AttachmentType = "image" | "video" | "audio" | "file";

export interface MessageReaction {
  emoji: string;
  count: number;
  mine: boolean;
  users: { id: number; username: string }[];
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  text: string | null;
  replyToId?: number | null;
  readAt?: string | null;
  editedAt?: string | null;
  createdAt: string;
  sender?: FriendUser | null;
  replyTo?: { id: number; text: string | null; senderId: number } | null;
  reactions?: MessageReaction[];
  readBy?: number;
  attachmentUrl?: string | null;
  attachmentType?: AttachmentType | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  attachmentSize?: number | null;
}

export type ReportTargetType = "user" | "post" | "project" | "comment" | "message" | "asset";

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface ModerationReport {
  id: number;
  reporterId: number;
  targetType: ReportTargetType;
  targetId: number;
  reason: string;
  details?: string | null;
  status: ReportStatus;
  resolutionNote?: string | null;
  resolvedById?: number | null;
  resolvedAt?: string | null;
  createdAt: string;
  reporter?: FriendUser | null;
}

export interface ReportsResponse {
  reports: ModerationReport[];
  total: number;
  page: number;
  pages: number;
  openCount: number;
}

export interface BlockedEntry {
  id: number;
  user: FriendUser | null;
}

export interface AppNotification {
  id: number;
  userId: number;
  actorId?: number | null;
  type: "follow" | "like" | "comment" | "collab_invite" | "collab_accept" | "project_update" | "post_like" | "post_comment" | string;
  projectId?: number | null;
  postId?: number | null;
  commentId?: number | null;
  message?: string | null;
  read: boolean;
  createdAt: string;
  actor?: ProjectOwner | null;
  Project?: { id: number; title: string } | null;
}

export interface ProjectCollab {
  id: number;
  projectId: number;
  userId: number;
  role: "owner" | "editor" | "viewer";
  User?: { id: number; username: string; avatarUrl?: string | null };
}

export interface WorkspaceProject extends Project {
  versionCount?: number;
  collabs?: ProjectCollab[];
  isOwner?: boolean;
  isEditor?: boolean;
}

export interface Comment {
  id: number;
  projectId: number;
  versionId?: number | null;
  userId: number;
  parentId?: number | null;
  content: string;
  createdAt?: string;
  User?: { id: number; username: string; avatarUrl?: string | null } | null;
  replies?: Comment[];
}

export interface MediaFile {
  id?: number;
  filename?: string;
  originalName?: string;
  thumbUrl?: string | null;
  url: string;
  type: string;
  mime?: string;
  size?: number;
  createdAt?: string;
}

export type TrackVisibility = "PRIVATE" | "PUBLIC" | "UNLISTED";

export interface Track {
  id: number;
  title: string;
  artist?: string | null;
  genre?: string | null;
  url: string;
  thumbUrl?: string | null;
  duration?: number;
  plays?: number;
  likeCount?: number;
  visibility?: TrackVisibility;
  UserId?: number;
  owner?: ProjectOwner | null;
  ownerName?: string;
  ownerAvatar?: string | null;
  isLiked?: boolean;
  isOwner?: boolean;
  createdAt?: string;
}

export interface TrackListResponse {
  tracks: Track[];
  total: number;
  page: number;
  pages: number;
}

export interface Playlist {
  id: number;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  isPublic?: boolean;
  UserId?: number;
  trackCount?: number;
  tracks?: Track[];
  owner?: ProjectOwner | null;
  createdAt?: string;
}

export interface VersionAuthor {
  id: number;
  username: string;
  avatarUrl?: string | null;
}

export interface Version {
  id: number;
  projectId: number;
  parentVersionId?: number | null;
  message: string;
  createdAt: string;
  author?: VersionAuthor | null;
}

export interface Branch {
  id: number;
  projectId: number;
  name: string;
  versionId?: number | null;
  Version?: { id: number; message: string; createdAt: string } | null;
}

export interface Collaborator {
  id: number;
  projectId: number;
  userId: number;
  role: "owner" | "editor" | "viewer";
  status?: "pending" | "accepted" | "declined";
  invitedById?: number | null;
  User?: { id: number; username: string; email?: string; avatarUrl?: string | null };
  inviter?: { id: number; username: string; avatarUrl?: string | null } | null;
}

export interface CollabInvite {
  id: number;
  projectId: number;
  role: "owner" | "editor" | "viewer";
  status: string;
  createdAt: string;
  project?: { id: number; title: string; visibility?: string } | null;
  inviter?: { id: number; username: string; avatarUrl?: string | null } | null;
}

export interface Session {
  id: number;
  projectId: number;
  userId: number;
  startTime: string;
  endTime?: string | null;
  durationSeconds: number;
  Project?: { id: number; title: string };
}

export type AssetFileType = "image" | "video" | "audio" | "3d" | "font" | "other";export interface AssetAuthor {
  id: number;
  username: string;
  avatarUrl?: string | null;
}

export interface Asset {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  thumbUrl?: string | null;
  fileUrl?: string;
  fileType: AssetFileType;
  tags: string[];
  downloadsCount?: number;
  likesCount?: number;
  isFree: boolean;
  UserId: number;
  author?: AssetAuthor;
  isPurchased?: boolean;
  createdAt?: string;
}

export type OrderStatus = "pending" | "paid" | "canceled" | "refunded" | "failed";

export interface Order {
  id: number;
  buyerId: number;
  sellerId: number;
  assetId: number;
  amount: number;
  currency: string;
  status: OrderStatus;
  provider: string;
  providerPaymentId?: string | null;
  confirmationUrl?: string | null;
  qrData?: string | null;
  paidAt?: string | null;
  createdAt?: string;
  asset?: Asset;
  buyer?: AssetAuthor;
  seller?: AssetAuthor;
}

export interface OrderCreateResponse {
  order: Order;
  alreadyOwned?: boolean;
}

export interface DiscoveredApp {
  name: string;
  path: string;
  args?: string | null;
  icon?: string | null;
  categories?: string | null;
  source?: string;
}

export interface AppEntry {
  id: number;
  userId: number;
  name: string;
  path: string;
  args?: string | null;
  icon?: string | null;
  lastUsed?: string | null;
  createdAt?: string;
  projectId?: number | null;
  watchFolder?: string | null;
  autoSession?: boolean;
  autoImport?: boolean;
}

export interface RoomUser {
  id: number;
  username: string;
  avatarUrl?: string | null;
  frameId?: string | null;
}

export interface RoomMemberInfo {
  userId: number;
  username: string;
  avatarUrl?: string | null;
}

export interface RoomMemberRecord {
  id: number;
  userId: number;
  role: "host" | "member";
  user?: RoomUser;
}

export interface RoomMessage {
  id: number;
  roomId: number;
  userId?: number;
  text: string;
  type: "text" | "reaction" | "system";
  author?: RoomUser;
  createdAt?: string;
}

export interface RoomSummary {
  id: number;
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  isPublic: boolean;
  mode?: RoomMode;
  hostId: number;
  hostName?: string;
  hostAvatar?: string | null;
  host?: RoomUser;
  memberCount?: number;
  isMember?: boolean;
  isHost?: boolean;
  lastActiveAt?: string;
  createdAt?: string;
}

export type RoomMode = "music" | "watch" | "board" | "draw";

export interface RoomWatchState {
  videoId: string | null;
  playing: boolean;
  position: number;
  baseAt: number;
}

export interface BoardColumn {
  id: string;
  title: string;
}

export interface BoardCard {
  id: string;
  columnId: string;
  text: string;
  authorId: number;
  authorName: string;
  color: string;
  createdAt: number;
}

export interface RoomBoardState {
  columns: BoardColumn[];
  cards: BoardCard[];
}

export interface RoomDrawState {
  image: string | null;
  lockHolderId: number | null;
  lockHolderName: string | null;
  updatedAt: number;
}

export type ChallengeMode = "art" | "music" | "writing" | "any";
export type ChallengeStatus = "draft" | "active" | "upcoming" | "ended";

export interface Challenge {
  id: number;
  title: string;
  description?: string | null;
  theme: string;
  coverUrl?: string | null;
  mode: ChallengeMode;
  startsAt?: string | null;
  endsAt?: string | null;
  status: ChallengeStatus;
  createdById: number;
  creator?: ProjectOwner | null;
  creatorName?: string;
  creatorAvatar?: string | null;
  entriesCount: number;
  createdAt?: string;
}

export interface ChallengeEntry {
  id: number;
  challengeId: number;
  userId: number;
  projectId?: number | null;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  votesCount: number;
  hasVoted?: boolean;
  author?: ProjectOwner | null;
  authorName?: string;
  authorAvatar?: string | null;
  project?: { id: number; title: string; coverUrl?: string | null } | null;
  createdAt?: string;
}

export interface ChallengeDetail extends Challenge {
  entries: ChallengeEntry[];
  myEntryIds: number[];
}

export interface ForkNode {
  id: number;
  title: string;
  coverUrl?: string | null;
  visibility?: string;
  publishedAt?: string | null;
  forkedFromId?: number | null;
  createdAt?: string;
  owner?: ProjectOwner | null;
}

export interface ForkTree {
  rootId: number;
  currentId: number;
  nodes: ForkNode[];
}

/* ============================ Админка ============================ */

export interface AnnouncementSetting {
  enabled: boolean;
  text: string;
  level: "info" | "warning" | "success";
  link?: string;
  updatedAt?: string | null;
}

export interface FeaturedProject {
  id: number;
  title: string;
  coverUrl?: string | null;
  updatedAt?: string;
  owner?: ProjectOwner | null;
}

export interface SiteSettings {
  maintenance: { enabled: boolean };
  signupsOpen: boolean;
  announcement: AnnouncementSetting;
  featured: { projectIds: number[] };
  featuredProjects?: FeaturedProject[];
}

export interface AdminStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    banned: number;
    official: number;
    newToday: number;
    new7: number;
    new30: number;
  };
  content: {
    posts: number;
    projects: number;
    comments: number;
    tracks: number;
    assets: number;
    playlists: number;
    rooms: number;
    challenges: number;
  };
  moderation: { openReports: number };
  commerce: { orders: number; paidOrders: number; revenue: number };
  signupsSeries: { date: string; count: string | number }[];
  postsSeries: { date: string; count: string | number }[];
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  status: UserStatus;
  bio?: string | null;
  avatarUrl?: string | null;
  frameId?: string | null;
  rebelRank?: number;
  isOfficial?: boolean;
  emailVerified?: boolean;
  bannedAt?: string | null;
  banReason?: string | null;
  createdAt?: string;
  lastSeenAt?: string | null;
}

export interface AdminUserDetail extends AdminUser {
  stats: {
    projects: number;
    posts: number;
    followers: number;
    following: number;
    reportsAgainst: number;
  };
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export type AdminContentType = "post" | "project" | "comment" | "asset" | "track" | "playlist";

export interface AdminContentItem {
  id: number;
  title: string;
  thumbUrl?: string | null;
  author?: ProjectOwner | null;
  subtitle?: string | null;
  createdAt?: string;
  pin?: boolean;
}

export interface AdminContentResponse {
  type: AdminContentType;
  items: AdminContentItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminPost {
  id: number;
  content: string;
  imageUrl?: string | null;
  isPinned: boolean;
  createdAt: string;
}

export interface AdminPostsResponse {
  posts: AdminPost[];
}

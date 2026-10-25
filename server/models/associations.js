const User = require("./User");
const Project = require("./Project");
const Media = require("./Media");
const Session = require("./Session");
const Version = require("./Version");
const Branch = require("./Branch");
const Collab = require("./Collab");
const File = require("./File");
const Comment = require("./Comment");
const App = require("./App");
const Asset = require("./Asset");
const AssetLike = require("./AssetLike");
const Order = require("./Order");
const Track = require("./Track");
const TrackLike = require("./TrackLike");
const Playlist = require("./Playlist");
const PlaylistTrack = require("./PlaylistTrack");
const Follow = require("./Follow");
const Friendship = require("./Friendship");
const Conversation = require("./Conversation");
const ConversationMember = require("./ConversationMember");
const EmailToken = require("./EmailToken");
const Message = require("./Message");
const MessageReaction = require("./MessageReaction");
const Like = require("./Like");
const Notification = require("./Notification");
const Post = require("./Post");
const PostLike = require("./PostLike");
const PostComment = require("./PostComment");
const Report = require("./Report");
const Block = require("./Block");
const Mute = require("./Mute");
const Room = require("./Room");
const RoomMember = require("./RoomMember");
const RoomMessage = require("./RoomMessage");
const Challenge = require("./Challenge");
const ChallengeEntry = require("./ChallengeEntry");
const ChallengeVote = require("./ChallengeVote");
const Setting = require("./Setting");

// User → Project
User.hasMany(Project, { foreignKey: 'UserId', as: 'projects' });
Project.belongsTo(User, { foreignKey: 'UserId', as: 'owner' });

// Project → Media
Project.hasMany(Media, { foreignKey: "ProjectId" });
Media.belongsTo(Project, { foreignKey: "ProjectId" });

// User → Media (опционально)
User.hasMany(Media);
Media.belongsTo(User);

// User → Sessions
User.hasMany(Session, { foreignKey: 'userId' });
Session.belongsTo(User, { foreignKey: 'userId' });

// Project → Sessions
Project.hasMany(Session, { foreignKey: 'projectId' });
Session.belongsTo(Project, { foreignKey: 'projectId' });

// Project → Versions
Project.hasMany(Version, { foreignKey: 'projectId' });
Version.belongsTo(Project, { foreignKey: 'projectId' });

// Version → parent Version (self-reference)
Version.belongsTo(Version, { as: 'parentVersion', foreignKey: 'parentVersionId' });
Version.hasMany(Version, { as: 'children', foreignKey: 'parentVersionId' });

// User → Versions (author)
User.hasMany(Version, { foreignKey: 'authorId', as: 'versions' });
Version.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

// Project → Branches
Project.hasMany(Branch, { foreignKey: 'projectId' });
Branch.belongsTo(Project, { foreignKey: 'projectId' });

// Branch → Version (pointer)
Branch.belongsTo(Version, { foreignKey: 'versionId' });

// Project → Collabs
Project.hasMany(Collab, { foreignKey: 'projectId' });
Collab.belongsTo(Project, { foreignKey: 'projectId' });

// User → Collabs
User.hasMany(Collab, { foreignKey: 'userId' });
Collab.belongsTo(User, { foreignKey: 'userId' });
Collab.belongsTo(User, { as: 'inviter', foreignKey: 'invitedById' });

// Project → Files
Project.hasMany(File, { foreignKey: 'projectId' });
File.belongsTo(Project, { foreignKey: 'projectId' });

// Version → Files
Version.hasMany(File, { foreignKey: 'versionId' });
File.belongsTo(Version, { foreignKey: 'versionId' });

// Project → Comments
Project.hasMany(Comment, { foreignKey: 'projectId' });
Comment.belongsTo(Project, { foreignKey: 'projectId' });

// Version → Comments
Version.hasMany(Comment, { foreignKey: 'versionId' });
Comment.belongsTo(Version, { foreignKey: 'versionId' });

// User → Comments
User.hasMany(Comment, { foreignKey: 'userId' });
Comment.belongsTo(User, { foreignKey: 'userId' });

// Comment → replies (self-reference)
Comment.belongsTo(Comment, { as: 'parent', foreignKey: 'parentId' });
Comment.hasMany(Comment, { as: 'replies', foreignKey: 'parentId' });

// User → Apps
User.hasMany(App, { foreignKey: 'userId' });
App.belongsTo(User, { foreignKey: 'userId' });

// User → Assets (marketplace)
User.hasMany(Asset, { foreignKey: 'UserId', as: 'assets' });
Asset.belongsTo(User, { foreignKey: 'UserId', as: 'author' });

// Лайки ассетов
User.hasMany(AssetLike, { foreignKey: 'userId' });
AssetLike.belongsTo(User, { foreignKey: 'userId' });
Asset.hasMany(AssetLike, { foreignKey: 'assetId' });
AssetLike.belongsTo(Asset, { foreignKey: 'assetId' });

// Подписки (self-referential)
Follow.belongsTo(User, { as: 'follower', foreignKey: 'followerId' });
Follow.belongsTo(User, { as: 'following', foreignKey: 'followingId' });
User.hasMany(Follow, { as: 'followingLinks', foreignKey: 'followerId' });
User.hasMany(Follow, { as: 'followerLinks', foreignKey: 'followingId' });

// Лайки проектов
User.hasMany(Like, { foreignKey: 'userId' });
Like.belongsTo(User, { foreignKey: 'userId' });
Project.hasMany(Like, { foreignKey: 'projectId' });
Like.belongsTo(Project, { foreignKey: 'projectId' });

// Уведомления
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { as: 'actor', foreignKey: 'actorId' });
Notification.belongsTo(Project, { foreignKey: 'projectId' });

// Посты в ленте
User.hasMany(Post, { foreignKey: 'userId' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'author' });
Post.belongsTo(Project, { foreignKey: 'projectId' });
Project.hasMany(Post, { foreignKey: 'projectId' });

// Лайки постов
User.hasMany(PostLike, { foreignKey: 'userId' });
PostLike.belongsTo(User, { foreignKey: 'userId' });
Post.hasMany(PostLike, { foreignKey: 'postId' });
PostLike.belongsTo(Post, { foreignKey: 'postId' });

// Комментарии постов
User.hasMany(PostComment, { foreignKey: 'userId' });
PostComment.belongsTo(User, { foreignKey: 'userId', as: 'author' });
Post.hasMany(PostComment, { foreignKey: 'postId', as: 'comments' });
PostComment.belongsTo(Post, { foreignKey: 'postId' });
PostComment.belongsTo(PostComment, { as: 'parent', foreignKey: 'parentId' });
PostComment.hasMany(PostComment, { as: 'replies', foreignKey: 'parentId' });

// Друзья (заявки с подтверждением)
User.hasMany(Friendship, { foreignKey: 'requesterId', as: 'friendRequestsSent' });
User.hasMany(Friendship, { foreignKey: 'addresseeId', as: 'friendRequestsReceived' });
Friendship.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });
Friendship.belongsTo(User, { foreignKey: 'addresseeId', as: 'addressee' });

// Личные сообщения (1:1)
User.hasMany(Conversation, { foreignKey: 'userAId', as: 'conversationsA' });
User.hasMany(Conversation, { foreignKey: 'userBId', as: 'conversationsB' });
Conversation.belongsTo(User, { foreignKey: 'userAId', as: 'userA', constraints: false });
Conversation.belongsTo(User, { foreignKey: 'userBId', as: 'userB', constraints: false });
Conversation.belongsTo(User, { foreignKey: 'ownerId', as: 'owner', constraints: false });

// Участники диалогов (direct + group)
Conversation.hasMany(ConversationMember, { foreignKey: 'conversationId', as: 'members' });
ConversationMember.belongsTo(Conversation, { foreignKey: 'conversationId' });
ConversationMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(ConversationMember, { foreignKey: 'userId', as: 'conversationMemberships' });

Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(Message, { foreignKey: 'replyToId', as: 'replyTo' });

// Реакции на сообщения
Message.hasMany(MessageReaction, { foreignKey: 'messageId', as: 'reactions' });
MessageReaction.belongsTo(Message, { foreignKey: 'messageId' });
MessageReaction.belongsTo(User, { foreignKey: 'userId' });

// Жалобы / блокировки / мьюты (модерация)
Report.belongsTo(User, { as: 'reporter', foreignKey: 'reporterId' });
Report.belongsTo(User, { as: 'resolver', foreignKey: 'resolvedById' });
User.hasMany(Report, { foreignKey: 'reporterId', as: 'reportsMade' });

Block.belongsTo(User, { as: 'blocker', foreignKey: 'blockerId' });
Block.belongsTo(User, { as: 'blocked', foreignKey: 'blockedId' });
User.hasMany(Block, { foreignKey: 'blockerId', as: 'blocksMade' });

Mute.belongsTo(User, { as: 'muter', foreignKey: 'userId' });
Mute.belongsTo(User, { as: 'muted', foreignKey: 'mutedUserId' });
User.hasMany(Mute, { foreignKey: 'userId', as: 'mutesMade' });

// Одноразовые email-токены (подтверждение почты / сброс пароля)
User.hasMany(EmailToken, { foreignKey: 'userId', as: 'emailTokens' });
EmailToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Заказы маркетплейса (покупка платных ассетов)
Order.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
Order.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
Order.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });
User.hasMany(Order, { foreignKey: 'buyerId', as: 'purchases' });
User.hasMany(Order, { foreignKey: 'sellerId', as: 'sales' });
Asset.hasMany(Order, { foreignKey: 'assetId', as: 'orders' });

// Треки (музыкальная библиотека)
User.hasMany(Track, { foreignKey: 'UserId', as: 'tracks' });
Track.belongsTo(User, { foreignKey: 'UserId', as: 'owner' });

// Лайки треков
User.hasMany(TrackLike, { foreignKey: 'userId' });
TrackLike.belongsTo(User, { foreignKey: 'userId' });
Track.hasMany(TrackLike, { foreignKey: 'trackId', as: 'likes' });
TrackLike.belongsTo(Track, { foreignKey: 'trackId' });

// Плейлисты
User.hasMany(Playlist, { foreignKey: 'UserId', as: 'playlists' });
Playlist.belongsTo(User, { foreignKey: 'UserId', as: 'owner' });

// Треки в плейлистах (M:N через PlaylistTrack)
Playlist.hasMany(PlaylistTrack, { foreignKey: 'PlaylistId', as: 'items' });
PlaylistTrack.belongsTo(Playlist, { foreignKey: 'PlaylistId' });
PlaylistTrack.belongsTo(Track, { foreignKey: 'trackId', as: 'track' });
Playlist.belongsToMany(Track, {
  through: PlaylistTrack,
  foreignKey: 'PlaylistId',
  otherKey: 'trackId',
  as: 'tracks',
});
Track.belongsToMany(Playlist, {
  through: PlaylistTrack,
  foreignKey: 'trackId',
  otherKey: 'PlaylistId',
  as: 'playlists',
});

// Комнаты совместного прослушивания
User.hasMany(Room, { foreignKey: 'hostId', as: 'hostedRooms' });
Room.belongsTo(User, { foreignKey: 'hostId', as: 'host' });

Room.hasMany(RoomMember, { foreignKey: 'roomId', as: 'members' });
RoomMember.belongsTo(Room, { foreignKey: 'roomId' });
RoomMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(RoomMember, { foreignKey: 'userId', as: 'roomMemberships' });

Room.hasMany(RoomMessage, { foreignKey: 'roomId', as: 'messages' });
RoomMessage.belongsTo(Room, { foreignKey: 'roomId' });
RoomMessage.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// Челленджи (конкурсы работ)
Challenge.belongsTo(User, { foreignKey: 'createdById', as: 'creator' });
User.hasMany(Challenge, { foreignKey: 'createdById', as: 'challengesCreated' });

Challenge.hasMany(ChallengeEntry, { foreignKey: 'challengeId', as: 'entries' });
ChallengeEntry.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge' });

ChallengeEntry.belongsTo(User, { foreignKey: 'userId', as: 'author' });
User.hasMany(ChallengeEntry, { foreignKey: 'userId', as: 'challengeEntries' });

ChallengeEntry.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

ChallengeEntry.hasMany(ChallengeVote, { foreignKey: 'entryId', as: 'votes' });
ChallengeVote.belongsTo(ChallengeEntry, { foreignKey: 'entryId', as: 'entry' });
ChallengeVote.belongsTo(User, { foreignKey: 'userId', as: 'voter' });
User.hasMany(ChallengeVote, { foreignKey: 'userId', as: 'challengeVotes' });

module.exports = {
  Track,
  TrackLike,
  Playlist,
  PlaylistTrack,
  User,
  Project,
  Media,
  Session,
  Version,
  Branch,
  Collab,
  File,
  Comment,
  App,
  Asset,
  AssetLike,
  Follow,
  Like,
  Notification,
  MessageReaction,
  Post,
  PostLike,
  PostComment,
  Friendship,
  Conversation,
  ConversationMember,
  Message,
  Report,
  Block,
  Mute,
  EmailToken,
  Order,
  Room,
  RoomMember,
  RoomMessage,
  Challenge,
  ChallengeEntry,
  ChallengeVote,
  Setting,
};
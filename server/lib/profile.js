const Project = require("../models/Project");
const Like = require("../models/Like");
const Post = require("../models/Post");
const PostLike = require("../models/PostLike");
const PostComment = require("../models/PostComment");
const Comment = require("../models/Comment");
const Follow = require("../models/Follow");
const Version = require("../models/Version");
const Asset = require("../models/Asset");
const Session = require("../models/Session");
const ChallengeEntry = require("../models/ChallengeEntry");
const { evaluate } = require("./achievements");

// XP и уровни. Каждый следующий уровень дороже «квадратично".
const XP_STEP = 120;

function levelFromXp(xp) {
  const level = Math.floor(Math.sqrt(xp / XP_STEP)) + 1;
  const currentStart = XP_STEP * Math.pow(level - 1, 2);
  const nextStart = XP_STEP * Math.pow(level, 2);
  return {
    level,
    xp,
    levelStart: currentStart,
    nextLevelXp: nextStart,
    xpToNext: Math.max(0, nextStart - xp),
    progress: nextStart > currentStart ? (xp - currentStart) / (nextStart - currentStart) : 0,
  };
}

async function computeProfileStats(userId) {
  const id = Number(userId);

  const [
    projectsPublished,
    postsCreated,
    followers,
    following,
    likesReceived,
    postLikesReceived,
    commentsMade,
    commentsReceived,
    versionsCreated,
    assetsUploaded,
    sessionSeconds,
    challengeEntries,
    challengeVotesReceived,
  ] = await Promise.all([
    Project.count({ where: { UserId: id, visibility: "PUBLIC", publishedAt: { not: null } } }),
    Post.count({ where: { userId: id } }),
    Follow.count({ where: { followingId: id } }),
    Follow.count({ where: { followerId: id } }),
    Like.count({ include: [{ model: Project, where: { UserId: id }, attributes: [] }] }),
    PostLike.count({ include: [{ model: Post, where: { userId: id }, attributes: [] }] }),
    Comment.count({ where: { userId: id } }),
    Comment.count({ include: [{ model: Project, where: { UserId: id }, attributes: [] }] }),
    Version.count({ where: { authorId: id } }),
    Asset.count({ where: { UserId: id } }),
    Session.sum("durationSeconds", { where: { userId: id } }),
    ChallengeEntry.count({ where: { userId: id } }),
    ChallengeEntry.sum("votesCount", { where: { userId: id } }),
  ]);

  const sessionHours = Math.floor((sessionSeconds || 0) / 3600);
  const challengeVotes = challengeVotesReceived || 0;

  const xp =
    projectsPublished * 60 +
    (likesReceived || 0) * 6 +
    (postLikesReceived || 0) * 4 +
    (followers || 0) * 12 +
    (commentsReceived || 0) * 3 +
    (commentsMade || 0) * 2 +
    (challengeEntries || 0) * 8 +
    challengeVotes * 5;

  const stats = {
    projectsPublished,
    postsCreated,
    followers,
    following,
    likesReceived,
    postLikesReceived,
    commentsMade,
    commentsReceived,
    versionsCreated,
    assetsUploaded,
    sessionHours,
    challengeEntries,
    challengeVotesReceived: challengeVotes,
    xp,
  };

  return {
    raw: stats,
    xp,
    ...levelFromXp(xp),
    achievements: evaluate({
      projectsPublished,
      postsCreated,
      followers,
      likesReceived,
      likesReceivedAll: (likesReceived || 0) + (postLikesReceived || 0),
      commentsMade,
      versionsCreated,
      assetsUploaded,
      sessionHours,
      challengeEntries,
      challengeVotesReceived: challengeVotes,
    }),
  };
}

module.exports = { computeProfileStats, levelFromXp };

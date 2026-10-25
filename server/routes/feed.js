const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const auth = require("../middleware/auth");
const Project = require("../models/Project");
const Post = require("../models/Post");
const User = require("../models/User");
const Follow = require("../models/Follow");
const sequelize = require("../db");
const { getHiddenUserIds } = require("../lib/moderation");

const OWNER = { model: User, as: "owner", attributes: ["id", "username", "avatarUrl"] };
const AUTHOR = { model: User, as: "author", attributes: ["id", "username", "avatarUrl", "isOfficial"] };
const LINKED_PROJECT = { model: Project, attributes: ["id", "title", "coverUrl", "visibility"] };

// GET /api/feed?scope=all|following
// Единая лента: опубликованные проекты + посты, отсортированные по времени.
router.get("/", auth, async (req, res) => {
  try {
    const scope = req.query.scope === "following" ? "following" : "all";
    const hidden = await getHiddenUserIds(req.user.id);

    let authorIds = null;
    if (scope === "following") {
      const follows = await Follow.findAll({
        where: { followerId: req.user.id },
        attributes: ["followingId"],
      });
      authorIds = follows
        .map((f) => f.followingId)
        .filter((id) => !hidden.includes(id));
      if (authorIds.length === 0) return res.json([]);
    }

    const projectWhere = { visibility: "PUBLIC", publishedAt: { [Op.not]: null } };
    const postWhere = {};
    if (authorIds) {
      projectWhere.UserId = { [Op.in]: authorIds };
      postWhere.userId = { [Op.in]: authorIds };
    } else if (hidden.length) {
      projectWhere.UserId = { [Op.notIn]: hidden };
      postWhere.userId = { [Op.notIn]: hidden };
    }

    const [projects, posts] = await Promise.all([
      Project.findAll({
        where: projectWhere,
        include: [OWNER],
        attributes: {
          include: [
            [sequelize.literal('(SELECT COUNT(*) FROM Likes WHERE Likes.projectId = Project.id)'), "likesCount"],
            [sequelize.literal('(SELECT COUNT(*) FROM Comments WHERE Comments.projectId = Project.id)'), "commentCount"],
            [sequelize.literal('(SELECT COUNT(*) FROM Media WHERE Media.ProjectId = Project.id)'), "mediaCount"],
          ],
        },
        order: [["publishedAt", "DESC"]],
        limit: 50,
      }),
      Post.findAll({
        where: postWhere,
        include: [AUTHOR, LINKED_PROJECT],
        attributes: {
          include: [
            [sequelize.literal('(SELECT COUNT(*) FROM PostLikes WHERE PostLikes.postId = Post.id)'), "likesCount"],
            [sequelize.literal('(SELECT COUNT(*) FROM PostComments WHERE PostComments.postId = Post.id)'), "commentsCount"],
            [
              sequelize.literal(
                `EXISTS(SELECT 1 FROM PostLikes WHERE PostLikes.postId = Post.id AND PostLikes.userId = ${Number(req.user.id)})`
              ),
              "isLiked",
            ],
          ],
        },
        order: [["isPinned", "DESC"], ["createdAt", "DESC"]],
        limit: 50,
      }),
    ]);

    const items = [
      ...projects.map((p) => ({
        type: "project",
        id: `project-${p.id}`,
        createdAt: p.publishedAt || p.updatedAt,
        project: p,
      })),
      ...posts.map((p) => ({
        type: "post",
        id: `post-${p.id}`,
        createdAt: p.createdAt,
        post: p,
      })),
    ]
      .sort((a, b) => {
        const pinA = a.type === "post" && a.post?.isPinned ? 1 : 0;
        const pinB = b.type === "post" && b.post?.isPinned ? 1 : 0;
        if (pinA !== pinB) return pinB - pinA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 60);

    res.json(items);
  } catch (err) {
    console.error("Ошибка получения ленты:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;

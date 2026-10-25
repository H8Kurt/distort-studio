const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const auth = require("../middleware/auth");
const sequelize = require("../db");
const Post = require("../models/Post");
const PostLike = require("../models/PostLike");
const PostComment = require("../models/PostComment");
const Project = require("../models/Project");
const User = require("../models/User");
const { notify } = require("../lib/notify");
const { getHiddenUserIds } = require("../lib/moderation");

const AUTHOR = { model: User, as: "author", attributes: ["id", "username", "avatarUrl", "isOfficial"] };
const LINKED_PROJECT = {
  model: Project,
  attributes: ["id", "title", "coverUrl", "visibility", "publishedAt"],
};

function countAttrs(userId) {
  return {
    include: [
      [sequelize.literal('(SELECT COUNT(*) FROM PostLikes WHERE PostLikes.postId = Post.id)'), "likesCount"],
      [sequelize.literal('(SELECT COUNT(*) FROM PostComments WHERE PostComments.postId = Post.id)'), "commentsCount"],
      [
        sequelize.literal(
          `EXISTS(SELECT 1 FROM PostLikes WHERE PostLikes.postId = Post.id AND PostLikes.userId = ${Number(userId)})`
        ),
        "isLiked",
      ],
    ],
  };
}

// GET /api/posts?userId= — посты (лента или профиль)
router.get("/", auth, async (req, res) => {
  try {
    const where = {};
    const hidden = await getHiddenUserIds(req.user.id);
    if (req.query.userId) {
      const uid = Number(req.query.userId);
      if (uid !== req.user.id && hidden.includes(uid)) return res.json([]);
      where.userId = uid;
    } else if (hidden.length) {
      where.userId = { [Op.notIn]: hidden };
    }

    const posts = await Post.findAll({
      where,
      include: [AUTHOR, LINKED_PROJECT],
      attributes: countAttrs(req.user.id),
      order: [["isPinned", "DESC"], ["createdAt", "DESC"]],
      limit: 50,
    });
    res.json(posts);
  } catch (err) {
    console.error("Ошибка получения постов:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/posts — создать пост
router.post("/", auth, async (req, res) => {
  try {
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    const projectId = req.body.projectId ? Number(req.body.projectId) : null;
    const imageUrl = typeof req.body.imageUrl === "string" && req.body.imageUrl ? req.body.imageUrl : null;
    const thumbUrl = typeof req.body.thumbUrl === "string" ? req.body.thumbUrl : null;
    const imageWidth = req.body.imageWidth ? Number(req.body.imageWidth) : null;
    const imageHeight = req.body.imageHeight ? Number(req.body.imageHeight) : null;

    if (!content && !projectId && !imageUrl) {
      return res.status(400).json({ error: "Введите текст поста" });
    }

    if (projectId) {
      const project = await Project.findOne({ where: { id: projectId, UserId: req.user.id } });
      if (!project) return res.status(404).json({ error: "Проект не найден" });
    }

    const post = await Post.create({
      userId: req.user.id,
      content: content || (imageUrl ? "" : "Поделился проектом"),
      projectId: projectId || null,
      imageUrl: imageUrl || null,
      thumbUrl: req.body.thumbUrl ? String(thumbUrl) : null,
      imageWidth: Number.isFinite(Number(req.body.imageWidth)) ? Number(req.body.imageWidth) : null,
      imageHeight: Number.isFinite(Number(req.body.imageHeight)) ? Number(req.body.imageHeight) : null,
    });

    const full = await Post.findByPk(post.id, {
      include: [AUTHOR, LINKED_PROJECT],
      attributes: countAttrs(req.user.id),
    });

    const io = req.app.get("io");
    if (io) io.emit("post:created", full);

    res.status(201).json(full);
  } catch (err) {
    console.error("Ошибка создания поста:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/posts/:id/like
router.post("/:id/like", auth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: "Пост не найден" });

    const [, created] = await PostLike.findOrCreate({ where: { userId: req.user.id, postId: post.id } });
    const likesCount = await PostLike.count({ where: { postId: post.id } });

    if (created && post.userId !== req.user.id) {
      await notify(req.app, {
        userId: post.userId,
        actorId: req.user.id,
        type: "post_like",
        postId: post.id,
        message: "оценил ваш пост",
      });
    }

    const io = req.app.get("io");
    if (io) io.emit("post:liked", { postId: post.id, likesCount });

    res.json({ isLiked: true, likesCount });
  } catch (err) {
    console.error("Ошибка лайка поста:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// DELETE /api/posts/:id/like
router.delete("/:id/like", auth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: "Пост не найден" });

    await PostLike.destroy({ where: { userId: req.user.id, postId: post.id } });
    const likesCount = await PostLike.count({ where: { postId: post.id } });

    const io = req.app.get("io");
    if (io) io.emit("post:liked", { postId: post.id, likesCount });

    res.json({ isLiked: false, likesCount });
  } catch (err) {
    console.error("Ошибка снятия лайка:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET /api/posts/:id/comments
router.get("/:id/comments", auth, async (req, res) => {
  try {
    const rows = await PostComment.findAll({
      where: { postId: Number(req.params.id) },
      include: [AUTHOR],
      order: [["createdAt", "ASC"]],
    });
    res.json(rows);
  } catch (err) {
    console.error("Ошибка получения комментариев поста:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/posts/:id/comments
router.post("/:id/comments", auth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: "Пост не найден" });

    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!content) return res.status(400).json({ error: "Введите комментарий" });

    const parentId = req.body.parentId ? Number(req.body.parentId) : null;
    let parent = null;
    if (parentId) {
      parent = await PostComment.findOne({ where: { id: parentId, postId: post.id } });
      if (!parent) return res.status(404).json({ error: "Комментарий не найден" });
    }

    const comment = await PostComment.create({
      postId: post.id,
      userId: req.user.id,
      parentId,
      content,
    });

    const full = await PostComment.findByPk(comment.id, { include: [AUTHOR] });

    await notify(req.app, {
      userId: post.userId,
      actorId: req.user.id,
      type: "post_comment",
      postId: post.id,
      commentId: comment.id,
      message: "прокомментировал ваш пост",
    });
    if (parent && parent.userId !== post.userId) {
      await notify(req.app, {
        userId: parent.userId,
        actorId: req.user.id,
        type: "post_comment",
        postId: post.id,
        commentId: comment.id,
        message: "ответил на ваш комментарий",
      });
    }

    const io = req.app.get("io");
    if (io) io.emit("postcomment:created", { postId: post.id, comment: full });

    res.status(201).json(full);
  } catch (err) {
    console.error("Ошибка создания комментария поста:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// DELETE /api/posts/:id/comments/:commentId
router.delete("/:id/comments/:commentId", auth, async (req, res) => {
  try {
    const comment = await PostComment.findOne({
      where: { id: req.params.commentId, postId: req.params.id },
    });
    if (!comment) return res.status(404).json({ error: "Комментарий не найден" });

    const post = await Post.findByPk(comment.postId);
    const canDelete =
      comment.userId === req.user.id ||
      req.user.role === "admin" ||
      (post && post.userId === req.user.id);
    if (!canDelete) return res.status(403).json({ error: "Нет прав" });

    await PostComment.destroy({ where: { id: comment.id } });

    const io = req.app.get("io");
    if (io) io.emit("postcomment:removed", { postId: comment.postId, commentId: comment.id });

    res.json({ success: true });
  } catch (err) {
    console.error("Ошибка удаления комментария поста:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// DELETE /api/posts/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: "Пост не найден" });

    if (post.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Нет прав для удаления" });
    }

    await PostComment.destroy({ where: { postId: post.id } });
    await PostLike.destroy({ where: { postId: post.id } });
    await post.destroy();

    const io = req.app.get("io");
    if (io) io.emit("post:deleted", { id: post.id });

    res.json({ success: true });
  } catch (err) {
    console.error("Ошибка удаления поста:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;

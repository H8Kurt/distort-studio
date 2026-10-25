const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { commentSchema } = require("../lib/validators");
const { notify } = require("../lib/notify");
const Project = require("../models/Project");
const Comment = require("../models/Comment");
const Collab = require("../models/Collab");
const User = require("../models/User");

// Хелпер проверки доступа к проекту
async function resolveAccess(req, projectId) {
  const project = await Project.findByPk(projectId);
  if (!project) return { project: null };
  const isOwner = project.UserId === req.user.id;
  const collab = await Collab.findOne({ where: { projectId, userId: req.user.id, status: "accepted" } });
  const isEditor = isOwner || (collab && (collab.role === "owner" || collab.role === "editor"));
  const canView = isEditor || project.visibility === "PUBLIC" || !!collab || req.user.role === "admin";
  return { project, isOwner, collab, isEditor, canView };
}

const AUTHOR = { model: User, attributes: ["id", "username", "avatarUrl"] };

// GET /api/projects/:id/comments — все комментарии проекта (плоский список)
router.get("/:id/comments", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { project, canView } = await resolveAccess(req, id);
    if (!project) return res.status(404).json({ error: "Проект не найден" });
    if (!canView) return res.status(403).json({ error: "Нет доступа к проекту" });

    const comments = await Comment.findAll({
      where: { projectId: id },
      include: [{ model: User, attributes: ["id", "username", "avatarUrl"] }],
      order: [["createdAt", "ASC"]],
    });
    res.json(comments);
  } catch (err) {
    console.error("Ошибка получения комментариев:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/projects/:id/comments — создать комментарий
router.post("/:id/comments", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentId, versionId } = commentSchema.parse(req.body);

    const { project, canView } = await resolveAccess(req, id);
    if (!project) return res.status(404).json({ error: "Проект не найден" });
    if (!canView) return res.status(403).json({ error: "Нет доступа к проекту" });

    if (parentId) {
      const parent = await Comment.findOne({ where: { id: parentId, projectId: id } });
      if (!parent) return res.status(404).json({ error: "Родительский комментарий не найден" });
    }

    const comment = await Comment.create({
      projectId: id,
      versionId: versionId || null,
      userId: req.user.id,
      parentId: parentId || null,
      content,
    });

    const withAuthor = await Comment.findByPk(comment.id, { include: [AUTHOR] });

    const io = req.app.get("io");
    if (io) io.to(`project_${id}`).emit("comment:created", withAuthor);

    // уведомляем владельца проекта и автора родительского комментария
    const recipients = new Set();
    if (project.UserId !== req.user.id) recipients.add(project.UserId);
    if (parentId) {
      const parent = await Comment.findByPk(parentId);
      if (parent && parent.userId !== req.user.id) recipients.add(parent.userId);
    }
    await Promise.all(
      [...recipients].map((userId) =>
        notify(req.app, {
          userId,
          actorId: req.user.id,
          type: "comment",
          projectId: Number(id),
          commentId: comment.id,
          message: "оставил комментарий",
        })
      )
    );

    res.status(201).json(withAuthor);
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Ошибка валидации", details: err.errors });
    }
    console.error("Ошибка создания комментария:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// DELETE /api/projects/:id/comments/:commentId — удалить комментарий
router.delete("/:id/comments/:commentId", auth, async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { project, isEditor } = await resolveAccess(req, id);
    if (!project) return res.status(404).json({ error: "Проект не найден" });

    const comment = await Comment.findOne({ where: { id: commentId, projectId: id } });
    if (!comment) return res.status(404).json({ error: "Комментарий не найден" });

    const isAuthor = comment.userId === req.user.id;
    if (!isAuthor && !isEditor) {
      return res.status(403).json({ error: "Нет прав для удаления" });
    }

    await comment.destroy();

    const io = req.app.get("io");
    if (io) io.to(`project_${id}`).emit("comment:removed", { id: commentId });

    res.json({ success: true });
  } catch (err) {
    console.error("Ошибка удаления комментария:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;

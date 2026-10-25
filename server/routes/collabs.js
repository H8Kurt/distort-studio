const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const Project = require("../models/Project");
const Collab = require("../models/Collab");
const { notify } = require("../lib/notify");

function shapeInvite(c) {
  return {
    id: c.id,
    projectId: c.projectId,
    role: c.role,
    status: c.status,
    createdAt: c.createdAt,
    project: c.Project
      ? { id: c.Project.id, title: c.Project.title, visibility: c.Project.visibility }
      : null,
    inviter: c.inviter
      ? { id: c.inviter.id, username: c.inviter.username, avatarUrl: c.inviter.avatarUrl || null }
      : null,
  };
}

const INVITE_INCLUDE = [
  { model: Project, attributes: ["id", "title", "visibility"] },
  { model: User, as: "inviter", attributes: ["id", "username", "avatarUrl"] },
];

// GET /api/collabs/projects — совместные проекты (принятые, не свои)
router.get("/projects", auth, async (req, res) => {
  try {
    const rows = await Collab.findAll({
      where: { userId: req.user.id, status: "accepted" },
      include: [
        {
          model: Project,
          attributes: ["id", "title", "description", "visibility", "coverUrl", "updatedAt", "UserId"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    const projects = rows
      .filter((c) => c.Project && c.Project.UserId !== req.user.id)
      .map((c) => ({ ...c.Project.toJSON(), role: c.role }));
    res.json(projects);
  } catch (err) {
    console.error("Ошибка получения совместных проектов:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET /api/collabs — входящие приглашения (pending)
router.get("/", auth, async (req, res) => {
  try {
    const invites = await Collab.findAll({
      where: { userId: req.user.id, status: "pending" },
      include: INVITE_INCLUDE,
      order: [["createdAt", "DESC"]],
    });
    res.json(invites.map(shapeInvite));
  } catch (err) {
    console.error("Ошибка получения приглашений:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

async function acceptInvite(req, res, where) {
  const collab = await Collab.findOne({ where: { ...where, userId: req.user.id, status: "pending" } });
  if (!collab) return res.status(404).json({ error: "Приглашение не найдено" });

  collab.status = "accepted";
  await collab.save();

  const project = await Project.findByPk(collab.projectId, { attributes: ["id", "title"] });
  if (collab.invitedById) {
    await notify(req.app, {
      userId: collab.invitedById,
      actorId: req.user.id,
      type: "collab_accept",
      projectId: collab.projectId,
      message: `принял(а) приглашение в проект «${project ? project.title : ""}»`,
    });
  }

  const io = req.app.get("io");
  if (io) io.to(`project_${collab.projectId}`).emit("collab:added", collab);

  res.json(collab);
}

async function declineInvite(req, res, where) {
  const collab = await Collab.findOne({ where: { ...where, userId: req.user.id, status: "pending" } });
  if (!collab) return res.status(404).json({ error: "Приглашение не найдено" });

  const projectId = collab.projectId;
  await collab.destroy();

  const io = req.app.get("io");
  if (io) io.to(`project_${projectId}`).emit("collab:removed", { userId: req.user.id });

  res.json({ status: "declined" });
}

// POST /api/collabs/:id/accept — принять приглашение (по id коллаборации)
router.post("/:id/accept", auth, async (req, res) => {
  try {
    await acceptInvite(req, res, { id: req.params.id });
  } catch (err) {
    console.error("Ошибка принятия приглашения:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/collabs/:id/decline — отклонить приглашение
router.post("/:id/decline", auth, async (req, res) => {
  try {
    await declineInvite(req, res, { id: req.params.id });
  } catch (err) {
    console.error("Ошибка отклонения приглашения:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/collabs/project/:projectId/accept — принять по проекту (для уведомлений)
router.post("/project/:projectId/accept", auth, async (req, res) => {
  try {
    await acceptInvite(req, res, { projectId: req.params.projectId });
  } catch (err) {
    console.error("Ошибка принятия приглашения:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/collabs/project/:projectId/decline — отклонить по projectId
router.post("/project/:projectId/decline", auth, async (req, res) => {
  try {
    await declineInvite(req, res, { projectId: req.params.projectId });
  } catch (err) {
    console.error("Ошибка отклонения приглашения:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;

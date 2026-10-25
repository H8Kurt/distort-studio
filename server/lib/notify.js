const Notification = require("../models/Notification");
const User = require("../models/User");

/**
 * Создаёт уведомление получателю и пушит его в персональную socket-комнату.
 * Не создаёт уведомление самому себе.
 * @param {import("express").Application} app
 * @param {object} opts
 */
async function notify(app, { userId, actorId, type, projectId, postId, commentId, message }) {
  if (!userId || !actorId || userId === actorId) return null;
  try {
    const notification = await Notification.create({
      userId,
      actorId,
      type,
      projectId: projectId || null,
      postId: postId || null,
      commentId: commentId || null,
      message: message || null,
    });

    const actor = await User.findByPk(actorId, {
      attributes: ["id", "username", "avatarUrl"],
    });

    const payload = { ...notification.toJSON(), actor };
    const io = app.get("io");
    if (io) io.to(`user_${userId}`).emit("notification:new", payload);
    return payload;
  } catch (err) {
    console.error("Ошибка создания уведомления:", err);
    return null;
  }
}

module.exports = { notify };

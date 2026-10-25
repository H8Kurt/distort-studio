const { Op } = require("sequelize");
const Block = require("../models/Block");
const Mute = require("../models/Mute");

/**
 * ID пользователей, связанных с userId взаимной блокировкой (в обе стороны).
 */
async function getBlockedIds(userId) {
  if (!userId) return [];
  const rows = await Block.findAll({
    where: { [Op.or]: [{ blockerId: userId }, { blockedId: userId }] },
    attributes: ["blockerId", "blockedId"],
  });
  const set = new Set();
  for (const r of rows) {
    set.add(r.blockerId === userId ? r.blockedId : r.blockerId);
  }
  return [...set];
}

/**
 * ID пользователей, замьюченных пользователем userId.
 */
async function getMutedIds(userId) {
  if (!userId) return [];
  const rows = await Mute.findAll({ where: { userId }, attributes: ["mutedUserId"] });
  return rows.map((r) => r.mutedUserId);
}

/**
 * Все ID, чей контент нужно скрывать в лентах/поиске/discover для userId:
 * заблокированные (в обе стороны) + замьюченные.
 */
async function getHiddenUserIds(userId) {
  const [blocked, muted] = await Promise.all([getBlockedIds(userId), getMutedIds(userId)]);
  return [...new Set([...blocked, ...muted])];
}

/**
 * Есть ли блокировка между a и b в любую сторону.
 */
async function isBlockedBetween(a, b) {
  if (!a || !b || a === b) return false;
  const row = await Block.findOne({
    where: {
      [Op.or]: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  return !!row;
}

module.exports = { getBlockedIds, getMutedIds, getHiddenUserIds, isBlockedBetween };

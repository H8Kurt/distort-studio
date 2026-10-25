const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Project = sequelize.define("Project", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  coverUrl: DataTypes.STRING,
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const raw = this.getDataValue('tags');
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) return [];
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          /* не JSON — список через запятую */
        }
        return trimmed.split(',').map((t) => t.trim()).filter(Boolean);
      }
      return [];
    }
  },
  visibility: {
    type: DataTypes.ENUM('PRIVATE', 'PUBLIC', 'TEAM'),
    defaultValue: 'PRIVATE'
  },
  // Момент публикации в ленту (null = не опубликован)
  publishedAt: {
    type: DataTypes.DATE,
    defaultValue: null
  },
  // Родословная форков: от какого проекта отпочковались и корень дерева
  forkedFromId: {
    type: DataTypes.INTEGER,
    defaultValue: null
  },
  rootId: {
    type: DataTypes.INTEGER,
    defaultValue: null
  }
});

module.exports = Project;

const User = require("./User");
const Project = require("./Project");
const Media = require("./Media");

// User → Project
User.hasMany(Project);
Project.belongsTo(User);

// Project → Media
Project.hasMany(Media, { foreignKey: "ProjectId" });
Media.belongsTo(Project, { foreignKey: "ProjectId" });

// User → Media (опционально)
User.hasMany(Media);
Media.belongsTo(User);

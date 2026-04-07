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

module.exports = {
  User,
  Project,
  Media,
  Session,
  Version,
  Branch,
  Collab,
  File,
  Comment,
  App
};

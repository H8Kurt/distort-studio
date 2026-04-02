const User = require("./User");
const Project = require("./Project");
const Media = require("./Media");
const Session = require("./Session");
const Version = require("./Version");
const Branch = require("./Branch");
const Collab = require("./Collab");

// User → Project
User.hasMany(Project);
Project.belongsTo(User);

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

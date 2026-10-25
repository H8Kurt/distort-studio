// Каталог достижений. Каждое привязано к метрике профиля и цели.
// icon — ключ, который фронтенд сопоставляет с иконкой.
const ACHIEVEMENTS = [
  { code: "first_project", title: "Первый шаг", description: "Опубликовать первый проект", icon: "rocket", metric: "projectsPublished", goal: 1 },
  { code: "prolific", title: "Мастер сцены", description: "Опубликовать 5 проектов", icon: "fire", metric: "projectsPublished", goal: 5 },
  { code: "liked_10", title: "Замечен", description: "Получить 10 лайков", icon: "heart", metric: "likesReceived", goal: 10 },
  { code: "liked_100", title: "Кумир", description: "Получить 100 лайков", icon: "crown", metric: "likesReceived", goal: 100 },
  { code: "popular", title: "Компания", description: "Набрать 10 подписчиков", icon: "users", metric: "followers", goal: 10 },
  { code: "well_known", title: "Легенда", description: "Набрать 50 подписчиков", icon: "star", metric: "followers", goal: 50 },
  { code: "commentator", title: "Голос", description: "Оставить 10 комментариев", icon: "chat", metric: "commentsMade", goal: 10 },
  { code: "chatter", title: "Летописец", description: "Опубликовать 10 постов", icon: "pen", metric: "postsCreated", goal: 10 },
  { code: "archivist", title: "Хранитель версий", description: "Создать 10 версий", icon: "archive", metric: "versionsCreated", goal: 10 },
  { code: "curator", title: "Куратор", description: "Выложить 5 ассетов", icon: "bag", metric: "assetsUploaded", goal: 5 },
  { code: "grinder", title: "Трудяга", description: "10 часов в сессиях", icon: "clock", metric: "sessionHours", goal: 10 },
  { code: "challenger", title: "Участник", description: "Подать работу в челлендж", icon: "flag", metric: "challengeEntries", goal: 1 },
  { code: "competitor", title: "Соперник", description: "Подать 5 работ в челленджи", icon: "fire", metric: "challengeEntries", goal: 5 },
  { code: "crowd_favorite", title: "Любимец публики", description: "Собрать 25 голосов", icon: "heart", metric: "challengeVotesReceived", goal: 25 },
  { code: "champion", title: "Чемпион", description: "Собрать 100 голосов", icon: "crown", metric: "challengeVotesReceived", goal: 100 },
];

function evaluate(stats) {
  return ACHIEVEMENTS.map((a) => {
    const value = stats[a.metric] || 0;
    return {
      ...a,
      value,
      unlocked: value >= a.goal,
      progress: Math.min(1, a.goal > 0 ? value / a.goal : 0),
    };
  });
}

module.exports = { ACHIEVEMENTS, evaluate };

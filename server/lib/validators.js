const { z } = require('zod');

/**
 * User registration schema
 */
const registerSchema = z.object({
  username: z.string().min(2, 'Имя должно быть не менее 2 символов').max(50),
  email: z.string().email('Неверный формат email'),
  password: z
    .string()
    .min(8, 'Пароль должен быть не менее 8 символов')
    .regex(/[A-Za-z]/, 'Пароль должен содержать хотя бы одну букву')
    .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру'),
  avatarUrl: z.string().url().optional(),
});

/**
 * User login schema
 */
const loginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(1, 'Пароль обязателен'),
});

// Теги приходят как JSON-строка, список через запятую или массив
const tagValue = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* не JSON — парсим как список */
    }
    return trimmed.split(',').map((t) => t.trim()).filter(Boolean);
  }
  return value;
}, z.array(z.string()).optional());

const boolValue = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return Boolean(value);
}, z.boolean().optional());

/**
 * Project creation/update schema
 */
const projectSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(200),
  description: z.string().max(2000).optional(),
  coverUrl: z.string().max(1000).optional(),
  tags: tagValue,
  visibility: z.enum(['PRIVATE', 'PUBLIC', 'TEAM']).optional(),
});

const projectUpdateSchema = projectSchema.partial();

/**
 * File upload presign schema
 */
const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  mimetype: z.string().refine(
    (type) => type.startsWith('image/') || type.startsWith('audio/') || type.startsWith('video/'),
    'Неподдерживаемый тип файла'
  ),
  size: z.number().max(100 * 1024 * 1024, 'Файл слишком большой (макс. 100MB)'),
});

/**
 * Session creation schema
 */
const sessionSchema = z.object({
  projectId: z.coerce.number().int().positive('Неверный ID проекта'),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().nullish(),
  meta: z.record(z.any()).optional(),
  clientId: z.string().min(6).max(100).optional(),
});

const sessionSyncSchema = z.object({
  sessions: z
    .array(
      z.object({
        clientId: z.string().min(6).max(100),
        projectId: z.coerce.number().int().positive('Неверный ID проекта'),
        startTime: z.coerce.date(),
        endTime: z.coerce.date().nullish(),
        meta: z.record(z.any()).optional(),
      })
    )
    .max(1000),
});

/**
 * Version creation schema
 */
const versionSchema = z.object({
  message: z.string().max(500).optional(),
  storageManifest: z
    .array(
      z.object({
        path: z.string(),
        storageKey: z.string(),
        checksum: z.string(),
      })
    )
    .optional(),
  parentVersionId: z.coerce.number().int().positive().optional(),
});

/**
 * Fork creation schema
 */
const forkSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

/**
 * Collaborator addition schema
 */
const collabSchema = z.object({
  userId: z.coerce.number().int().positive('Неверный ID пользователя'),
  role: z.enum(['owner', 'editor', 'viewer']).optional(),
});

/**
 * Comment creation schema
 */
const commentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.coerce.number().int().positive().optional(),
  versionId: z.coerce.number().int().positive().optional(),
});

/**
 * Asset (marketplace) schema
 */
const assetSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(200),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().min(0, 'Цена не может быть отрицательной').optional(),
  category: z.string().max(100).optional(),
  fileType: z.enum(['image', 'video', 'audio', '3d', 'font', 'other']).optional(),
  tags: tagValue,
  isFree: boolValue,
});

const assetUpdateSchema = assetSchema.partial();

/**
 * Жалоба (модерация)
 */
const reportSchema = z.object({
  targetType: z.enum(['user', 'post', 'project', 'comment', 'message', 'asset']),
  targetId: z.coerce.number().int().positive('Неверный ID объекта'),
  reason: z.string().min(1, 'Укажите причину').max(100),
  details: z.string().max(2000).optional(),
});

const reportUpdateSchema = z.object({
  status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']).optional(),
  resolutionNote: z.string().max(2000).optional(),
});

const userStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'banned']),
  reason: z.string().max(500).optional(),
});

const emailTokenSchema = z.object({
  token: z.string().min(10, 'Неверный токен').max(200),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Неверный формат email'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Неверный токен').max(200),
  password: z
    .string()
    .min(8, 'Пароль должен быть не менее 8 символов')
    .regex(/[A-Za-z]/, 'Пароль должен содержать хотя бы одну букву')
    .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру'),
});

const orderCreateSchema = z.object({
  assetId: z.coerce.number().int().positive('Неверный ассет'),
});

const trackSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(200),
  artist: z.string().max(200).optional(),
  genre: z.string().max(100).optional(),
  duration: z.coerce.number().min(0).optional(),
  visibility: z.enum(['PRIVATE', 'PUBLIC', 'UNLISTED']).optional(),
});

const trackUpdateSchema = trackSchema.partial();

const playlistSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(200),
  description: z.string().max(2000).optional(),
  coverUrl: z.string().max(1000).optional(),
  isPublic: boolValue,
});

const playlistUpdateSchema = playlistSchema.partial();

const appSchema = z.object({
  name: z.string().min(1, 'Укажите название').max(120),
  path: z.string().min(1, 'Укажите путь').max(500),
  args: z.string().max(500).optional(),
  icon: z.string().max(500).optional(),
  projectId: z.coerce.number().int().positive().nullable().optional(),
  watchFolder: z.string().max(500).nullable().optional(),
  autoSession: z.boolean().optional(),
  autoImport: z.boolean().optional(),
});

const appUpdateSchema = appSchema.partial();

const roomSchema = z.object({
  name: z.string().min(1, 'Укажите название').max(120),
  description: z.string().max(1000).optional(),
  coverUrl: z.string().max(1000).optional(),
  isPublic: boolValue,
  mode: z.enum(['music', 'watch', 'board', 'draw']).optional(),
  trackIds: z.array(z.coerce.number().int().positive()).max(200).optional(),
});

const roomUpdateSchema = roomSchema.partial();

const roomMessageSchema = z.object({
  text: z.string().min(1, 'Пустое сообщение').max(1000),
});

const challengeSchema = z.object({
  title: z.string().min(1, 'Укажите название').max(200),
  description: z.string().max(4000).optional(),
  theme: z.string().max(100).optional(),
  coverUrl: z.string().max(1000).optional(),
  mode: z.enum(['art', 'music', 'writing', 'any']).optional(),
  startsAt: z.coerce.date().nullish(),
  endsAt: z.coerce.date().nullish(),
  status: z.enum(['draft', 'active', 'ended']).optional(),
});

const challengeUpdateSchema = challengeSchema.partial();

const challengeEntrySchema = z.object({
  title: z.string().min(1, 'Укажите название работы').max(200),
  description: z.string().max(4000).optional(),
  imageUrl: z.string().max(1000).optional(),
  projectId: z.coerce.number().int().positive().nullish(),
});

module.exports = {
  registerSchema,
  loginSchema,
  projectSchema,
  projectUpdateSchema,
  presignSchema,
  sessionSchema,
  versionSchema,
  forkSchema,
  collabSchema,
  commentSchema,
  assetSchema,
  assetUpdateSchema,
  reportSchema,
  reportUpdateSchema,
  userStatusSchema,
  emailTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  orderCreateSchema,
  sessionSyncSchema,
  trackSchema,
  trackUpdateSchema,
  playlistSchema,
  playlistUpdateSchema,
  appSchema,
  appUpdateSchema,
  roomSchema,
  roomUpdateSchema,
  roomMessageSchema,
  challengeSchema,
  challengeUpdateSchema,
  challengeEntrySchema,
};

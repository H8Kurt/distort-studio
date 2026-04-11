const { z } = require('zod');

/**
 * User registration schema
 */
const registerSchema = z.object({
  username: z.string().min(2, 'Имя должно быть не менее 2 символов').max(50),
  email: z.string().email('Неверный формат email'),
  password: z.string().min(8, 'Пароль должен быть не менее 8 символов')
    .regex(/[A-Za-z]/, 'Пароль должен содержать хотя бы одну букву')
    .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру'),
});

/**
 * User login schema
 */
const loginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(1, 'Пароль обязателен'),
});

/**
 * Project creation/update schema
 */
const projectSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(200),
  description: z.string().max(2000).optional(),
  visibility: z.enum(['PRIVATE', 'PUBLIC', 'TEAM']).optional(),
});

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
  projectId: z.string().uuid('Неверный ID проекта'),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  meta: z.record(z.any()).optional(),
});

/**
 * Version creation schema
 */
const versionSchema = z.object({
  message: z.string().max(500).optional(),
  storageManifest: z.array(z.object({
    path: z.string(),
    storageKey: z.string(),
    checksum: z.string(),
  })).optional(),
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
  userId: z.string().uuid('Неверный ID пользователя'),
  role: z.enum(['owner', 'editor', 'viewer']).optional(),
});

/**
 * Comment creation schema
 */
const commentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional(),
  versionId: z.string().uuid().optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  projectSchema,
  presignSchema,
  sessionSchema,
  versionSchema,
  forkSchema,
  collabSchema,
  commentSchema,
};

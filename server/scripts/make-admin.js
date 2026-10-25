require('dotenv').config();
const sequelize = require('../db');
const User = require('../models/User');

// Назначить/снять роль admin.
//   node scripts/make-admin.js user@example.com          → назначить
//   node scripts/make-admin.js user@example.com --revoke → снять
async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes('--revoke');

  if (!email) {
    console.error('Использование: node scripts/make-admin.js <email> [--revoke]');
    process.exit(1);
  }

  const role = revoke ? 'user' : 'admin';
  const [count] = await User.update({ role }, { where: { email } });

  if (!count) {
    console.error(`Пользователь с email "${email}" не найден.`);
    process.exit(1);
  }

  console.log(`Готово: ${email} → роль "${role}". Перелогиньтесь, чтобы обновить токен.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});

// Закрываем соединение после завершения
process.on('exit', () => {
  sequelize.close().catch(() => undefined);
});

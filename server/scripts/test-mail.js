require("dotenv").config();
const { sendMail, isConfigured } = require("../lib/mailer");

const to = process.argv[2];

if (!to) {
  console.error("Использование: npm run mail:test -- you@example.com");
  process.exit(1);
}

(async () => {
  console.log("SMTP настроен:", isConfigured());
  if (!isConfigured()) {
    console.error(
      "SMTP не настроен. Раскомментируйте SMTP_* переменные в server/.env и заполните их."
    );
    process.exit(1);
  }

  const res = await sendMail({
    to,
    subject: "Тест Distort Studio SMTP",
    text: "Если вы видите это письмо — SMTP настроен правильно.",
    html: "<h3>Distort Studio</h3><p>SMTP настроен правильно. Письмо доставлено.</p>",
  });

  console.log(res);
  process.exit(res.error ? 1 : 0);
})();

const request = require("supertest");
const app = require("../app");

describe("Auth routes", () => {
  it("Registers a user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "тестовый чувак", email: `test${Date.now()}@gmail`, password: "12345" });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});

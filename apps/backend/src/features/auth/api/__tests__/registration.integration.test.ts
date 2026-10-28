import { app } from "@/app";
import { db } from "@/config/database";
import redisClient, { connectRedis } from "@/config/redis";
import { sendVerificationEmail } from "@/utils/email";
import { generateMockToken } from "@/utils/testAuth";
import request from "supertest";

jest.mock("@/utils/email", () => ({
  ...jest.requireActual("@/utils/email"),
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));
const sendEmail = sendVerificationEmail as jest.Mock;

const user = {
  email: "no-verify-flow@example.com",
  password: "securepassword123",
  full_name: "No Verify Flow",
};
const userRow = async () =>
  (await db.query("SELECT * FROM users WHERE email = $1", [user.email]))
    .rows[0];

// Email verification is switched off: a new account works straight away.
describe("Registration without email verification", () => {
  beforeAll(async () => {
    await connectRedis();
  });

  beforeEach(async () => {
    sendEmail.mockClear();
    await db.query("DELETE FROM users WHERE email = $1", [user.email]);
  });

  afterAll(async () => {
    await db.query("DELETE FROM users WHERE email = $1", [user.email]);
    await db.end();
    await redisClient.quit();
  });

  const register = (role?: string) =>
    request(app)
      .post("/auth/register")
      .send(role ? { ...user, role } : user);

  it("creates an already-verified account and sends no email", async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body.message).not.toMatch(/verify/i);

    expect((await userRow()).email_verified_at).not.toBeNull();
    expect(sendEmail).not.toHaveBeenCalled();
    const tokens = await db.query(
      "SELECT 1 FROM email_verification_tokens WHERE user_id = $1",
      [(await userRow()).id],
    );
    expect(tokens.rows).toHaveLength(0);
  });

  it("lets a new store owner log in right away", async () => {
    expect((await register("STORE_OWNER")).status).toBe(201);

    const login = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: user.password });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("STORE_OWNER");
    expect(login.body.user.email_verified).toBe(true);
  });

  it("lets a new account use features that used to need a verified email", async () => {
    await register();
    const { id } = await userRow();
    const me = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${generateMockToken(id)}`);
    expect(me.status).toBe(200);
    expect(me.body.email_verified).toBe(true);

    // A review fails on its own validation, not on an email gate.
    const review = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${generateMockToken(id)}`)
      .send({ rating: 6 });
    expect(review.status).not.toBe(403);
  });

  it("no longer exposes the verification endpoints", async () => {
    expect(
      (await request(app).post("/auth/verify-email").send({ token: "x" }))
        .status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post("/auth/resend-verification")
          .send({ email: user.email })
      ).status,
    ).toBe(404);
  });

  it("still rejects a duplicate email", async () => {
    await register();
    expect((await register()).status).toBe(409);
  });

  it("marks accounts that were never verified as verified when the migration runs", async () => {
    await register();
    await db.query(
      "UPDATE users SET email_verified_at = NULL WHERE email = $1",
      [user.email],
    );
    await db.query(
      `UPDATE users SET email_verified_at = COALESCE(created_at, NOW())
        WHERE email_verified_at IS NULL`,
    ); // the statement from migration 007
    expect((await userRow()).email_verified_at).not.toBeNull();
  });
});

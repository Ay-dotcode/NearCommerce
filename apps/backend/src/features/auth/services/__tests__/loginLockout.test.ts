import redisClient, { connectRedis } from "@/config/redis";
import {
  LOGIN_LOCKOUT_BASE_SECONDS,
  LOGIN_LOCKOUT_MAX_SECONDS,
  LOGIN_MAX_FAILURES,
} from "@/constants";
import {
  clearLoginFailures,
  getLoginLockout,
  lockoutSeconds,
  recordLoginFailure,
} from "@/features/auth/services/loginLockout.service";

describe("lockoutSeconds", () => {
  it("does not lock out before the failure threshold", () => {
    expect(lockoutSeconds(LOGIN_MAX_FAILURES - 1)).toBe(0);
  });

  it("starts at the base duration and doubles per further failure", () => {
    expect(lockoutSeconds(LOGIN_MAX_FAILURES)).toBe(LOGIN_LOCKOUT_BASE_SECONDS);
    expect(lockoutSeconds(LOGIN_MAX_FAILURES + 1)).toBe(
      LOGIN_LOCKOUT_BASE_SECONDS * 2,
    );
  });

  it("is capped", () => {
    expect(lockoutSeconds(LOGIN_MAX_FAILURES + 50)).toBe(
      LOGIN_LOCKOUT_MAX_SECONDS,
    );
  });
});

describe("login lockout state", () => {
  const email = "lockout@example.com";
  const ip = "10.0.0.9";

  beforeAll(async () => {
    await connectRedis();
  });

  beforeEach(async () => {
    await clearLoginFailures(email, ip);
  });

  afterAll(async () => {
    await clearLoginFailures(email, ip);
    await redisClient.quit();
  });

  it("locks after the threshold and clears on success", async () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES - 1; i++)
      await recordLoginFailure(email, ip);
    expect(await getLoginLockout(email, ip)).toBe(0);

    await recordLoginFailure(email, ip);
    expect(await getLoginLockout(email, ip)).toBeGreaterThan(0);

    await clearLoginFailures(email, ip);
    expect(await getLoginLockout(email, ip)).toBe(0);
  });

  it("tracks emails case-insensitively and per IP", async () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++)
      await recordLoginFailure(email.toUpperCase(), ip);
    expect(await getLoginLockout(email, ip)).toBeGreaterThan(0);
    expect(await getLoginLockout(email, "10.0.0.10")).toBe(0);
  });
});

import redisClient from "@/config/redis";
import {
  LOGIN_FAILURE_WINDOW_SECONDS,
  LOGIN_LOCKOUT_BASE_SECONDS,
  LOGIN_LOCKOUT_MAX_SECONDS,
  LOGIN_MAX_FAILURES,
} from "@/constants";

// Progressive lockout per email + IP. Fails open when Redis is unavailable so a cache
// outage can never lock every user out.
const failuresKey = (email: string, ip: string) =>
  `login:fail:${email.toLowerCase()}:${ip}`;
const lockKey = (email: string, ip: string) =>
  `login:lock:${email.toLowerCase()}:${ip}`;

// Seconds a lockout lasts after the given number of consecutive failures.
export function lockoutSeconds(failures: number): number {
  if (failures < LOGIN_MAX_FAILURES) return 0;
  const doublings = failures - LOGIN_MAX_FAILURES;
  return Math.min(
    LOGIN_LOCKOUT_BASE_SECONDS * 2 ** doublings,
    LOGIN_LOCKOUT_MAX_SECONDS,
  );
}

// Returns the remaining lockout in seconds, or 0 when logins are allowed.
export async function getLoginLockout(
  email: string,
  ip: string,
): Promise<number> {
  try {
    if (!redisClient.isOpen) return 0;
    const ttl = await redisClient.ttl(lockKey(email, ip));
    return ttl > 0 ? ttl : 0;
  } catch (error) {
    console.error("[AUTH] Login lockout check failed:", error);
    return 0;
  }
}

export async function recordLoginFailure(email: string, ip: string) {
  try {
    if (!redisClient.isOpen) return;
    const key = failuresKey(email, ip);
    const failures = await redisClient.incr(key);
    await redisClient.expire(key, LOGIN_FAILURE_WINDOW_SECONDS);
    const seconds = lockoutSeconds(failures);
    if (seconds > 0)
      await redisClient.set(lockKey(email, ip), "1", { EX: seconds });
  } catch (error) {
    console.error("[AUTH] Failed to record login failure:", error);
  }
}

export async function clearLoginFailures(email: string, ip: string) {
  try {
    if (!redisClient.isOpen) return;
    await redisClient.del([failuresKey(email, ip), lockKey(email, ip)]);
  } catch (error) {
    console.error("[AUTH] Failed to clear login failures:", error);
  }
}

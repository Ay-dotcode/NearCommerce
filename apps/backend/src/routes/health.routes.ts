import { db } from "@/config/database";
import redisClient from "@/config/redis";
import { Router } from "express";

const router = Router();

const CHECK_TIMEOUT_MS = 2000;

function withTimeout<T>(work: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out`)),
      CHECK_TIMEOUT_MS,
    );
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// Liveness: the process is up and able to answer. No dependencies are touched, so a slow
// database never makes the platform restart a healthy API.
router.get("/", (_req, res) => {
  res.json({ status: "ok", uptime: Math.round(process.uptime()) });
});

// Readiness: the API can actually serve traffic (database and Redis both answer).
router.get("/ready", async (_req, res) => {
  const checks = await Promise.allSettled([
    withTimeout(db.query("SELECT 1"), "database"),
    withTimeout(
      redisClient.isOpen
        ? redisClient.ping()
        : Promise.reject(new Error("redis not connected")),
      "redis",
    ),
  ]);
  const [database, redis] = checks.map((c) =>
    c.status === "fulfilled" ? "up" : "down",
  );
  const ready = database === "up" && redis === "up";
  res.status(ready ? 200 : 503).json({
    status: ready ? "ok" : "unavailable",
    checks: { database, redis },
  });
});

export default router;

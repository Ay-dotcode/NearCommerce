import { app } from "@/app";
import request from "supertest";

describe("platform endpoints", () => {
  it("GET /health reports the process is alive", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /health/ready answers 200 or 503 with a per-dependency report", async () => {
    const res = await request(app).get("/health/ready");
    expect([200, 503]).toContain(res.status);
    expect(res.body.checks).toEqual({
      database: expect.stringMatching(/^(up|down)$/),
      redis: expect.stringMatching(/^(up|down)$/),
    });
  });

  it("sends security headers and hides the framework", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["strict-transport-security"]).toBeDefined();
  });

  it("answers unknown routes with JSON 404", async () => {
    const res = await request(app).get("/definitely/not/a/route");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found", code: "ROUTE_NOT_FOUND" });
  });

  it("answers malformed JSON with a JSON 400 instead of an HTML error", async () => {
    const res = await request(app)
      .post("/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_JSON");
  });
});

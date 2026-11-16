import { allowedOrigins, buildCorsOptions } from "@/config/cors";

const ask = (options: ReturnType<typeof buildCorsOptions>, origin?: string) =>
  new Promise<boolean | undefined>((resolve, reject) => {
    const fn = options.origin as (
      o: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => void;
    fn(origin, (err, allow) => (err ? reject(err) : resolve(allow)));
  });

describe("CORS configuration", () => {
  it("keeps echoing any origin when CORS_ORIGINS is not set", () => {
    expect(buildCorsOptions({})).toEqual({ origin: true, credentials: true });
  });

  it("builds a de-duplicated allowlist and adds FRONTEND_URL", () => {
    expect(
      allowedOrigins({
        CORS_ORIGINS: "https://a.example/, https://b.example",
        FRONTEND_URL: "https://a.example",
      }),
    ).toEqual(["https://a.example", "https://b.example"]);
  });

  it("allows listed origins and requests without an Origin header", async () => {
    const options = buildCorsOptions({ CORS_ORIGINS: "https://a.example" });
    expect(options.credentials).toBe(true);
    expect(await ask(options, "https://a.example")).toBe(true);
    expect(await ask(options, undefined)).toBe(true);
  });

  it("rejects origins that are not listed", async () => {
    const options = buildCorsOptions({ CORS_ORIGINS: "https://a.example" });
    expect(await ask(options, "https://evil.example")).toBe(false);
  });
});

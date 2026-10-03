import { parseApiError } from "@/api/errors";

describe("parseApiError", () => {
  it("reads the backend error message, status, code and field details", () => {
    const parsed = parseApiError({
      response: {
        status: 400,
        data: {
          error: "Validation failed",
          code: "X",
          details: [{ path: "latitude", message: "Invalid latitude" }],
        },
      },
    });
    expect(parsed).toEqual({
      message: "Validation failed",
      status: 400,
      code: "X",
      details: [{ path: "latitude", message: "Invalid latitude" }],
    });
  });

  it("falls back to the provided message for network errors and unknown shapes", () => {
    expect(parseApiError(new Error("Network Error"), "Try again").message).toBe(
      "Try again",
    );
    expect(parseApiError(undefined).message).toMatch(/something went wrong/i);
    expect(
      parseApiError({ response: { status: 500, data: "<html>" } }, "fallback")
        .message,
    ).toBe("fallback");
  });

  it("drops malformed detail entries instead of crashing", () => {
    const parsed = parseApiError({
      response: {
        data: {
          error: "e",
          details: [null, { path: 1 }, { path: "a", message: "ok" }],
        },
      },
    });
    expect(parsed.details).toEqual([{ path: "a", message: "ok" }]);
  });
});

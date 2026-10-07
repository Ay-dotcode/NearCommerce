import { loginErrorMessage, parseApiError } from "@/api/errors";

describe("admin parseApiError", () => {
  it("reads the server message, status and field details", () => {
    const err = {
      response: {
        status: 409,
        data: {
          error: "Taken",
          details: [{ path: "name", message: "In use" }, { bad: true }],
        },
      },
    };
    expect(parseApiError(err)).toEqual({
      message: "Taken",
      status: 409,
      details: [{ path: "name", message: "In use" }],
    });
  });

  it("falls back for network errors and odd payloads", () => {
    expect(parseApiError(new Error("offline"), "Nope")).toEqual({
      message: "Nope",
      status: undefined,
      details: [],
    });
    expect(parseApiError(null).message).toMatch(/something went wrong/i);
    expect(
      parseApiError({ response: { status: 500, data: "<html>" } }, "x"),
    ).toMatchObject({ message: "x", status: 500 });
  });
});

describe("loginErrorMessage", () => {
  const withResponse = (status: number, error?: string) => ({
    response: { status, data: error ? { error } : {} },
  });

  it("keeps wrong credentials vague", () => {
    expect(loginErrorMessage(withResponse(401, "Invalid credentials"))).toBe(
      "Invalid email or password.",
    );
  });

  it("surfaces lockouts and suspensions from the server", () => {
    expect(
      loginErrorMessage(withResponse(429, "Too many failed login attempts.")),
    ).toBe("Too many failed login attempts.");
    expect(loginErrorMessage(withResponse(403, "Account is suspended."))).toBe(
      "Account is suspended.",
    );
  });

  it("explains when the server cannot be reached", () => {
    expect(loginErrorMessage(new Error("Network Error"))).toMatch(
      /can't reach the server/i,
    );
  });
});

import { parseApiError } from "@/api/errors";

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

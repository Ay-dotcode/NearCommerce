import {
  googleClientIds,
  verifyGoogleIdToken,
} from "@/features/auth/services/googleVerifier.service";

const verifyIdToken = jest.fn();
jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken })),
}));

describe("googleClientIds", () => {
  it("splits, trims and drops blanks", () => {
    expect(
      googleClientIds({ GOOGLE_CLIENT_IDS: " a.apps , b.apps ,, " }),
    ).toEqual(["a.apps", "b.apps"]);
    expect(googleClientIds({})).toEqual([]);
  });
});

describe("verifyGoogleIdToken", () => {
  const original = process.env.GOOGLE_CLIENT_IDS;
  afterEach(() => {
    process.env.GOOGLE_CLIENT_IDS = original;
    verifyIdToken.mockReset();
  });

  it("is a 503 when no client id is configured", async () => {
    delete process.env.GOOGLE_CLIENT_IDS;
    await expect(verifyGoogleIdToken("t")).rejects.toMatchObject({
      status: 503,
    });
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it("checks the token against our client ids and normalises the profile", async () => {
    process.env.GOOGLE_CLIENT_IDS = "web.apps,android.apps";
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "123",
        email: " Joe@Example.COM ",
        email_verified: true,
        name: "Joe",
      }),
    });
    await expect(verifyGoogleIdToken("t")).resolves.toEqual({
      subject: "123",
      email: "joe@example.com",
      emailVerified: true,
      name: "Joe",
    });
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: "t",
      audience: ["web.apps", "android.apps"],
    });
  });

  it("treats a missing email_verified claim as not verified", async () => {
    process.env.GOOGLE_CLIENT_IDS = "web.apps";
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: "1", email: "a@b.co" }),
    });
    expect((await verifyGoogleIdToken("t")).emailVerified).toBe(false);
  });

  it("answers 401 for a token Google's library rejects (forged, expired, wrong audience)", async () => {
    process.env.GOOGLE_CLIENT_IDS = "web.apps";
    verifyIdToken.mockRejectedValue(new Error("Wrong recipient"));
    await expect(verifyGoogleIdToken("t")).rejects.toMatchObject({
      status: 401,
      code: "GOOGLE_TOKEN_INVALID",
    });
  });
});

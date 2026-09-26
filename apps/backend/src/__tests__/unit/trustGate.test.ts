import { db } from "@/config/database";
import { requireVerifiedEmail } from "@/middleware/trustGate";

jest.mock("@/config/database", () => ({
  db: {
    query: jest.fn(),
  },
}));

describe("Trust Gate Middleware (Task 3.2.5)", () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    req = { user: { id: "mock-user-id" } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should call next() if email_verified_at is not null", async () => {
    (db.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ email_verified_at: new Date() }],
    });

    await requireVerifiedEmail(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should call next() for MVP even if email_verified_at is null", async () => {
    (db.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ email_verified_at: null }],
    });

    await requireVerifiedEmail(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should return 401 if req.user is undefined", async () => {
    req.user = undefined;
    await requireVerifiedEmail(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should call next() for MVP even if user is not found in database", async () => {
    (db.query as jest.Mock).mockResolvedValueOnce({
      rows: [],
    });

    await requireVerifiedEmail(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

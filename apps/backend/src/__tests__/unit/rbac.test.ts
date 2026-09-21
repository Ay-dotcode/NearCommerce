import { requireRole } from "@/middleware/rbac";

describe("RBAC Middleware (Task 3.2.6)", () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it("should call next() if user role matches required role", () => {
    req = { user: { role: "SYSTEM_ADMIN" } };
    const middleware = requireRole("SYSTEM_ADMIN");

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should return 403 if user role does not match", () => {
    req = { user: { role: "CUSTOMER" } };
    const middleware = requireRole("SYSTEM_ADMIN");

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/Forbidden/) }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 if req.user is undefined", () => {
    req = {};
    const middleware = requireRole("SYSTEM_ADMIN");

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

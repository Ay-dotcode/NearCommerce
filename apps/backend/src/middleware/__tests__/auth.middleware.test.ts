import redisClient from "@/config/redis";
import { JWT_ACCESS_SECRET } from "@/constants";
import { requireAuth } from "@/middleware/auth.middleware";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

jest.mock("@/config/redis", () => ({
  __esModule: true,
  default: {
    isOpen: true,
    get: jest.fn(),
  },
}));

describe("requireAuth Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it("should return 401 if authorization header is missing", async () => {
    await requireAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Missing or invalid authorization header",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should return 401 if authorization header does not start with Bearer", async () => {
    mockReq.headers = { authorization: "Basic 12345" };

    await requireAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Missing or invalid authorization header",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should return 401 if token is invalid", async () => {
    mockReq.headers = { authorization: "Bearer invalidtoken" };

    await requireAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Invalid token",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should return 401 if token is expired", async () => {
    const expiredToken = jwt.sign(
      { id: "u-1", role: "CUSTOMER" },
      JWT_ACCESS_SECRET,
      { expiresIn: "-1s" },
    );
    mockReq.headers = { authorization: `Bearer ${expiredToken}` };

    await requireAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Access token expired",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should return 403 if user is suspended in Redis", async () => {
    const token = jwt.sign(
      { id: "u-suspended", role: "CUSTOMER" },
      JWT_ACCESS_SECRET,
      { expiresIn: "15m" },
    );
    mockReq.headers = { authorization: `Bearer ${token}` };

    (redisClient.get as jest.Mock).mockResolvedValue("true");

    await requireAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(redisClient.get).toHaveBeenCalledWith("suspended:u-suspended");
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Account is suspended.",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should attach user to req and call next if token is valid and not suspended", async () => {
    const token = jwt.sign(
      { id: "u-active", role: "CUSTOMER" },
      JWT_ACCESS_SECRET,
      { expiresIn: "15m" },
    );
    mockReq.headers = { authorization: `Bearer ${token}` };

    (redisClient.get as jest.Mock).mockResolvedValue("false");

    await requireAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.user).toEqual({ id: "u-active", role: "CUSTOMER" });
    expect(mockNext).toHaveBeenCalled();
  });
});

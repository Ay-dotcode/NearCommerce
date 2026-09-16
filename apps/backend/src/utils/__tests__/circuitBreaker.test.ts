import { withCircuitBreaker } from "../circuitBreaker";

describe("Circuit Breaker Utility", () => {
  it("should resolve if promise completes before timeout", async () => {
    const fastPromise = new Promise<string>((resolve) =>
      setTimeout(() => resolve("success"), 50),
    );
    const result = await withCircuitBreaker(fastPromise, 200);
    expect(result).toBe("success");
  });

  it("should reject with timeout error if operation exceeds timeoutMs", async () => {
    const slowPromise = new Promise<string>((resolve) =>
      setTimeout(() => resolve("too late"), 200),
    );

    await expect(withCircuitBreaker(slowPromise, 50)).rejects.toThrow(
      /Circuit breaker triggered: operation exceeded 50ms/,
    );
  });
});

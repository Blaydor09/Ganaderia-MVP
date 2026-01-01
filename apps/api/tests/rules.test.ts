import { describe, expect, it, vi } from "vitest";
import { computeWithdrawal } from "../src/services/withdrawalService";
import { hasSufficientStock, isBatchExpired, isWithdrawalActive } from "../src/services/rules";
import { requireRoles } from "../src/middleware/rbac";

describe("withdrawal rules", () => {
  it("computes withdrawal dates", () => {
    const base = new Date("2025-01-01T00:00:00Z");
    const result = computeWithdrawal(base, 10, 2);
    expect(result.meatUntil.toISOString()).toBe("2025-01-11T00:00:00.000Z");
    expect(result.milkUntil.toISOString()).toBe("2025-01-03T00:00:00.000Z");
  });

  it("detects active withdrawal", () => {
    const future = new Date(Date.now() + 1000);
    expect(isWithdrawalActive(future)).toBe(true);
  });
});

describe("inventory rules", () => {
  it("detects expired batch", () => {
    const past = new Date(Date.now() - 1000);
    expect(isBatchExpired(past)).toBe(true);
  });

  it("validates stock", () => {
    expect(hasSufficientStock(10, 5)).toBe(true);
    expect(hasSufficientStock(3, 5)).toBe(false);
  });
});

describe("rbac", () => {
  it("blocks unauthorized roles", () => {
    const req: any = { user: { id: "1", roles: ["OPERADOR"] } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireRoles("ADMIN")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows authorized roles", () => {
    const req: any = { user: { id: "1", roles: ["ADMIN"] } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireRoles("ADMIN")(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

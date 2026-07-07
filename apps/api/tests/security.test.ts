import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import * as authService from "../src/services/authService";
import { animalQuickCreateSchema } from "../src/validators/animalSchemas";
import {
  REDACTED_VALUE,
  sanitizeErrorLike,
  sanitizeHeaders,
  sanitizeRequestBody,
} from "../src/utils/logging";
import { exportToCsv } from "../src/services/reports.service";
import { assertStrongPassword } from "../src/utils/password";
import { decryptMfaSecret, encryptMfaSecret } from "../src/utils/mfa";

describe("security regressions", () => {
  afterEach(() => vi.restoreAllMocks());

  it("never returns a refresh token in login JSON and sets a constrained HttpOnly cookie", async () => {
    vi.spyOn(authService, "login").mockResolvedValue({
      accessToken: "access-value",
      refreshToken: "refresh-value",
      user: { id: "u1", name: "User", email: "user@example.com", roles: ["ADMIN"] },
      tenant: { id: "t1", name: "Tenant", status: "ACTIVE" },
    } as any);

    const response = await request(createApp())
      .post("/api/v1/auth/login")
      .send({ email: "user@example.com", password: "not-logged" });

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty("refreshToken");
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(response.headers["set-cookie"]?.[0]).toContain("SameSite=Strict");
    expect(response.headers["set-cookie"]?.[0]).toContain("Path=/api/v1/auth");
  });

  it("redacts credentials from headers, auth bodies, and nested client errors", () => {
    const headers = sanitizeHeaders({ authorization: "Bearer secret", cookie: "session=secret" });
    const body = sanitizeRequestBody("/api/v1/auth/login", {
      email: "user@example.com",
      password: "secret-password",
    });
    const error = sanitizeErrorLike({
      message: "request failed",
      config: { headers: { Authorization: "Bearer secret" }, data: { password: "secret" } },
    });
    const serialized = JSON.stringify({ headers, body, error });

    expect(serialized).not.toContain("Bearer secret");
    expect(serialized).not.toContain("secret-password");
    expect(serialized).toContain(REDACTED_VALUE);
  });

  it("caps quick animal creation groups, per-group count, and total count", () => {
    const base = {
      breed: "Mestiza",
      origin: "BORN" as const,
      establishmentId: "11111111-1111-4111-8111-111111111111",
    };
    expect(
      animalQuickCreateSchema.safeParse({
        ...base,
        items: [{ category: "VACA", sex: "FEMALE", count: 101 }],
      }).success
    ).toBe(false);
    expect(
      animalQuickCreateSchema.safeParse({
        ...base,
        items: Array.from({ length: 6 }, () => ({
          category: "VACA",
          sex: "FEMALE",
          count: 100,
        })),
      }).success
    ).toBe(false);
  });

  it("neutralizes spreadsheet formulas in CSV exports", () => {
    const csv = exportToCsv([{ name: "=HYPERLINK(\"https://evil\")" }], ["name"]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).not.toContain('"=HYPERLINK');
  });

  it("rejects common passwords and encrypts MFA secrets at rest", () => {
    expect(() => assertStrongPassword("password1234")).toThrow();
    const encrypted = encryptMfaSecret("JBSWY3DPEHPK3PXP");
    expect(encrypted).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptMfaSecret(encrypted)).toBe("JBSWY3DPEHPK3PXP");
  });
});

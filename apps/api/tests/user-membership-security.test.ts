import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/prisma";
import {
  assertCanRemoveUserFromTenant,
  assertCanUpdateTenantMembershipRoles,
} from "../src/services/userMembershipService";

describe("tenant membership isolation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("prevents removing the last tenant administrator", async () => {
    vi.spyOn(prisma.userRole, "count").mockResolvedValue(1);
    await expect(
      assertCanRemoveUserFromTenant({ tenantId: "tenant-a", currentRoles: ["ADMIN"] })
    ).rejects.toMatchObject({ status: 409 });
  });

  it("prevents demoting the last tenant administrator", async () => {
    vi.spyOn(prisma.userRole, "count").mockResolvedValue(1);
    await expect(
      assertCanUpdateTenantMembershipRoles({
        tenantId: "tenant-a",
        currentRoles: ["ADMIN"],
        nextRoles: ["AUDITOR"],
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it("does not query another tenant while counting administrators", async () => {
    const count = vi.spyOn(prisma.userRole, "count").mockResolvedValue(2);
    await assertCanRemoveUserFromTenant({ tenantId: "tenant-a", currentRoles: ["ADMIN"] });
    expect(count).toHaveBeenCalledWith({
      where: { tenantId: "tenant-a", role: { name: "ADMIN" } },
    });
  });
});

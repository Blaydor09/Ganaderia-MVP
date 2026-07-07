import { prisma } from "../config/prisma";
import { ApiError } from "../utils/errors";

type MembershipStore = Pick<typeof prisma, "userRole">;

const countTenantAdmins = (tenantId: string, store: MembershipStore = prisma) =>
  store.userRole.count({
    where: {
      tenantId,
      role: { name: "ADMIN" },
    },
  });

export const assertCanUpdateTenantMembershipRoles = async (input: {
  tenantId: string;
  currentRoles: string[];
  nextRoles: string[];
  store?: MembershipStore;
}) => {
  if (!input.currentRoles.includes("ADMIN") || input.nextRoles.includes("ADMIN")) {
    return;
  }

  const adminCount = await countTenantAdmins(input.tenantId, input.store);
  if (adminCount <= 1) {
    throw new ApiError(409, "Cannot remove the last tenant admin");
  }
};

export const assertCanRemoveUserFromTenant = async (input: {
  tenantId: string;
  currentRoles: string[];
  store?: MembershipStore;
}) => {
  if (!input.currentRoles.includes("ADMIN")) {
    return;
  }

  const adminCount = await countTenantAdmins(input.tenantId, input.store);
  if (adminCount <= 1) {
    throw new ApiError(409, "Cannot remove the last tenant admin");
  }
};

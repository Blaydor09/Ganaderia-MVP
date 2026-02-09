import { ApiError } from "./errors";

export const withTenantScope = <T extends Record<string, unknown>>(
  tenantId: string,
  where: T = {} as T
) => ({
  ...where,
  tenantId,
});

export const assertTenantIdOrThrow = (tenantId: string | undefined) => {
  if (!tenantId) {
    throw new ApiError(401, "Missing tenant context");
  }
  return tenantId;
};

export const findTenantResourceOrThrow = async <T>(
  lookup: () => Promise<T | null>,
  resource: string
) => {
  const entity = await lookup();
  if (!entity) {
    throw new ApiError(404, `${resource} not found`);
  }
  return entity;
};

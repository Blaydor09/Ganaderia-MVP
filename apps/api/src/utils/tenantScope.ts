import { EstablishmentType } from "@prisma/client";
import { ApiError } from "./errors";

type EstablishmentLike = {
  id: string;
  name?: string;
  type: EstablishmentType;
  fincaId?: string | null;
};

export const visibleEstablishmentTypes: EstablishmentType[] = ["FINCA", "POTRERO"];

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

export const assertOperationalEstablishmentOrThrow: (
  establishment: EstablishmentLike | null,
  label: string
) => asserts establishment is EstablishmentLike = (establishment, label) => {
  if (!establishment) {
    throw new ApiError(400, `${label} is required`);
  }

  if (establishment.type !== "POTRERO") {
    throw new ApiError(400, `${label} must be potrero`);
  }
};


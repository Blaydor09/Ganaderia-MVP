import { prisma } from "../config/prisma";

export const BASE_ROLES = [
  { name: "ADMIN", description: "Admin" },
  { name: "VETERINARIO", description: "Veterinario" },
  { name: "OPERADOR", description: "Operador" },
  { name: "AUDITOR", description: "Auditor" },
] as const;

export const PLATFORM_BASE_ROLES = [
  { name: "platform_super_admin", description: "Super admin de plataforma SaaS" },
  { name: "platform_support", description: "Soporte operativo de plataforma" },
] as const;

export const ensureBaseRoles = async () => {
  await Promise.all(
    BASE_ROLES.map((role) =>
      prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: role,
      })
    )
  );
};

export const ensurePlatformRoles = async () => {
  await Promise.all(
    PLATFORM_BASE_ROLES.map((role) =>
      prisma.platformRole.upsert({
        where: { name: role.name },
        update: { description: role.description },
        create: role,
      })
    )
  );
};

import { prisma } from "../config/prisma";

export const BASE_ROLES = [
  { name: "ADMIN", description: "Admin" },
  { name: "VETERINARIO", description: "Veterinario" },
  { name: "OPERADOR", description: "Operador" },
  { name: "AUDITOR", description: "Auditor" },
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

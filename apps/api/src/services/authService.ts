import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { ApiError } from "../utils/errors";
import { hashPassword, verifyPassword } from "../utils/password";
import { parseDurationToMs } from "../utils/duration";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { ensureBaseRoles } from "../utils/roles";
import { writeAudit } from "../utils/audit";
import { normalizeEmail } from "../utils/email";

const createSession = async (input: {
  user: { id: string; name: string; email: string };
  roles: string[];
  tenantId: string;
  userAgent?: string;
  ip?: string;
}) => {
  const payload = { sub: input.user.id, roles: input.roles, tenantId: input.tenantId };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const tokenHash = await hashPassword(refreshToken);
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.jwtRefreshExpiresIn));

  await prisma.refreshToken.create({
    data: {
      userId: input.user.id,
      tokenHash,
      expiresAt,
      userAgent: input.userAgent,
      ip: input.ip,
    },
  });

  return { accessToken, refreshToken };
};

const getTenantRoles = async (userId: string, tenantId: string) => {
  const rows = await prisma.userRole.findMany({
    where: { userId, tenantId },
    include: { role: true },
  });
  return Array.from(
    new Set(rows.map((row: { role: { name: string } }) => row.role.name))
  );
};

const getTenantRecord = async (tenantId: string) => {
  return prisma.tenant.findUnique({ where: { id: tenantId } });
};

export const login = async (
  email: string,
  password: string,
  tenantId?: string,
  userAgent?: string,
  ip?: string
) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid credentials");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const memberships = await prisma.userRole.findMany({
    where: { userId: user.id },
    include: { role: true, tenant: true },
    orderBy: { assignedAt: "asc" },
  });

  if (!memberships.length) {
    throw new ApiError(403, "No tenant access");
  }

  const activeTenantId = tenantId ?? memberships[0].tenantId;
  const tenantMemberships = memberships.filter((row) => row.tenantId === activeTenantId);

  if (!tenantMemberships.length) {
    throw new ApiError(403, "Tenant access denied");
  }

  const roles = Array.from(new Set(tenantMemberships.map((row) => row.role.name)));
  const tenant = tenantMemberships[0].tenant;

  const tokens = await createSession({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    roles,
    tenantId: activeTenantId,
    userAgent,
    ip,
  });

  return {
    ...tokens,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles,
    },
    tenant: tenant ? { id: tenant.id, name: tenant.name } : null,
  };
};

export const refresh = async (refreshToken: string) => {
  const payload = verifyRefreshToken(refreshToken);

  const tokens = await prisma.refreshToken.findMany({
    where: {
      userId: payload.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  const tokenMatch = await Promise.all(
    tokens.map(async (token: { id: string; tokenHash: string }) => ({
      token,
      valid: await verifyPassword(refreshToken, token.tokenHash),
    }))
  );

  const match = tokenMatch.find((item) => item.valid);
  if (!match) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  const roles = await getTenantRoles(user.id, payload.tenantId);
  if (!roles.length) {
    throw new ApiError(403, "Tenant access denied");
  }

  const newAccessToken = signAccessToken({
    sub: user.id,
    roles,
    tenantId: payload.tenantId,
  });

  return { accessToken: newAccessToken };
};

export const logout = async (refreshToken: string) => {
  const payload = verifyRefreshToken(refreshToken);
  const tokens = await prisma.refreshToken.findMany({
    where: { userId: payload.sub, revokedAt: null },
  });

  const tokenMatch = await Promise.all(
    tokens.map(async (token: { id: string; tokenHash: string }) => ({
      token,
      valid: await verifyPassword(refreshToken, token.tokenHash),
    }))
  );

  const match = tokenMatch.find((item) => item.valid);
  if (!match) {
    throw new ApiError(400, "Token not found");
  }

  await prisma.refreshToken.update({
    where: { id: match.token.id },
    data: { revokedAt: new Date() },
  });

  return { success: true };
};

export const registerAccount = async (input: {
  name: string;
  email: string;
  password: string;
  tenantName: string;
  registrationCode?: string;
  userAgent?: string;
  ip?: string;
}) => {
  if (env.registrationMode === "closed") {
    throw new ApiError(403, "Registration closed");
  }

  if (env.registrationMode === "protected" && input.registrationCode !== env.registrationCode) {
    throw new ApiError(403, "Invalid registration code");
  }

  const normalizedEmail = normalizeEmail(input.email);
  const existing = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
  });
  if (existing) {
    throw new ApiError(409, "Email already registered");
  }

  await ensureBaseRoles();

  const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  if (!adminRole) {
    throw new ApiError(500, "Missing ADMIN role");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      name: input.tenantName.trim(),
      createdById: user.id,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: adminRole.id,
      tenantId: tenant.id,
    },
  });

  const roles = [adminRole.name];
  const tokens = await createSession({
    user: { id: user.id, name: user.name, email: user.email },
    roles,
    tenantId: tenant.id,
    userAgent: input.userAgent,
    ip: input.ip,
  });

  await writeAudit({
    userId: user.id,
    tenantId: tenant.id,
    action: "CREATE",
    entity: "user",
    entityId: user.id,
    after: { id: user.id, name: user.name, email: user.email, roles },
    ip: input.ip,
  });

  return {
    ...tokens,
    user: { id: user.id, name: user.name, email: user.email, roles },
    tenant: { id: tenant.id, name: tenant.name },
  };
};

export const switchTenant = async (input: {
  userId: string;
  tenantId: string;
  userAgent?: string;
  ip?: string;
}) => {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid credentials");
  }

  const roles = await getTenantRoles(user.id, input.tenantId);
  if (!roles.length) {
    throw new ApiError(403, "Tenant access denied");
  }

  const tenant = await getTenantRecord(input.tenantId);
  if (!tenant) {
    throw new ApiError(404, "Tenant not found");
  }

  const tokens = await createSession({
    user: { id: user.id, name: user.name, email: user.email },
    roles,
    tenantId: input.tenantId,
    userAgent: input.userAgent,
    ip: input.ip,
  });

  return {
    ...tokens,
    user: { id: user.id, name: user.name, email: user.email, roles },
    tenant: { id: tenant.id, name: tenant.name },
  };
};

export const getUserTenants = async (userId: string) => {
  const memberships = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true, tenant: true },
    orderBy: { assignedAt: "asc" },
  });

  const map = new Map<string, { id: string; name: string; roles: string[] }>();
  for (const row of memberships) {
    const existing = map.get(row.tenantId) ?? {
      id: row.tenantId,
      name: row.tenant.name,
      roles: [],
    };
    if (!existing.roles.includes(row.role.name)) {
      existing.roles.push(row.role.name);
    }
    map.set(row.tenantId, existing);
  }

  return Array.from(map.values());
};

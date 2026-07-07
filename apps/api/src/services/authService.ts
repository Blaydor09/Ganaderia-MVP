import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { ApiError } from "../utils/errors";
import { assertStrongPassword, hashPassword, verifyPassword } from "../utils/password";
import { parseDurationToMs } from "../utils/duration";
import {
  JwtScope,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { ensureBaseRoles } from "../utils/roles";
import { writeAudit } from "../utils/audit";
import { normalizeEmail } from "../utils/email";
import { randomUUID } from "crypto";

const MAX_ACTIVE_SESSIONS = 5;

const parseRefreshTokenPayload = (refreshToken: string) => {
  try {
    return verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }
};

export type ScopedSessionInput = {
  user: { id: string; name: string; email: string };
  roles: string[];
  scope: JwtScope;
  tenantId?: string;
  impersonationSessionId?: string;
  userAgent?: string;
  ip?: string;
  familyId?: string;
};

type SessionStore = Pick<typeof prisma, "refreshToken">;

type RefreshTokenMatch = {
  id: string;
  userId: string;
  tokenHash: string;
  scope: JwtScope;
  tenantId: string | null;
  impersonationSessionId: string | null;
  revokedAt: Date | null;
  familyId: string;
};

const findMatchingRefreshToken = async (input: {
  userId: string;
  scope: JwtScope;
  tenantId?: string;
  refreshToken: string;
}) => {
  const tokens = await prisma.refreshToken.findMany({
    where: {
      userId: input.userId,
      scope: input.scope,
      tenantId: input.tenantId,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      userId: true,
      tokenHash: true,
      scope: true,
      tenantId: true,
      impersonationSessionId: true,
      revokedAt: true,
      familyId: true,
    },
  });

  for (const token of tokens) {
    if (await verifyPassword(input.refreshToken, token.tokenHash)) {
      return token as RefreshTokenMatch;
    }
  }

  return null;
};

const revokeTokenFamily = async (input: {
  userId: string;
  familyId: string;
}) => {
  await prisma.refreshToken.updateMany({
    where: {
      userId: input.userId,
      familyId: input.familyId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
};

const auditRefreshTokenReuse = async (input: {
  userId: string;
  scope: JwtScope;
  tenantId?: string;
  ip?: string;
  userAgent?: string;
}) => {
  await writeAudit({
    userId: input.userId,
    actorType: input.scope === "platform" ? "platform" : "tenant",
    tenantId: input.tenantId,
    action: "REFRESH_TOKEN_REUSE_DETECTED",
    entity: "auth.session",
    entityId: input.userId,
    resource: "auth.session",
    resourceId: input.userId,
    ip: input.ip,
    userAgent: input.userAgent,
    metadata: { scope: input.scope },
  });
};

export const createScopedSession = async (input: ScopedSessionInput, store: SessionStore = prisma) => {
  if (input.scope === "tenant" && !input.tenantId) {
    throw new ApiError(500, "Tenant session requires tenantId");
  }

  const payload = {
    sub: input.user.id,
    roles: input.roles,
    scope: input.scope,
    tenantId: input.tenantId,
    impersonationSessionId: input.impersonationSessionId,
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const tokenHash = await hashPassword(refreshToken);
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.jwtRefreshExpiresIn));

  await store.refreshToken.create({
    data: {
      userId: input.user.id,
      tokenHash,
      familyId: input.familyId ?? randomUUID(),
      scope: input.scope,
      tenantId: input.tenantId,
      impersonationSessionId: input.impersonationSessionId,
      expiresAt,
      userAgent: input.userAgent,
      ip: input.ip,
    },
  });

  const staleSessions = await store.refreshToken.findMany({
    where: {
      userId: input.user.id,
      scope: input.scope,
      tenantId: input.tenantId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    skip: MAX_ACTIVE_SESSIONS,
    select: { id: true },
  });
  if (staleSessions.length) {
    await store.refreshToken.updateMany({
      where: { id: { in: staleSessions.map((session) => session.id) }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  return { accessToken, refreshToken };
};

export const listSessions = (input: { userId: string; scope: JwtScope; tenantId?: string }) =>
  prisma.refreshToken.findMany({
    where: {
      userId: input.userId,
      scope: input.scope,
      tenantId: input.tenantId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      familyId: true,
      userAgent: true,
      ip: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

export const revokeSession = async (input: {
  sessionId: string;
  userId: string;
  scope: JwtScope;
  tenantId?: string;
}) => {
  const session = await prisma.refreshToken.findFirst({
    where: {
      id: input.sessionId,
      userId: input.userId,
      scope: input.scope,
      tenantId: input.tenantId,
    },
    select: { familyId: true },
  });
  if (!session) throw new ApiError(404, "Session not found");

  await prisma.refreshToken.updateMany({
    where: { userId: input.userId, familyId: session.familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

const getTenantRoles = async (userId: string, tenantId: string) => {
  const rows = await prisma.userRole.findMany({
    where: { userId, tenantId },
    include: { role: true },
  });
  return Array.from(new Set(rows.map((row: { role: { name: string } }) => row.role.name)));
};

const getTenantRecord = async (tenantId: string) => {
  return prisma.tenant.findUnique({ where: { id: tenantId } });
};

const ensureTenantActive = async (tenantId: string) => {
  const tenant = await getTenantRecord(tenantId);
  if (!tenant) {
    throw new ApiError(404, "Tenant not found");
  }
  if (tenant.status !== "ACTIVE") {
    throw new ApiError(403, "Tenant suspended", { code: "TENANT_SUSPENDED" });
  }
  return tenant;
};

const updateTenantLastLogin = async (tenantId: string) => {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { lastLoginAt: new Date() },
  });
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

  const tenant = await ensureTenantActive(activeTenantId);
  const roles = Array.from(new Set(tenantMemberships.map((row) => row.role.name)));

  const tokens = await createScopedSession({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    roles,
    scope: "tenant",
    tenantId: activeTenantId,
    userAgent,
    ip,
  });

  await updateTenantLastLogin(activeTenantId);
  await writeAudit({
    userId: user.id,
    actorType: "tenant",
    tenantId: activeTenantId,
    action: "LOGIN",
    entity: "auth.session",
    entityId: user.id,
    resource: "auth.session",
    resourceId: user.id,
    ip,
    userAgent,
    metadata: { method: "password" },
  });

  return {
    ...tokens,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles,
    },
    tenant: { id: tenant.id, name: tenant.name, status: tenant.status },
  };
};

export const refresh = async (refreshToken: string, userAgent?: string, ip?: string) => {
  const payload = parseRefreshTokenPayload(refreshToken);
  if (payload.scope !== "tenant" || !payload.tenantId) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const tokenMatch = await findMatchingRefreshToken({
    userId: payload.sub,
    scope: "tenant",
    tenantId: payload.tenantId,
    refreshToken,
  });

  if (!tokenMatch) {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (tokenMatch.revokedAt) {
    await revokeTokenFamily({ userId: payload.sub, familyId: tokenMatch.familyId });
    await auditRefreshTokenReuse({
      userId: payload.sub,
      scope: "tenant",
      tenantId: payload.tenantId,
      ip,
      userAgent,
    });
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid credentials");
  }

  await ensureTenantActive(payload.tenantId);

  const roles = await getTenantRoles(user.id, payload.tenantId);
  if (!roles.length) {
    throw new ApiError(403, "Tenant access denied");
  }

  const rotatedSession = await prisma.$transaction(async (tx) => {
    const revoked = await tx.refreshToken.updateMany({
      where: { id: tokenMatch.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (revoked.count !== 1) {
      return null;
    }

    return createScopedSession(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        roles,
        scope: "tenant",
        tenantId: payload.tenantId,
        impersonationSessionId: payload.impersonationSessionId,
        userAgent,
        ip,
        familyId: tokenMatch.familyId,
      },
      tx
    );
  });

  if (!rotatedSession) {
    await revokeTokenFamily({ userId: payload.sub, familyId: tokenMatch.familyId });
    await auditRefreshTokenReuse({
      userId: payload.sub,
      scope: "tenant",
      tenantId: payload.tenantId,
      ip,
      userAgent,
    });
    throw new ApiError(401, "Invalid refresh token");
  }

  return rotatedSession;
};

export const logout = async (refreshToken: string) => {
  const payload = parseRefreshTokenPayload(refreshToken);
  if (payload.scope !== "tenant" || !payload.tenantId) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const tokens = await prisma.refreshToken.findMany({
    where: {
      userId: payload.sub,
      scope: "tenant",
      tenantId: payload.tenantId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  for (const token of tokens) {
    if (await verifyPassword(refreshToken, token.tokenHash)) {
      await prisma.refreshToken.update({
        where: { id: token.id },
        data: { revokedAt: new Date() },
      });

      await writeAudit({
        userId: payload.sub,
        actorType: "tenant",
        tenantId: payload.tenantId,
        action: "LOGOUT",
        entity: "auth.session",
        entityId: payload.sub,
      });

      return { success: true };
    }
  }

  throw new ApiError(401, "Invalid refresh token");
};

export const changePassword = async (input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  scope: JwtScope;
  tenantId?: string;
  ip?: string;
  userAgent?: string;
}) => {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid credentials");
  }

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid credentials");
  }

  assertStrongPassword(input.newPassword);
  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { passwordHash },
    });

    await tx.refreshToken.updateMany({
      where: { userId: input.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  await writeAudit({
    userId: input.userId,
    actorType: input.scope === "platform" ? "platform" : "tenant",
    tenantId: input.tenantId,
    action: "CHANGE_PASSWORD",
    entity: "user",
    entityId: input.userId,
    resource: "auth.password",
    resourceId: input.userId,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return { success: true };
};

const ensureDefaultPlan = async () => {
  const freePlan = await prisma.plan.findUnique({ where: { code: "FREE" } });
  if (!freePlan) {
    throw new ApiError(500, "Missing FREE plan");
  }
  return freePlan;
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

  assertStrongPassword(input.password);
  const passwordHash = await hashPassword(input.password);
  const freePlan = await ensureDefaultPlan();
  const { user, tenant } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash,
      },
    });
    const tenant = await tx.tenant.create({
      data: {
        name: input.tenantName.trim(),
        createdById: user.id,
        ownerId: user.id,
        status: "ACTIVE",
      },
    });
    await tx.userRole.create({
      data: { userId: user.id, roleId: adminRole.id, tenantId: tenant.id },
    });
    await tx.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId: freePlan.id,
        status: "ACTIVE",
        createdById: user.id,
      },
    });
    return { user, tenant };
  });

  const roles = [adminRole.name];
  const tokens = await createScopedSession({
    user: { id: user.id, name: user.name, email: user.email },
    roles,
    scope: "tenant",
    tenantId: tenant.id,
    userAgent: input.userAgent,
    ip: input.ip,
  });

  await updateTenantLastLogin(tenant.id);
  await writeAudit({
    userId: user.id,
    actorType: "tenant",
    tenantId: tenant.id,
    action: "CREATE",
    entity: "user",
    entityId: user.id,
    after: { id: user.id, name: user.name, email: user.email, roles },
    ip: input.ip,
    userAgent: input.userAgent,
  });
  await writeAudit({
    userId: user.id,
    actorType: "tenant",
    tenantId: tenant.id,
    action: "LOGIN",
    entity: "auth.session",
    entityId: user.id,
    ip: input.ip,
    userAgent: input.userAgent,
    metadata: { method: "register" },
  });

  return {
    ...tokens,
    user: { id: user.id, name: user.name, email: user.email, roles },
    tenant: { id: tenant.id, name: tenant.name, status: tenant.status },
  };
};

export const switchTenant = async (input: {
  userId: string;
  tenantId: string;
  previousTenantId?: string;
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

  const tenant = await ensureTenantActive(input.tenantId);

  const tokens = await createScopedSession({
    user: { id: user.id, name: user.name, email: user.email },
    roles,
    scope: "tenant",
    tenantId: input.tenantId,
    userAgent: input.userAgent,
    ip: input.ip,
  });

  await updateTenantLastLogin(input.tenantId);
  await writeAudit({
    userId: user.id,
    actorType: "tenant",
    tenantId: input.tenantId,
    action: "SWITCH_TENANT",
    entity: "tenant",
    entityId: input.tenantId,
    metadata: {
      fromTenantId: input.previousTenantId ?? null,
      toTenantId: input.tenantId,
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return {
    ...tokens,
    user: { id: user.id, name: user.name, email: user.email, roles },
    tenant: { id: tenant.id, name: tenant.name, status: tenant.status },
  };
};

export const getUserTenants = async (userId: string) => {
  const memberships = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true, tenant: true },
    orderBy: { assignedAt: "asc" },
  });

  const map = new Map<
    string,
    { id: string; name: string; status: string; roles: string[]; lastLoginAt: Date | null }
  >();
  for (const row of memberships) {
    const existing = map.get(row.tenantId) ?? {
      id: row.tenantId,
      name: row.tenant.name,
      status: row.tenant.status,
      roles: [],
      lastLoginAt: row.tenant.lastLoginAt,
    };
    if (!existing.roles.includes(row.role.name)) {
      existing.roles.push(row.role.name);
    }
    map.set(row.tenantId, existing);
  }

  return Array.from(map.values());
};

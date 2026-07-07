import { prisma } from "../config/prisma";
import { ApiError } from "../utils/errors";
import { normalizeEmail } from "../utils/email";
import { verifyPassword } from "../utils/password";
import { createScopedSession } from "./authService";
import { verifyRefreshToken } from "../utils/jwt";
import { writeAudit } from "../utils/audit";
import {
  signMfaEnrollmentToken,
  verifyMfaEnrollmentToken,
} from "../utils/jwt";
import {
  buildMfaUri,
  decryptMfaSecret,
  encryptMfaSecret,
  generateMfaSecret,
  verifyMfaCode,
} from "../utils/mfa";

const parseRefreshTokenPayload = (refreshToken: string) => {
  try {
    return verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }
};

const findMatchingPlatformRefreshToken = async (userId: string, refreshToken: string) => {
  const tokens = await prisma.refreshToken.findMany({
    where: {
      userId,
      scope: "platform",
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      tokenHash: true,
      revokedAt: true,
      familyId: true,
    },
  });

  for (const token of tokens) {
    if (await verifyPassword(refreshToken, token.tokenHash)) {
      return token;
    }
  }

  return null;
};

const revokePlatformFamily = async (userId: string, familyId: string) => {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      familyId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
};

const auditPlatformRefreshTokenReuse = async (input: {
  userId: string;
  ip?: string;
  userAgent?: string;
}) => {
  await writeAudit({
    userId: input.userId,
    actorType: "platform",
    action: "REFRESH_TOKEN_REUSE_DETECTED",
    entity: "auth.session",
    entityId: input.userId,
    resource: "platform.auth.session",
    resourceId: input.userId,
    ip: input.ip,
    userAgent: input.userAgent,
    metadata: { scope: "platform" },
  });
};

export const platformLogin = async (input: {
  email: string;
  password: string;
  mfaCode?: string;
  userAgent?: string;
  ip?: string;
}) => {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid credentials");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const memberships = await prisma.platformUserRole.findMany({
    where: { userId: user.id },
    include: { role: true },
  });
  if (!memberships.length) {
    throw new ApiError(403, "Platform access denied");
  }

  const roles = Array.from(new Set(memberships.map((item) => item.role.name)));
  const requiresMfa = roles.includes("platform_super_admin");
  if (requiresMfa && (!user.mfaEnabledAt || !user.mfaSecretEncrypted)) {
    return {
      mfaEnrollmentRequired: true as const,
      enrollmentToken: signMfaEnrollmentToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, roles },
    };
  }

  if (user.mfaEnabledAt && user.mfaSecretEncrypted) {
    if (!input.mfaCode || !verifyMfaCode(decryptMfaSecret(user.mfaSecretEncrypted), input.mfaCode)) {
      throw new ApiError(401, "Invalid credentials");
    }
  }

  const tokens = await createScopedSession({
    user: { id: user.id, name: user.name, email: user.email },
    roles,
    scope: "platform",
    userAgent: input.userAgent,
    ip: input.ip,
  });

  await writeAudit({
    userId: user.id,
    actorType: "platform",
    action: "LOGIN",
    entity: "auth.session",
    entityId: user.id,
    resource: "platform.auth.session",
    resourceId: user.id,
    ip: input.ip,
    userAgent: input.userAgent,
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
  };
};

export const beginPlatformMfaEnrollment = async (enrollmentToken: string) => {
  let userId: string;
  try {
    userId = verifyMfaEnrollmentToken(enrollmentToken);
  } catch {
    throw new ApiError(401, "Invalid or expired MFA enrollment");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { platformRoles: { include: { role: true } } },
  });
  if (
    !user ||
    !user.isActive ||
    user.mfaEnabledAt ||
    !user.platformRoles.some((row) => row.role.name === "platform_super_admin")
  ) {
    throw new ApiError(401, "Invalid or expired MFA enrollment");
  }

  const secret = generateMfaSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecretEncrypted: encryptMfaSecret(secret), mfaEnabledAt: null },
  });

  return { secret, otpauthUri: buildMfaUri(user.email, secret) };
};

export const confirmPlatformMfaEnrollment = async (input: {
  enrollmentToken: string;
  code: string;
  userAgent?: string;
  ip?: string;
}) => {
  let userId: string;
  try {
    userId = verifyMfaEnrollmentToken(input.enrollmentToken);
  } catch {
    throw new ApiError(401, "Invalid or expired MFA enrollment");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { platformRoles: { include: { role: true } } },
  });
  if (!user || !user.isActive || !user.mfaSecretEncrypted) {
    throw new ApiError(401, "Invalid or expired MFA enrollment");
  }
  const roles = Array.from(new Set(user.platformRoles.map((row) => row.role.name)));
  if (!roles.includes("platform_super_admin") || !verifyMfaCode(decryptMfaSecret(user.mfaSecretEncrypted), input.code)) {
    throw new ApiError(401, "Invalid MFA code");
  }

  await prisma.user.update({ where: { id: user.id }, data: { mfaEnabledAt: new Date() } });
  const tokens = await createScopedSession({
    user: { id: user.id, name: user.name, email: user.email },
    roles,
    scope: "platform",
    userAgent: input.userAgent,
    ip: input.ip,
  });
  await writeAudit({
    userId: user.id,
    actorType: "platform",
    action: "MFA_ENABLED",
    entity: "user",
    entityId: user.id,
    resource: "platform.auth.mfa",
    resourceId: user.id,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return { ...tokens, user: { id: user.id, name: user.name, email: user.email, roles } };
};

export const platformRefresh = async (refreshToken: string, userAgent?: string, ip?: string) => {
  const payload = parseRefreshTokenPayload(refreshToken);
  if (payload.scope !== "platform") {
    throw new ApiError(401, "Invalid refresh token");
  }

  const tokenMatch = await findMatchingPlatformRefreshToken(payload.sub, refreshToken);
  if (!tokenMatch) {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (tokenMatch.revokedAt) {
    await revokePlatformFamily(payload.sub, tokenMatch.familyId);
    await auditPlatformRefreshTokenReuse({ userId: payload.sub, ip, userAgent });
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid credentials");
  }

  const memberships = await prisma.platformUserRole.findMany({
    where: { userId: user.id },
    include: { role: true },
  });
  if (!memberships.length) {
    throw new ApiError(403, "Platform access denied");
  }

  const roles = Array.from(new Set(memberships.map((item) => item.role.name)));
  if (roles.includes("platform_super_admin") && (!user.mfaEnabledAt || !user.mfaSecretEncrypted)) {
    await revokePlatformFamily(payload.sub, tokenMatch.familyId);
    throw new ApiError(401, "Invalid credentials");
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
        user: { id: user.id, name: user.name, email: user.email },
        roles,
        scope: "platform",
        userAgent,
        ip,
        familyId: tokenMatch.familyId,
      },
      tx
    );
  });

  if (!rotatedSession) {
    await revokePlatformFamily(payload.sub, tokenMatch.familyId);
    await auditPlatformRefreshTokenReuse({ userId: payload.sub, ip, userAgent });
    throw new ApiError(401, "Invalid refresh token");
  }

  return rotatedSession;
};

export const platformLogout = async (refreshToken: string) => {
  const payload = parseRefreshTokenPayload(refreshToken);
  if (payload.scope !== "platform") {
    throw new ApiError(401, "Invalid refresh token");
  }

  const tokens = await prisma.refreshToken.findMany({
    where: {
      userId: payload.sub,
      scope: "platform",
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
        actorType: "platform",
        action: "LOGOUT",
        entity: "auth.session",
        entityId: payload.sub,
        resource: "platform.auth.session",
        resourceId: payload.sub,
      });

      return { success: true };
    }
  }

  throw new ApiError(401, "Invalid refresh token");
};

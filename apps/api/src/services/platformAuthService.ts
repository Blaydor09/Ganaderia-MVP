import { prisma } from "../config/prisma";
import { ApiError } from "../utils/errors";
import { normalizeEmail } from "../utils/email";
import { verifyPassword } from "../utils/password";
import { createScopedSession } from "./authService";
import { verifyRefreshToken } from "../utils/jwt";
import { writeAudit } from "../utils/audit";

export const platformLogin = async (input: {
  email: string;
  password: string;
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

const parseRefreshTokenPayload = (refreshToken: string) => {
  try {
    return verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }
};

export const platformRefresh = async (refreshToken: string, userAgent?: string, ip?: string) => {
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

  const matches = await Promise.all(
    tokens.map(async (token) => ({
      id: token.id,
      valid: await verifyPassword(refreshToken, token.tokenHash),
    }))
  );
  const match = matches.find((row) => row.valid);
  if (!match) {
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
  const rotatedSession = await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: { id: match.id },
      data: { revokedAt: new Date() },
    });

    return createScopedSession(
      {
        user: { id: user.id, name: user.name, email: user.email },
        roles,
        scope: "platform",
        userAgent,
        ip,
      },
      tx
    );
  });

  return rotatedSession;
};

export const platformLogout = async (refreshToken: string) => {
  const payload = parseRefreshTokenPayload(refreshToken);
  if (payload.scope !== "platform") {
    throw new ApiError(401, "Invalid refresh token");
  }

  const tokens = await prisma.refreshToken.findMany({
    where: { userId: payload.sub, scope: "platform", revokedAt: null },
  });

  const matches = await Promise.all(
    tokens.map(async (token) => ({
      id: token.id,
      valid: await verifyPassword(refreshToken, token.tokenHash),
    }))
  );
  const match = matches.find((row) => row.valid);
  if (!match) {
    throw new ApiError(401, "Invalid refresh token");
  }

  await prisma.refreshToken.update({
    where: { id: match.id },
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
};

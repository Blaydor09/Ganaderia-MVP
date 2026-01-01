import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { ApiError } from "../utils/errors";
import { hashPassword, verifyPassword } from "../utils/password";
import { parseDurationToMs } from "../utils/duration";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";

export const login = async (email: string, password: string, userAgent?: string, ip?: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid credentials");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const roles = user.roles.map((row: { role: { name: string } }) => row.role.name);
  const payload = { sub: user.id, roles };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const tokenHash = await hashPassword(refreshToken);
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.jwtRefreshExpiresIn));

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      userAgent,
      ip,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles,
    },
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
    include: { roles: { include: { role: true } } },
  });

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  const roles = user.roles.map((row: { role: { name: string } }) => row.role.name);
  const newAccessToken = signAccessToken({ sub: user.id, roles });

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
    throw new ApiError(400, "Token not found" );
  }

  await prisma.refreshToken.update({
    where: { id: match.token.id },
    data: { revokedAt: new Date() },
  });

  return { success: true };
};

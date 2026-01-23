import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { ApiError } from "../utils/errors";
import { hashPassword, verifyPassword } from "../utils/password";
import { parseDurationToMs } from "../utils/duration";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const issueTokens = async (
  user: { id: string; name: string; email: string; organizationId: string },
  roles: string[],
  userAgent?: string,
  ip?: string
) => {
  const payload = { sub: user.id, roles, organizationId: user.organizationId };
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

  return { accessToken, refreshToken };
};

export const login = async (email: string, password: string, userAgent?: string, ip?: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } }, organization: true },
  });

  if (!user || !user.isActive || !user.organization?.isActive) {
    throw new ApiError(401, "Invalid credentials");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const roles = user.roles.map((row: { role: { name: string } }) => row.role.name);
  const tokens = await issueTokens(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      organizationId: user.organizationId,
    },
    roles,
    userAgent,
    ip
  );

  return {
    ...tokens,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles,
      organizationId: user.organizationId,
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
    include: { roles: { include: { role: true } }, organization: true },
  });

  if (!user || !user.organization?.isActive) {
    throw new ApiError(401, "User not found");
  }

  if (user.organizationId !== payload.organizationId) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const roles = user.roles.map((row: { role: { name: string } }) => row.role.name);
  const newAccessToken = signAccessToken({
    sub: user.id,
    roles,
    organizationId: user.organizationId,
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
    throw new ApiError(400, "Token not found" );
  }

  await prisma.refreshToken.update({
    where: { id: match.token.id },
    data: { revokedAt: new Date() },
  });

  return { success: true };
};

export const register = async (input: {
  organizationName: string;
  organizationSlug?: string;
  name: string;
  email: string;
  password: string;
  userAgent?: string;
  ip?: string;
}) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existingUser) {
    throw new ApiError(409, "Email already registered");
  }

  const baseSlug = normalizeSlug(input.organizationSlug ?? input.organizationName);
  if (!baseSlug) {
    throw new ApiError(400, "Invalid organization slug");
  }

  const existingOrg = await prisma.organization.findUnique({
    where: { slug: baseSlug },
  });
  if (existingOrg) {
    throw new ApiError(409, "Organization slug already exists");
  }

  const passwordHash = await hashPassword(input.password);

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.organizationName.trim(),
        slug: baseSlug,
      },
    });

    const adminRole = await tx.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: { name: "ADMIN", description: "Admin" },
    });

    const user = await tx.user.create({
      data: {
        name: input.name.trim(),
        email: input.email.trim(),
        passwordHash,
        organizationId: organization.id,
        roles: {
          create: [{ roleId: adminRole.id }],
        },
      },
    });

    return { organization, user };
  });

  const roles = ["ADMIN"];
  const tokens = await issueTokens(
    {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      organizationId: result.organization.id,
    },
    roles,
    input.userAgent,
    input.ip
  );

  return {
    ...tokens,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      roles,
      organizationId: result.organization.id,
    },
    organization: {
      id: result.organization.id,
      name: result.organization.name,
      slug: result.organization.slug,
    },
  };
};

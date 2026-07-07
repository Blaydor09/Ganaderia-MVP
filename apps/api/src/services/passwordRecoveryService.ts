import { createHash, randomBytes } from "crypto";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { normalizeEmail } from "../utils/email";
import { ApiError } from "../utils/errors";
import { assertStrongPassword, hashPassword } from "../utils/password";
import { writeAudit } from "../utils/audit";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const requestPasswordReset = async (email: string) => {
  if (!env.passwordResetDeliveryUrl || !env.passwordResetDeliverySecret) return;

  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizeEmail(email), mode: "insensitive" }, isActive: true },
    select: { id: true, email: true },
  });
  if (!user) return;

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
    }),
  ]);

  const response = await fetch(env.passwordResetDeliveryUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.passwordResetDeliverySecret}`,
    },
    body: JSON.stringify({ email: user.email, token, expiresAt: expiresAt.toISOString() }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new ApiError(503, "Password recovery is temporarily unavailable");
  }
};

export const resetPassword = async (input: {
  token: string;
  newPassword: string;
  ip?: string;
  userAgent?: string;
}) => {
  assertStrongPassword(input.newPassword);
  const tokenHash = hashToken(input.token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const passwordHash = await hashPassword(input.newPassword);
  const completed = await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) return false;
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return true;
  });
  if (!completed) throw new ApiError(400, "Invalid or expired reset token");

  await writeAudit({
    userId: record.userId,
    actorType: "system",
    action: "PASSWORD_RECOVERY",
    entity: "user",
    entityId: record.userId,
    resource: "auth.password",
    resourceId: record.userId,
    ip: input.ip,
    userAgent: input.userAgent,
  });
};

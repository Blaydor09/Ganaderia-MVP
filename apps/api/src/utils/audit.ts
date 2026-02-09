import { prisma } from "../config/prisma";

export type AuditInput = {
  userId?: string;
  actorUserId?: string;
  actorType?: "platform" | "tenant" | "system";
  action: string;
  entity?: string;
  entityId?: string;
  resource?: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  ip?: string;
  userAgent?: string;
  tenantId?: string;
  occurredAt?: Date;
};

export const writeAudit = async (input: AuditInput) => {
  const actorUserId = input.actorUserId ?? input.userId;
  const resource = input.resource ?? input.entity ?? "unknown";
  const resourceId = input.resourceId ?? input.entityId;

  return prisma.auditLog.create({
    data: {
      userId: input.userId ?? actorUserId,
      actorUserId,
      actorType: input.actorType ?? "tenant",
      action: input.action,
      entity: input.entity ?? resource,
      entityId: input.entityId,
      resource,
      resourceId,
      before: input.before ?? undefined,
      after: input.after ?? undefined,
      metadata: input.metadata ?? undefined,
      ip: input.ip,
      userAgent: input.userAgent,
      tenantId: input.tenantId,
      occurredAt: input.occurredAt,
    },
  });
};

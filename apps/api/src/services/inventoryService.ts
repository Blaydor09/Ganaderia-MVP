import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/errors";
import { writeAudit } from "../utils/audit";

export type CreateInventoryTxInput = {
  batchId: string;
  type: "IN" | "OUT" | "ADJUST";
  quantity: number;
  unit: string;
  occurredAt: Date;
  reason?: string;
  createdBy?: string;
  ip?: string;
};

export const createInventoryTransaction = async (input: CreateInventoryTxInput) => {
  const batch = await prisma.batch.findUnique({
    where: { id: input.batchId },
    include: { product: true },
  });

  if (!batch) {
    throw new ApiError(404, "Batch not found");
  }

  if (batch.deletedAt) {
    throw new ApiError(400, "Batch inactive");
  }

  if (input.type === "OUT" && batch.quantityAvailable < input.quantity) {
    throw new ApiError(400, "Insufficient stock");
  }

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const quantityDelta = input.type === "IN" ? input.quantity : -input.quantity;
    const batchUpdated = await tx.batch.update({
      where: { id: batch.id },
      data: { quantityAvailable: { increment: quantityDelta } },
    });

    const txItem = await tx.inventoryTransaction.create({
      data: {
        batchId: batch.id,
        productId: batch.productId,
        type: input.type,
        quantity: input.quantity,
        unit: input.unit,
        occurredAt: input.occurredAt,
        reason: input.reason,
        createdBy: input.createdBy,
      },
    });

    return { batchUpdated, txItem };
  });

  await writeAudit({
    userId: input.createdBy,
    action: "CREATE",
    entity: "inventory_transaction",
    entityId: updated.txItem.id,
    after: updated.txItem,
    ip: input.ip,
  });

  return updated.txItem;
};

export const getInventoryAlerts = async () => {
  const now = new Date();
  const soon7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const soon15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const soon30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiringAll = await prisma.batch.findMany({
    where: {
      expiresAt: { lte: soon30 },
      deletedAt: null,
    },
    include: { product: true },
    orderBy: { expiresAt: "asc" },
  });

  const expiring7 = expiringAll.filter(
    (batch: { expiresAt: Date }) => batch.expiresAt <= soon7
  );
  const expiring15 = expiringAll.filter(
    (batch: { expiresAt: Date }) => batch.expiresAt <= soon15
  );

  const lowStock = await prisma.product.findMany({
    where: { deletedAt: null },
    include: { batches: true },
  });

  const lowStockList = lowStock
    .map(
      (product: {
        batches: { quantityAvailable: number }[];
        minStock: number;
      }) => {
        const total = product.batches.reduce(
          (sum: number, batch: { quantityAvailable: number }) =>
            sum + batch.quantityAvailable,
          0
        );
        return { product, total };
      }
    )
    .filter(
      (row: { total: number; product: { minStock: number } }) =>
        row.total <= row.product.minStock
    );

  return { expiring: expiringAll, expiring7, expiring15, lowStock: lowStockList };
};

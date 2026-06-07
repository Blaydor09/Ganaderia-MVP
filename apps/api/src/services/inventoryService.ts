import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/errors";
import { writeAudit } from "../utils/audit";

export type CreateInventoryTxInput = {
  productId: string;
  type: "IN" | "OUT";
  quantity: number;
  unit: string;
  occurredAt: Date;
  reason?: string;
  tenantId: string;
  createdById?: string;
  ip?: string;
};

export const createInventoryTransaction = async (input: CreateInventoryTxInput) => {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, tenantId: input.tenantId, deletedAt: null },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (input.type === "OUT" && product.stockAvailable < input.quantity) {
    throw new ApiError(400, "Insufficient stock");
  }

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const quantityDelta = input.type === "IN" ? input.quantity : -input.quantity;
    const productUpdated = await tx.product.update({
      where: { id: product.id },
      data: { stockAvailable: { increment: quantityDelta } },
    });

    const txItem = await tx.inventoryTransaction.create({
      data: {
        batchId: null,
        productId: product.id,
        type: input.type,
        quantity: input.quantity,
        unit: input.unit,
        occurredAt: input.occurredAt,
        reason: input.reason,
        tenantId: input.tenantId,
        createdById: input.createdById,
      },
    });

    return { productUpdated, txItem };
  });

  await writeAudit({
    userId: input.createdById,
    tenantId: input.tenantId,
    action: "CREATE",
    entity: "inventory_transaction",
    entityId: updated.txItem.id,
    after: updated.txItem,
    ip: input.ip,
  });

  return updated.txItem;
};

export const getInventoryAlerts = async (tenantId: string) => {
  const now = new Date();
  const soon7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const soon15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const soon30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiringAll = await prisma.product.findMany({
    where: {
      expiresAt: { lte: soon30 },
      tenantId,
      deletedAt: null,
    },
    orderBy: { expiresAt: "asc" },
  });

  const expiring7 = expiringAll.filter(
    (product) => product.expiresAt && product.expiresAt <= soon7
  );
  const expiring15 = expiringAll.filter(
    (product) => product.expiresAt && product.expiresAt <= soon15
  );

  const lowStock = await prisma.product.findMany({
    where: { deletedAt: null, tenantId },
  });

  const lowStockList = lowStock
    .map((product) => ({
      product,
      total: product.stockAvailable,
    }))
    .filter((row) => row.total <= row.product.minStock);

  return { expiring: expiringAll, expiring7, expiring15, lowStock: lowStockList };
};

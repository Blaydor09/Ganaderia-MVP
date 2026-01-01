import dayjs from "dayjs";
import { prisma } from "../config/prisma";

export const computeWithdrawal = (administeredAt: Date, meatDays: number, milkDays: number) => {
  const meatUntil = dayjs(administeredAt).add(meatDays, "day").toDate();
  const milkUntil = dayjs(administeredAt).add(milkDays, "day").toDate();
  return { meatUntil, milkUntil };
};

export const getActiveWithdrawalForAnimal = async (animalId: string) => {
  const now = new Date();
  const latest = await prisma.administration.findMany({
    where: {
      treatment: { animalId },
      OR: [
        { meatWithdrawalUntil: { gt: now } },
        { milkWithdrawalUntil: { gt: now } },
      ],
    },
    select: {
      meatWithdrawalUntil: true,
      milkWithdrawalUntil: true,
    },
  });

  let meatUntil: Date | null = null;
  let milkUntil: Date | null = null;

  for (const row of latest) {
    if (!meatUntil || row.meatWithdrawalUntil > meatUntil) {
      meatUntil = row.meatWithdrawalUntil;
    }
    if (!milkUntil || row.milkWithdrawalUntil > milkUntil) {
      milkUntil = row.milkWithdrawalUntil;
    }
  }

  return { meatUntil, milkUntil };
};

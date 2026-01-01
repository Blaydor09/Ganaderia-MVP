import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

const run = async () => {
  const roles = [
    { name: "ADMIN", description: "Admin" },
    { name: "VETERINARIO", description: "Veterinario" },
    { name: "OPERADOR", description: "Operador" },
    { name: "AUDITOR", description: "Auditor" },
  ] as const;

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  const adminPassword = await hashPassword("admin123");
  const vetPassword = await hashPassword("vet12345");
  const operatorPassword = await hashPassword("oper12345");
  const auditorPassword = await hashPassword("audit123");

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      name: "Admin Demo",
      email: "admin@demo.com",
      passwordHash: adminPassword,
      roles: { create: [{ role: { connect: { name: "ADMIN" } } }] },
    },
  });

  await prisma.user.upsert({
    where: { email: "vet@demo.com" },
    update: {},
    create: {
      name: "Vet Demo",
      email: "vet@demo.com",
      passwordHash: vetPassword,
      roles: { create: [{ role: { connect: { name: "VETERINARIO" } } }] },
    },
  });

  await prisma.user.upsert({
    where: { email: "oper@demo.com" },
    update: {},
    create: {
      name: "Operador Demo",
      email: "oper@demo.com",
      passwordHash: operatorPassword,
      roles: { create: [{ role: { connect: { name: "OPERADOR" } } }] },
    },
  });

  await prisma.user.upsert({
    where: { email: "audit@demo.com" },
    update: {},
    create: {
      name: "Auditor Demo",
      email: "audit@demo.com",
      passwordHash: auditorPassword,
      roles: { create: [{ role: { connect: { name: "AUDITOR" } } }] },
    },
  });

  const establishment = await prisma.establishment.create({
    data: {
      name: "Finca Central",
      type: "finca",
      address: "Km 10",
    },
  });

  const supplier = await prisma.supplier.create({
    data: { name: "Proveedor Vet" },
  });

  const product = await prisma.product.create({
    data: {
      name: "Ivermectina",
      activeIngredient: "Ivermectina",
      presentation: "Frasco 50ml",
      concentration: "1%",
      unit: "ml",
      meatWithdrawalDays: 28,
      milkWithdrawalDays: 7,
      minStock: 50,
    },
  });

  const batch = await prisma.batch.create({
    data: {
      productId: product.id,
      batchNumber: "BATCH-001",
      expiresAt: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      supplierId: supplier.id,
      receivedAt: new Date(),
      cost: 120,
      quantityInitial: 200,
      quantityAvailable: 200,
    },
  });

  const animal = await prisma.animal.create({
    data: {
      internalCode: "AN-DEMO-001",
      tag: "TAG-1001",
      sex: "FEMALE",
      breed: "Brahman",
      birthDate: new Date("2023-01-01"),
      category: "VACA",
      status: "ACTIVO",
      origin: "BORN",
      establishmentId: establishment.id,
    },
  });

  const treatment = await prisma.treatment.create({
    data: {
      animalId: animal.id,
      diagnosis: "Desparasitacion",
      startedAt: new Date(),
      status: "ACTIVE",
      createdBy: admin.id,
    },
  });

  await prisma.administration.create({
    data: {
      treatmentId: treatment.id,
      batchId: batch.id,
      productId: product.id,
      administeredAt: new Date(),
      dose: 10,
      doseUnit: "ml",
      route: "subcutanea",
      meatWithdrawalUntil: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      milkWithdrawalUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: admin.id,
    },
  });

  await prisma.inventoryTransaction.create({
    data: {
      batchId: batch.id,
      productId: product.id,
      type: "OUT",
      quantity: 10,
      unit: "ml",
      occurredAt: new Date(),
      reason: "administration",
      createdBy: admin.id,
    },
  });

  await prisma.batch.update({
    where: { id: batch.id },
    data: { quantityAvailable: 190 },
  });

  await prisma.alert.create({
    data: {
      type: "WITHDRAWAL",
      title: "Revisar retiro de carne",
      message: "El retiro del animal TAG-1001 finaliza pronto.",
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.task.create({
    data: {
      title: "Vacunacion terneros",
      taskType: "vacunacion",
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: "Programado por categoria.",
    },
  });

  console.log("Seed completed");
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

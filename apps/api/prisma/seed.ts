import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
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

  const existingFinca = await prisma.establishment.findFirst({
    where: { name: "Finca Central", type: "FINCA" },
  });
  const fincaId = existingFinca?.id ?? randomUUID();
  const finca = existingFinca
    ? await prisma.establishment.update({
        where: { id: fincaId },
        data: {
          name: "Finca Central",
          type: "FINCA",
          parentId: null,
          fincaId,
        },
      })
    : await prisma.establishment.create({
        data: {
          id: fincaId,
          name: "Finca Central",
          type: "FINCA",
          parentId: null,
          fincaId,
        },
      });

  const potreroNorteExisting = await prisma.establishment.findFirst({
    where: { name: "Potrero Norte", type: "POTRERO", parentId: finca.id },
  });
  const potreroNorte = potreroNorteExisting
    ? await prisma.establishment.update({
        where: { id: potreroNorteExisting.id },
        data: {
          name: "Potrero Norte",
          type: "POTRERO",
          parentId: finca.id,
          fincaId: finca.id,
        },
      })
    : await prisma.establishment.create({
        data: {
          name: "Potrero Norte",
          type: "POTRERO",
          parentId: finca.id,
          fincaId: finca.id,
        },
      });

  const potreroSurExisting = await prisma.establishment.findFirst({
    where: { name: "Potrero Sur", type: "POTRERO", parentId: finca.id },
  });
  const potreroSur = potreroSurExisting
    ? await prisma.establishment.update({
        where: { id: potreroSurExisting.id },
        data: {
          name: "Potrero Sur",
          type: "POTRERO",
          parentId: finca.id,
          fincaId: finca.id,
        },
      })
    : await prisma.establishment.create({
        data: {
          name: "Potrero Sur",
          type: "POTRERO",
          parentId: finca.id,
          fincaId: finca.id,
        },
      });

  const corralExisting = await prisma.establishment.findFirst({
    where: { name: "Corral Principal", type: "CORRAL", fincaId: finca.id },
  });
  const corral = corralExisting
    ? await prisma.establishment.update({
        where: { id: corralExisting.id },
        data: {
          name: "Corral Principal",
          type: "CORRAL",
          parentId: finca.id,
          fincaId: finca.id,
        },
      })
    : await prisma.establishment.create({
        data: {
          name: "Corral Principal",
          type: "CORRAL",
          parentId: finca.id,
          fincaId: finca.id,
        },
      });

  const supplier = await prisma.supplier.create({
    data: { name: "Proveedor Vet" },
  });

  const product = await prisma.product.create({
    data: {
      name: "Ivermectina",
      type: "DESPARASITANTE",
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

  const animal = await prisma.animal.upsert({
    where: { internalCode: "AN-DEMO-001" },
    update: {},
    create: {
      internalCode: "AN-DEMO-001",
      tag: "TAG-1001",
      sex: "FEMALE",
      breed: "Brahman",
      birthDate: new Date("2023-01-01"),
      category: "VACA",
      status: "ACTIVO",
      origin: "BORN",
      establishmentId: corral.id,
    },
  });

  const extraAnimals = [
    {
      internalCode: "AN-DEMO-002",
      tag: "TAG-1002",
      sex: "FEMALE",
      breed: "Angus",
      birthDate: new Date("2023-05-12"),
        category: "VAQUILLA",
        status: "ACTIVO",
        origin: "BORN",
        establishmentId: potreroNorte.id,
      },
    {
      internalCode: "AN-DEMO-003",
      tag: "TAG-1003",
      sex: "MALE",
      breed: "Brahman",
      birthDate: new Date("2024-02-01"),
        category: "TERNERO",
        status: "ACTIVO",
        origin: "BORN",
        establishmentId: potreroSur.id,
      },
    {
      internalCode: "AN-DEMO-004",
      tag: "TAG-1004",
      sex: "MALE",
      breed: "Nelore",
      birthDate: new Date("2022-09-18"),
        category: "TORO",
        status: "ACTIVO",
        origin: "BOUGHT",
        supplierId: supplier.id,
        establishmentId: corral.id,
      },
    {
      internalCode: "AN-DEMO-005",
      tag: "TAG-1005",
      sex: "MALE",
      breed: "Hereford",
      birthDate: new Date("2023-07-22"),
        category: "TORILLO",
        status: "ACTIVO",
        origin: "BORN",
        establishmentId: potreroNorte.id,
      },
    {
      internalCode: "AN-DEMO-006",
      tag: "TAG-1006",
      sex: "FEMALE",
      breed: "Holstein",
      birthDate: new Date("2021-08-05"),
        category: "VACA",
        status: "ACTIVO",
        origin: "BOUGHT",
        supplierId: supplier.id,
        establishmentId: potreroSur.id,
      },
  ];

  await prisma.animal.createMany({
    data: extraAnimals,
    skipDuplicates: true,
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

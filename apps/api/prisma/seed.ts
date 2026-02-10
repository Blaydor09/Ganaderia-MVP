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

  const platformRoles = [
    { name: "platform_super_admin", description: "Super admin de plataforma SaaS" },
    { name: "platform_support", description: "Soporte de plataforma SaaS" },
  ] as const;

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  for (const role of platformRoles) {
    await prisma.platformRole.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  const tenantId = "00000000-0000-0000-0000-000000000001";
  const tenant = await prisma.tenant.upsert({
    where: { id: tenantId },
    update: { name: "Cuenta Demo", status: "ACTIVE" },
    create: { id: tenantId, name: "Cuenta Demo", status: "ACTIVE" },
  });

  const plans = [
    { code: "FREE", name: "Free", description: "Plan base con limites de entrada" },
    { code: "PRO", name: "Pro", description: "Plan para crecimiento operativo" },
    {
      code: "ENTERPRISE",
      name: "Enterprise",
      description: "Plan corporativo con limites amplios",
    },
  ] as const;
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: { name: plan.name, description: plan.description, isActive: true },
      create: { ...plan, isActive: true },
    });
  }

  const usageMetrics = [
    {
      key: "USERS",
      name: "Usuarios por tenant",
      description: "Cantidad de usuarios habilitados",
      unit: "count",
    },
    {
      key: "ACTIVE_ANIMALS",
      name: "Animales activos",
      description: "Animales con estado ACTIVO",
      unit: "count",
    },
    {
      key: "PRODUCTS",
      name: "Productos",
      description: "Productos de inventario sanitario",
      unit: "count",
    },
    {
      key: "ACTIVE_BATCHES",
      name: "Lotes activos",
      description: "Lotes disponibles en inventario",
      unit: "count",
    },
    {
      key: "API_REQUESTS_MONTHLY",
      name: "Requests API mensuales",
      description: "Consumo mensual de la API",
      unit: "count",
    },
    {
      key: "STORAGE_MB",
      name: "Almacenamiento",
      description: "Uso de almacenamiento en MB",
      unit: "mb",
    },
  ] as const;
  for (const metric of usageMetrics) {
    await prisma.usageMetric.upsert({
      where: { key: metric.key },
      update: {
        name: metric.name,
        description: metric.description,
        unit: metric.unit,
      },
      create: metric,
    });
  }

  const adminPassword = await hashPassword("admin123");
  const vetPassword = await hashPassword("vet12345");
  const operatorPassword = await hashPassword("oper12345");
  const auditorPassword = await hashPassword("audit123");

  const roleByName = new Map<string, string>();
  for (const role of roles) {
    const roleRow = await prisma.role.findUnique({ where: { name: role.name } });
    if (!roleRow) {
      throw new Error(`Role not found during seed: ${role.name}`);
    }
    roleByName.set(role.name, roleRow.id);
  }

  const planRows = await prisma.plan.findMany();
  const metricRows = await prisma.usageMetric.findMany();
  const planIdByCode = new Map(planRows.map((row) => [row.code, row.id]));
  const metricIdByKey = new Map(metricRows.map((row) => [row.key, row.id]));

  const planLimits = [
    { planCode: "FREE", metric: "USERS", softLimit: 2, hardLimit: 3 },
    { planCode: "FREE", metric: "ACTIVE_ANIMALS", softLimit: 150, hardLimit: 200 },
    { planCode: "FREE", metric: "PRODUCTS", softLimit: 40, hardLimit: 50 },
    { planCode: "FREE", metric: "ACTIVE_BATCHES", softLimit: 80, hardLimit: 100 },
    { planCode: "FREE", metric: "API_REQUESTS_MONTHLY", softLimit: 40000, hardLimit: 50000 },
    { planCode: "FREE", metric: "STORAGE_MB", softLimit: 800, hardLimit: 1024 },
    { planCode: "PRO", metric: "USERS", softLimit: 12, hardLimit: 15 },
    { planCode: "PRO", metric: "ACTIVE_ANIMALS", softLimit: 2500, hardLimit: 3000 },
    { planCode: "PRO", metric: "PRODUCTS", softLimit: 250, hardLimit: 300 },
    { planCode: "PRO", metric: "ACTIVE_BATCHES", softLimit: 700, hardLimit: 800 },
    { planCode: "PRO", metric: "API_REQUESTS_MONTHLY", softLimit: 400000, hardLimit: 500000 },
    { planCode: "PRO", metric: "STORAGE_MB", softLimit: 8192, hardLimit: 10240 },
    { planCode: "ENTERPRISE", metric: "USERS", softLimit: null, hardLimit: null },
    { planCode: "ENTERPRISE", metric: "ACTIVE_ANIMALS", softLimit: null, hardLimit: null },
    { planCode: "ENTERPRISE", metric: "PRODUCTS", softLimit: null, hardLimit: null },
    { planCode: "ENTERPRISE", metric: "ACTIVE_BATCHES", softLimit: null, hardLimit: null },
    { planCode: "ENTERPRISE", metric: "API_REQUESTS_MONTHLY", softLimit: null, hardLimit: null },
    { planCode: "ENTERPRISE", metric: "STORAGE_MB", softLimit: null, hardLimit: null },
  ] as const;

  for (const limit of planLimits) {
    const planId = planIdByCode.get(limit.planCode);
    const usageMetricId = metricIdByKey.get(limit.metric);
    if (!planId || !usageMetricId) {
      throw new Error(`Missing plan/metric seed dependency: ${limit.planCode} ${limit.metric}`);
    }
    await prisma.planLimit.upsert({
      where: {
        planId_usageMetricId: {
          planId,
          usageMetricId,
        },
      },
      update: {
        softLimit: limit.softLimit,
        hardLimit: limit.hardLimit,
      },
      create: {
        planId,
        usageMetricId,
        softLimit: limit.softLimit,
        hardLimit: limit.hardLimit,
      },
    });
  }

  const ensureUserWithRole = async ({
    name,
    email,
    passwordHash,
    roleName,
  }: {
    name: string;
    email: string;
    passwordHash: string;
    roleName: (typeof roles)[number]["name"];
  }) => {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        passwordHash,
        isActive: true,
      },
      create: {
        name,
        email,
        passwordHash,
      },
    });

    const roleId = roleByName.get(roleName);
    if (!roleId) {
      throw new Error(`Role id not found for: ${roleName}`);
    }

    await prisma.userRole.upsert({
      where: {
        userId_roleId_tenantId: {
          userId: user.id,
          roleId,
          tenantId: tenant.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId,
        tenantId: tenant.id,
      },
    });

    return user;
  };

  const admin = await ensureUserWithRole({
    name: "Admin Demo",
    email: "admin@demo.com",
    passwordHash: adminPassword,
    roleName: "ADMIN",
  });

  await ensureUserWithRole({
    name: "Vet Demo",
    email: "vet@demo.com",
    passwordHash: vetPassword,
    roleName: "VETERINARIO",
  });

  await ensureUserWithRole({
    name: "Operador Demo",
    email: "oper@demo.com",
    passwordHash: operatorPassword,
    roleName: "OPERADOR",
  });

  await ensureUserWithRole({
    name: "Auditor Demo",
    email: "audit@demo.com",
    passwordHash: auditorPassword,
    roleName: "AUDITOR",
  });

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { ownerId: admin.id, status: "ACTIVE" },
  });

  const superAdminRole = await prisma.platformRole.findUnique({
    where: { name: "platform_super_admin" },
  });
  if (superAdminRole) {
    await prisma.platformUserRole.upsert({
      where: {
        userId_platformRoleId: {
          userId: admin.id,
          platformRoleId: superAdminRole.id,
        },
      },
      update: {},
      create: {
        userId: admin.id,
        platformRoleId: superAdminRole.id,
      },
    });
  }

  const freePlanId = planIdByCode.get("FREE");
  if (freePlanId) {
    const activeSubscription = await prisma.tenantSubscription.findFirst({
      where: { tenantId: tenant.id, status: { in: ["ACTIVE", "TRIALING"] } },
    });
    if (!activeSubscription) {
      await prisma.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planId: freePlanId,
          status: "ACTIVE",
          createdById: admin.id,
        },
      });
    }
  }

  const existingFinca = await prisma.establishment.findFirst({
    where: { name: "Finca Central", type: "FINCA", tenantId: tenant.id },
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
          tenantId: tenant.id,
        },
      })
    : await prisma.establishment.create({
        data: {
          id: fincaId,
          name: "Finca Central",
          type: "FINCA",
          parentId: null,
          fincaId,
          tenantId: tenant.id,
        },
      });

  const potreroNorteExisting = await prisma.establishment.findFirst({
    where: {
      name: "Potrero Norte",
      type: "POTRERO",
      parentId: finca.id,
      tenantId: tenant.id,
    },
  });
  const potreroNorte = potreroNorteExisting
    ? await prisma.establishment.update({
        where: { id: potreroNorteExisting.id },
        data: {
          name: "Potrero Norte",
          type: "POTRERO",
          parentId: finca.id,
          fincaId: finca.id,
          tenantId: tenant.id,
        },
      })
    : await prisma.establishment.create({
        data: {
          name: "Potrero Norte",
          type: "POTRERO",
          parentId: finca.id,
          fincaId: finca.id,
          tenantId: tenant.id,
        },
      });

  const potreroSurExisting = await prisma.establishment.findFirst({
    where: {
      name: "Potrero Sur",
      type: "POTRERO",
      parentId: finca.id,
      tenantId: tenant.id,
    },
  });
  const potreroSur = potreroSurExisting
    ? await prisma.establishment.update({
        where: { id: potreroSurExisting.id },
        data: {
          name: "Potrero Sur",
          type: "POTRERO",
          parentId: finca.id,
          fincaId: finca.id,
          tenantId: tenant.id,
        },
      })
    : await prisma.establishment.create({
        data: {
          name: "Potrero Sur",
          type: "POTRERO",
          parentId: finca.id,
          fincaId: finca.id,
          tenantId: tenant.id,
        },
      });

  const corralExisting = await prisma.establishment.findFirst({
    where: {
      name: "Corral Principal",
      type: "CORRAL",
      fincaId: finca.id,
      tenantId: tenant.id,
    },
  });
  const corral = corralExisting
    ? await prisma.establishment.update({
        where: { id: corralExisting.id },
        data: {
          name: "Corral Principal",
          type: "CORRAL",
          parentId: finca.id,
          fincaId: finca.id,
          tenantId: tenant.id,
        },
      })
    : await prisma.establishment.create({
        data: {
          name: "Corral Principal",
          type: "CORRAL",
          parentId: finca.id,
          fincaId: finca.id,
          tenantId: tenant.id,
        },
      });

  const supplier = await prisma.supplier.create({
    data: { name: "Proveedor Vet", tenantId: tenant.id },
  });

  const product = await prisma.product.create({
    data: {
      name: "Ivermectina",
      type: "DESPARASITANTE",
      unit: "ml",
      minStock: 50,
      tenantId: tenant.id,
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
      tenantId: tenant.id,
    },
  });

  const animal = await prisma.animal.upsert({
    where: { tenantId_internalCode: { tenantId: tenant.id, internalCode: "AN-DEMO-001" } },
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
      tenantId: tenant.id,
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
      tenantId: tenant.id,
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
        tenantId: tenant.id,
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
        tenantId: tenant.id,
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
        tenantId: tenant.id,
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
        tenantId: tenant.id,
      },
  ];

  await prisma.animal.createMany({
    data: extraAnimals,
    skipDuplicates: true,
  });

  const treatment = await prisma.treatment.create({
    data: {
      animalId: animal.id,
      description: "Desparasitacion",
      mode: "INDIVIDUAL",
      startedAt: new Date(),
      status: "ACTIVE",
      createdById: admin.id,
      tenantId: tenant.id,
    },
  });

  await prisma.treatmentAnimal.create({
    data: {
      treatmentId: treatment.id,
      animalId: animal.id,
      tenantId: tenant.id,
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
      createdById: admin.id,
      tenantId: tenant.id,
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
      createdById: admin.id,
      tenantId: tenant.id,
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
      tenantId: tenant.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Vacunacion terneros",
      taskType: "vacunacion",
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: "Programado por categoria.",
      tenantId: tenant.id,
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

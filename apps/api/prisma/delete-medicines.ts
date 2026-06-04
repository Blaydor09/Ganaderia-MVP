import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando la eliminación de todos los registros de medicamentos en todas las cuentas...");

  // Usamos una transacción para asegurar consistencia y respetar las claves foráneas
  await prisma.$transaction(async (tx) => {
    // 1. Eliminar administraciones (dependen de Batch, Product y Treatment)
    const administrations = await tx.administration.deleteMany({});
    console.log(`Eliminadas ${administrations.count} administraciones de tratamientos.`);

    // 2. Eliminar transacciones de inventario
    const transactions = await tx.inventoryTransaction.deleteMany({});
    console.log(`Eliminadas ${transactions.count} transacciones de inventario.`);

    // 3. Eliminar lotes (batches)
    const batches = await tx.batch.deleteMany({});
    console.log(`Eliminados ${batches.count} lotes (batches).`);

    // 4. Eliminar productos (medicamentos)
    const products = await tx.product.deleteMany({});
    console.log(`Eliminados ${products.count} productos/medicamentos.`);

    // 5. Eliminar alertas asociadas a stock, vencimientos o periodos de retiro
    const alerts = await tx.alert.deleteMany({
      where: {
        type: {
          in: ["STOCK", "EXPIRY", "WITHDRAWAL"]
        }
      }
    });
    console.log(`Eliminadas ${alerts.count} alertas asociadas.`);

    // 6. Eliminar relaciones de tratamientos con animales (opcional, limpia la tabla)
    const treatmentAnimals = await tx.treatmentAnimal.deleteMany({});
    console.log(`Eliminadas ${treatmentAnimals.count} relaciones de tratamientos con animales.`);

    // 7. Eliminar tratamientos (opcional, limpia la tabla)
    const treatments = await tx.treatment.deleteMany({});
    console.log(`Eliminados ${treatments.count} tratamientos.`);
  });

  console.log("Eliminación completada con éxito.");
}

main()
  .catch((e) => {
    console.error("Error al eliminar los registros:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

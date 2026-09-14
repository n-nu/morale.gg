import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DATABASE_URL ?? "postgresql://localhost:5432/morale_gg",
  }),
});

async function main() {
  const rootUnit = await prisma.unit.upsert({
    where: { id: "root-morale-gg" },
    update: {},
    create: {
      id: "root-morale-gg",
      name: process.env.ROOT_UNIT_NAME ?? "morale.gg Root Unit",
    },
  });

  console.log(`Seeded root unit: ${rootUnit.name} (${rootUnit.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
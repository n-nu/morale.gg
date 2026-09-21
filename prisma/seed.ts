import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DATABASE_URL ?? "postgresql://localhost:5432/morale_gg",
  }),
});

async function main() {
  const commanderUserId = process.env.ROOT_UNIT_COMMANDER_USER_ID;
  if (!commanderUserId) {
    throw new Error("ROOT_UNIT_COMMANDER_USER_ID must identify an existing Auth.js User");
  }

  const rootUnit = await prisma.$transaction(async (transaction) => {
    const commander = await transaction.user.findUnique({
      where: { id: commanderUserId },
      select: { id: true },
    });
    if (!commander) {
      throw new Error(`Auth.js User ${commanderUserId} does not exist`);
    }

    const unit = await transaction.unit.upsert({
      where: { id: "root-morale-gg" },
      update: { commanderUserId },
      create: {
        id: "root-morale-gg",
        name: process.env.ROOT_UNIT_NAME ?? "morale.gg Root Unit",
        commanderUserId,
      },
    });

    await transaction.authorizedUserMembership.upsert({
      where: { userId_unitId: { userId: commanderUserId, unitId: unit.id } },
      update: { authorityLevel: 0 },
      create: {
        userId: commanderUserId,
        unitId: unit.id,
        authorityLevel: 0,
        createdByUserId: commanderUserId,
      },
    });

    return unit;
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
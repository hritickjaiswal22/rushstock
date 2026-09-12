import { faker } from "@faker-js/faker";

import { prisma } from "../src/lib/prisma";
import { Role } from "../src/generated/prisma/enums";

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data if needed (optional)

  await prisma.user.deleteMany();

  // Generate 10 fake users
  for (let i = 0; i < 10; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    await prisma.user.create({
      data: {
        email: faker.internet.email({ firstName, lastName }),
        password: faker.internet.password(), // In real apps, make sure to hash this!
        name: `${firstName} ${lastName}`,
        role: faker.helpers.arrayElement([Role.USER, Role.USER]), // Add ADMIN if in your enum
        createdAt: faker.date.past(),
        updatedAt: new Date(),
      },
    });
  }

  console.log("✅ Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

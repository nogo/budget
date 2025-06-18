import { categories, transactions } from "./seed/data";
import prisma from "~/lib/prisma";
import { auth } from "~/lib/auth/server";

async function main() {
  await auth.api.signUpEmail({
    body: {
      name: "Demo User",
      username: "demo",
      email: "demo@budget.com",
      password: "budget2025",
    } as never,
  });

  await prisma.category.createMany({
    data: categories,
  });

  for (const t of transactions) {
    await prisma.transaction.create({
      data: t,
      include: {
        category: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

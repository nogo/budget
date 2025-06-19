const { categories, transactions } = require("./seed/data");
const prisma = require("~/lib/prisma").default;
const { auth } = require("~/lib/auth/server");

async function main() {
  await auth.api.signUpEmail({
    body: {
      name: "Demo User",
      username: "demo",
      email: "demo@budget.com",
      password: "budget2025",
    },
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

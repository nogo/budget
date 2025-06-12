import { db } from "~/lib/db";
import { categories, transactions } from "./seed/data";
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

  await db.category.createMany({
    data: categories,
  });

  for (const t of transactions) {
    await db.transaction.create({
      data: t,
      include: {
        category: true,
      },
    });
  }
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });

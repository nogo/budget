import { createServerFn } from "@tanstack/react-start";
import { IdSchema } from "./schema";
import { CategorySchema } from "./categories.schema";
import { eq, asc } from "drizzle-orm";
import db from "~/lib/db";
import { categories } from "~/db/schema";
import { userRequiredMiddleware } from "~/lib/auth/middleware";

export const listCategories = createServerFn().handler(async () => {
  return await db.select().from(categories).orderBy(asc(categories.id));
});

export const fetchCategory = createServerFn()
  .middleware([userRequiredMiddleware])
  .inputValidator(IdSchema)
  .handler(async ({ data }) => {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.id, data.id))
      .limit(1);
    return result[0] ?? null;
  });

export const crupCategory = createServerFn({ method: "POST" })
  .middleware([userRequiredMiddleware])
  .inputValidator(CategorySchema)
  .handler(async ({ data: categoryData }) => {
    if (categoryData.id && categoryData.id > 0) {
      const result = await db
        .update(categories)
        .set({
          name: categoryData.name,
          hasNotes: categoryData.hasNotes,
        })
        .where(eq(categories.id, categoryData.id))
        .returning();
      return result[0];
    } else {
      const result = await db
        .insert(categories)
        .values({
          name: categoryData.name,
          hasNotes: categoryData.hasNotes,
        })
        .returning();
      return result[0];
    }
  });

export const removeCategory = createServerFn({ method: "POST" })
  .middleware([userRequiredMiddleware])
  .inputValidator(IdSchema)
  .handler(async ({ data }) => {
    const result = await db
      .delete(categories)
      .where(eq(categories.id, data.id))
      .returning();
    return result[0];
  });

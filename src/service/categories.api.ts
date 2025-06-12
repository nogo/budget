import { createServerFn } from "@tanstack/react-start";
import { db } from "~/lib/db";
import { IdSchema } from "./schema";
import { CategorySchema } from "./categories.schema";
import { userRequiredMiddleware } from "./auth.api";

export const listCategories = createServerFn().handler(async () => {
  return await db.category.findMany({
    orderBy: {
      id: "asc",
    },
  });
});

export const fetchCategory = createServerFn()
  .validator(IdSchema)
  .middleware([userRequiredMiddleware])
  .handler(async ({ data }) => {
    return await db.category.findFirst({ where: { id: data.id } });
  });

export const crupCategory = createServerFn({ method: "POST" })
  .validator(CategorySchema)
  .middleware([userRequiredMiddleware])
  .handler(async ({ data: categoryData }) => {
    if (categoryData.id && categoryData.id > 0) {
      return await db.category.update({
        where: { id: categoryData.id },
        data: {
          id: categoryData.id,
          name: categoryData.name,
          hasNotes: categoryData.hasNotes,
        },
      });
    } else {
      return await db.category.create({
        data: {
          name: categoryData.name,
          hasNotes: categoryData.hasNotes,
        },
      });
    }
  });

export const removeCategory = createServerFn({ method: "POST" })
  .validator(IdSchema)
  .middleware([userRequiredMiddleware])
  .handler(async ({ data }) => {
    return await db.category.delete({
      where: {
        id: data.id,
      },
    });
  });

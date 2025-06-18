import { createServerFn } from "@tanstack/react-start";
import { IdSchema } from "./schema";
import { CategorySchema } from "./categories.schema";
import { userRequiredMiddleware } from "./auth.api";
import prisma from "~/lib/prisma";

export const listCategories = createServerFn().handler(async () => {
  return await prisma.category.findMany({
    orderBy: {
      id: "asc",
    },
  });
});

export const fetchCategory = createServerFn()
  .validator(IdSchema)
  .middleware([userRequiredMiddleware])
  .handler(async ({ data }) => {
    return await prisma.category.findFirst({ where: { id: data.id } });
  });

export const crupCategory = createServerFn({ method: "POST" })
  .validator(CategorySchema)
  .middleware([userRequiredMiddleware])
  .handler(async ({ data: categoryData }) => {
    if (categoryData.id && categoryData.id > 0) {
      return await prisma.category.update({
        where: { id: categoryData.id },
        data: {
          id: categoryData.id,
          name: categoryData.name,
          hasNotes: categoryData.hasNotes,
        },
      });
    } else {
      return await prisma.category.create({
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
    return await prisma.category.delete({
      where: {
        id: data.id,
      },
    });
  });

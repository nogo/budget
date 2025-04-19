import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { db } from "~/utils/db";

export const listCategories = createServerFn().handler(async () => {
  return await db.category.findMany({
    orderBy: {
      name: "asc",
    },
  });
});

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });

export const fetchCategory = createServerFn({ method: "GET" })
  .validator(z.coerce.number())
  .handler(async ({ data }) => {
    return await db.category.findFirst({ where: { id: data } });
  });

export const categoryQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ["categories", id],
    queryFn: () => fetchCategory({ data: id }),
  });

const categorySchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  hasNotes: z.boolean(),
});

export const crupCategory = createServerFn({ method: "POST" })
  .validator(categorySchema)
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

    //return await db.insert(categories).values(data).returning();
  });

export const removeCategory = createServerFn({ method: "POST" })
  .validator(z.coerce.number())
  .handler(async ({ data }) => {
    return await db.category.delete({
      where: {
        id: data,
      },
    });
  });

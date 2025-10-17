import { createServerFn } from "@tanstack/react-start";
import { IdSchema } from "./schema";
import { CategoryFilterSchema, TemplateSchema } from "./templates.schema";
import { eq, asc } from "drizzle-orm";
import db from "~/lib/db";
import { templates, categories } from "~/db/schema";
import { userRequiredMiddleware } from "~/lib/auth/middleware";

export type Template = {
  id: number;
  amount: number;
  type: "expense" | "income";
  categoryId: number;
  category?: string;
  note: string;
  day: number;
};

function transformToTemplate(item: any): Template | undefined {
  if (!item) return undefined;

  const result: Template = {
    id: item.id,
    amount: item.amount,
    type: item.type,
    categoryId: item.categoryId,
    category: item.category?.name,
    note: item.note,
    day: item.day,
  };

  return result;
}

export const listTemplates = createServerFn()
  .middleware([userRequiredMiddleware])
  .inputValidator(CategoryFilterSchema)
  .handler(async ({ data }) => {
    const query = db
      .select({
        id: templates.id,
        amount: templates.amount,
        type: templates.type,
        categoryId: templates.categoryId,
        note: templates.note,
        day: templates.day,
        category: {
          name: categories.name,
        },
      })
      .from(templates)
      .leftJoin(categories, eq(templates.categoryId, categories.id))
      .orderBy(asc(templates.day));

    if (data.categoryId) {
      const items = await query.where(eq(templates.categoryId, data.categoryId));
      return items.map((item) => transformToTemplate(item));
    }

    const items = await query;
    return items.map((item) => transformToTemplate(item));
  });

export const fetchTemplate = createServerFn()
  .middleware([userRequiredMiddleware])
  .inputValidator(IdSchema)
  .handler(async ({ data }) => {
    const result = await db
      .select()
      .from(templates)
      .where(eq(templates.id, data.id))
      .limit(1);
    return transformToTemplate(result[0]);
  });

export const crupTemplate = createServerFn({ method: "POST" })
  .middleware([userRequiredMiddleware])
  .inputValidator(TemplateSchema)
  .handler(async ({ data: templateData }) => {
    if (templateData.id && templateData.id > 0) {
      const result = await db
        .update(templates)
        .set({
          amount: templateData.amount,
          type: templateData.type,
          categoryId: templateData.categoryId,
          note: templateData.note,
          day: templateData.day,
        })
        .where(eq(templates.id, templateData.id))
        .returning();
      return transformToTemplate(result[0]);
    } else {
      const result = await db
        .insert(templates)
        .values({
          amount: templateData.amount,
          type: templateData.type,
          categoryId: templateData.categoryId,
          note: templateData.note,
          day: templateData.day,
        })
        .returning();
      return transformToTemplate(result[0]);
    }
  });

export const removeTemplate = createServerFn({ method: "POST" })
  .middleware([userRequiredMiddleware])
  .inputValidator(IdSchema)
  .handler(async ({ data }) => {
    const result = await db
      .delete(templates)
      .where(eq(templates.id, data.id))
      .returning();
    return transformToTemplate(result[0]);
  });

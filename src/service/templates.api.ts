import { createServerFn } from "@tanstack/react-start";
import { IdSchema } from "./schema";
import { CategoryFilterSchema, TemplateSchema } from "./templates.schema";
import { userRequiredMiddleware } from "./auth.api";
import prisma from "~/lib/prisma";

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
    amount: item.amount.toNumber(),
    type: item.type,
    categoryId: item.categoryId,
    category: undefined,
    note: item.note,
    day: item.day,
  };

  if (item.category) {
    result["category"] = item.category.name;
  }

  return result;
}

export const listTemplates = createServerFn()
  .validator(CategoryFilterSchema)
  .middleware([userRequiredMiddleware])
  .handler(async ({ data }) => {
    if (data.categoryId) {
      return await prisma.template
        .findMany({
          where: {
            categoryId: data.categoryId,
          },
          include: {
            category: {
              select: { name: true },
            },
          },
          orderBy: {
            day: "asc",
          },
        })
        .then((items) => items.map((item) => transformToTemplate(item)));
    }

    return await prisma.template
      .findMany({
        include: {
          category: {
            select: { name: true },
          },
        },
        orderBy: {
          day: "asc",
        },
      })
      .then((items) => items.map((item) => transformToTemplate(item)));
  });

export const fetchTemplate = createServerFn()
  .validator(IdSchema)
  .middleware([userRequiredMiddleware])
  .handler(async ({ data }) => {
    return await prisma.template
      .findFirst({ where: { id: data.id } })
      .then((item) => transformToTemplate(item));
  });

export const crupTemplate = createServerFn({ method: "POST" })
  .validator(TemplateSchema)
  .middleware([userRequiredMiddleware])
  .handler(async ({ data: templateData }) => {
    if (templateData.id && templateData.id > 0) {
      return await prisma.template
        .update({
          where: { id: templateData.id },
          data: {
            id: templateData.id,
            amount: templateData.amount,
            type: templateData.type,
            categoryId: templateData.categoryId,
            note: templateData.note,
            day: templateData.day,
          },
        })
        .then((item) => transformToTemplate(item));
    } else {
      return await prisma.template
        .create({
          data: {
            amount: templateData.amount,
            type: templateData.type,
            category: {
              connect: { id: templateData.categoryId },
            },
            note: templateData.note,
            day: templateData.day,
          },
          include: {
            category: true,
          },
        })
        .then((item) => transformToTemplate(item));
    }
  });

export const removeTemplate = createServerFn({ method: "POST" })
  .validator(IdSchema)
  .middleware([userRequiredMiddleware])
  .handler(async ({ data }) => {
    return await prisma.template
      .delete({
        where: {
          id: data.id,
        },
      })
      .then((item) => transformToTemplate(item));
  });

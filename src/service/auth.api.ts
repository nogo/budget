import { createMiddleware, createServerFn, json } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { auth } from "~/lib/auth/server";
import { UserMetaSchema } from "./auth.schema";
import prisma from "~/lib/prisma";

export const getUserSession = createServerFn({ method: "GET" })
  .handler(async () => {
    return null;
    const request = getWebRequest();

    if (!request?.headers) {
      return null;
    }

    return await auth.api.getSession({ headers: request.headers });
  });

export const userMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const userSession = await getUserSession();

    return next({ context: { userSession } });
  },
);

export const userRequiredMiddleware = createMiddleware({ type: "function" })
  .middleware([userMiddleware])
  .server(async ({ next, context }) => {
    if (!context.userSession) {
      throw json(
        { message: "You must be logged in to do that!" },
        { status: 401 },
      );
    }

    return next({ context: { userSession: context.userSession } });
  });

export const updateUser = createServerFn()
  .validator(UserMetaSchema)
  .middleware([userRequiredMiddleware])
  .handler(async ({ data, context: { userSession } }) => {
    await prisma.user.update({
      where: {
        id: userSession.user.id,
      },
      data: {
        name: data.username,
      },
    });
  });


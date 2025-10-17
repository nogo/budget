import { createMiddleware, json } from "@tanstack/react-start";
import { auth } from "./server";

export const userRequiredMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    try {
      if (!request) {
        console.error("[Auth Middleware] Request object is undefined");
        throw new Error("Web request in userRequiredMiddleware is undefined");
      }

      const userSession = await auth.api.getSession({
        headers: request.headers,
      });

      if (!userSession) {
        console.warn("[Auth Middleware] Unauthorized access attempt", {
          path: request.url,
          ip:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip"),
        });

        throw json(
          { message: "You must be logged in to do that!" },
          { status: 401 },
        );
      }

      return next({ context: { userSession } });
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }

      console.error("[Auth Middleware] Unexpected error:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw json({ message: "Authentication error occurred" }, { status: 500 });
    }
  },
);

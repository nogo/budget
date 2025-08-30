import { createMiddleware, json } from "@tanstack/react-start"
import { auth } from "./server"

export const userRequiredMiddleware = createMiddleware({ type: "request" })
  .server(async ({ next, request }) => {    
    const userSession = await auth.api.getSession({ headers: request.headers })

    if (!userSession) {
      throw json(
        { message: "You must be logged in to do that!" },
        { status: 401 },
      )
    }

    return next({ context: { userSession } })
  })

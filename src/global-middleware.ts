import { registerGlobalMiddleware } from '@tanstack/react-start'
import { userRequiredMiddleware } from './lib/auth/middleware'

registerGlobalMiddleware({
  middleware: [userRequiredMiddleware],
})
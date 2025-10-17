import { QueryClient } from "@tanstack/react-query";

// Router context type for TanStack Router
export interface AppRouterContext {
  queryClient: QueryClient;
  isAuthenticated: boolean;
  userSession: UserSession | null;
}

// User session type returned from Better Auth
export interface UserSession {
  user: User;
  session: Session;
}

// Auth state for error handling
export interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

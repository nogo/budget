import { z } from "zod";

export const UserMetaSchema = z.object({
  username: z.string().min(3).max(20),
});

export type UserMeta = z.infer<typeof UserMetaSchema>;

// TODO: Refine password === confirmPassword
export const JoinSchema = z.object({
  name: z.string().min(3).max(45),
  username: z.string().min(3).max(20),
  email: z.email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
});

export type JoinSchema = z.infer<typeof JoinSchema>;

export const LogInSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type LogInSchema = z.infer<typeof LogInSchema>;

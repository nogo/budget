import { z } from "zod/v4";

export const IdSchema = z.object({
  id: z.coerce.number(),
});

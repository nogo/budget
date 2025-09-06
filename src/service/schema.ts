import { z } from "zod";

export const IdSchema = z.object({
  id: z.coerce.number().refine(val => !isNaN(val) && val > 0, {
    message: "ID must be a valid positive number"
  }),
});

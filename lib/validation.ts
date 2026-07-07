import { z } from "zod";

export const contactDetailsSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"),
  email: z.string().trim().email("Please enter a valid email address"),
});

export type ContactDetailsInput = z.infer<typeof contactDetailsSchema>;

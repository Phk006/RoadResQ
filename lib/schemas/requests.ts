import { z } from "zod";

export const fuelRequestSchema = z.object({
  contactPhone: z.string().trim().min(7).max(24).refine((value) => /\d/.test(value), "Contact phone must contain digits"),
  customerName: z.string().trim().min(1).max(120).optional(),
  idempotencyKey: z.string().trim().min(8).max(128),
  fuelType: z.enum(["PETROL", "DIESEL"]),
  quantityLitres: z.coerce.number().positive().max(20),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  priority: z.enum(["NORMAL", "HIGH"]).default("NORMAL"),
  requestChannel: z.enum(["WEB", "SMS", "VOICE", "OPS"]).default("WEB")
});
export type FuelRequestInput = z.infer<typeof fuelRequestSchema>;

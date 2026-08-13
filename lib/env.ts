import { z } from "zod";

function emptyToUndefined(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const environmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_MAP_PROVIDER: z.enum(["mock", "mapbox"]).default("mock"),
  NEXT_PUBLIC_DELIVERY_FEE: z.coerce.number().nonnegative().default(49),
  NEXT_PUBLIC_EMERGENCY_FEE: z.coerce.number().nonnegative().default(99),
  NEXT_PUBLIC_PETROL_PRICE_PER_LITRE: z.coerce.number().positive().default(112),
  NEXT_PUBLIC_DIESEL_PRICE_PER_LITRE: z.coerce.number().positive().default(98),
  DISPATCH_ETA_WEIGHT: z.coerce.number().nonnegative().default(0.3),
  DISPATCH_DISTANCE_WEIGHT: z.coerce.number().nonnegative().default(0.2),
  DISPATCH_AVAILABILITY_WEIGHT: z.coerce.number().nonnegative().default(0.15),
  DISPATCH_CAPACITY_WEIGHT: z.coerce.number().nonnegative().default(0.1),
  DISPATCH_RELIABILITY_WEIGHT: z.coerce.number().nonnegative().default(0.15),
  DISPATCH_WORKLOAD_WEIGHT: z.coerce.number().nonnegative().default(0.1),
  DISPATCH_HIGH_PRIORITY_BOOST: z.coerce.number().nonnegative().default(0.05),
  INITIAL_RADIUS_KM: z.coerce.number().positive().default(10),
  MAX_RADIUS_KM: z.coerce.number().positive().default(15),
  DISPATCH_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(60),
  SLA_MINUTES: z.coerce.number().int().positive().default(45),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  FUEL10_SUPPORT_NUMBER: z.string().min(1).optional(),
  HELP_LINE_EMAIL_TO: z.string().email().optional(),
  HELP_LINE_EMAIL_FROM: z.string().email().optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional()
});

export const env = environmentSchema.parse({
  NEXT_PUBLIC_APP_URL: emptyToUndefined(process.env.NEXT_PUBLIC_APP_URL),
  NEXT_PUBLIC_MAP_PROVIDER: emptyToUndefined(process.env.NEXT_PUBLIC_MAP_PROVIDER),
  NEXT_PUBLIC_DELIVERY_FEE: emptyToUndefined(process.env.NEXT_PUBLIC_DELIVERY_FEE),
  NEXT_PUBLIC_EMERGENCY_FEE: emptyToUndefined(process.env.NEXT_PUBLIC_EMERGENCY_FEE),
  NEXT_PUBLIC_PETROL_PRICE_PER_LITRE: emptyToUndefined(process.env.NEXT_PUBLIC_PETROL_PRICE_PER_LITRE),
  NEXT_PUBLIC_DIESEL_PRICE_PER_LITRE: emptyToUndefined(process.env.NEXT_PUBLIC_DIESEL_PRICE_PER_LITRE),
  DISPATCH_ETA_WEIGHT: emptyToUndefined(process.env.DISPATCH_ETA_WEIGHT),
  DISPATCH_DISTANCE_WEIGHT: emptyToUndefined(process.env.DISPATCH_DISTANCE_WEIGHT),
  DISPATCH_AVAILABILITY_WEIGHT: emptyToUndefined(process.env.DISPATCH_AVAILABILITY_WEIGHT),
  DISPATCH_CAPACITY_WEIGHT: emptyToUndefined(process.env.DISPATCH_CAPACITY_WEIGHT),
  DISPATCH_RELIABILITY_WEIGHT: emptyToUndefined(process.env.DISPATCH_RELIABILITY_WEIGHT),
  DISPATCH_WORKLOAD_WEIGHT: emptyToUndefined(process.env.DISPATCH_WORKLOAD_WEIGHT),
  DISPATCH_HIGH_PRIORITY_BOOST: emptyToUndefined(process.env.DISPATCH_HIGH_PRIORITY_BOOST),
  INITIAL_RADIUS_KM: emptyToUndefined(process.env.INITIAL_RADIUS_KM),
  MAX_RADIUS_KM: emptyToUndefined(process.env.MAX_RADIUS_KM),
  DISPATCH_TIMEOUT_SECONDS: emptyToUndefined(process.env.DISPATCH_TIMEOUT_SECONDS),
  SLA_MINUTES: emptyToUndefined(process.env.SLA_MINUTES),
  SUPABASE_URL: emptyToUndefined(process.env.SUPABASE_URL),
  SUPABASE_ANON_KEY: emptyToUndefined(process.env.SUPABASE_ANON_KEY),
  SUPABASE_SERVICE_ROLE_KEY: emptyToUndefined(process.env.SUPABASE_SERVICE_ROLE_KEY),
  FUEL10_SUPPORT_NUMBER: emptyToUndefined(process.env.FUEL10_SUPPORT_NUMBER),
  HELP_LINE_EMAIL_TO: emptyToUndefined(process.env.HELP_LINE_EMAIL_TO),
  HELP_LINE_EMAIL_FROM: emptyToUndefined(process.env.HELP_LINE_EMAIL_FROM),
  SMTP_HOST: emptyToUndefined(process.env.SMTP_HOST),
  SMTP_PORT: emptyToUndefined(process.env.SMTP_PORT),
  SMTP_USER: emptyToUndefined(process.env.SMTP_USER),
  SMTP_PASS: emptyToUndefined(process.env.SMTP_PASS)
});

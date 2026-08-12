import { env } from "@/lib/env";
import type { FuelType } from "@/lib/domain";

export type PriceQuote = { fuelSubtotal: number; deliveryFee: number; emergencyFee: number; total: number; currency: "INR" };
export function calculatePrice(litres: number, fuelPricePerLitre: number): PriceQuote {
  if (litres <= 0 || fuelPricePerLitre <= 0) throw new Error("Quantity and fuel price must be positive");
  const fuelSubtotal = Math.round(litres * fuelPricePerLitre * 100) / 100;
  const total = fuelSubtotal + env.NEXT_PUBLIC_DELIVERY_FEE + env.NEXT_PUBLIC_EMERGENCY_FEE;
  return { fuelSubtotal, deliveryFee: env.NEXT_PUBLIC_DELIVERY_FEE, emergencyFee: env.NEXT_PUBLIC_EMERGENCY_FEE, total, currency: "INR" };
}

export function getEstimatedFuelPricePerLitre(fuelType: FuelType) {
  return fuelType === "PETROL" ? env.NEXT_PUBLIC_PETROL_PRICE_PER_LITRE : env.NEXT_PUBLIC_DIESEL_PRICE_PER_LITRE;
}

import type { FuelType } from "@/lib/domain";

export type ParsedFuelSms = { quantityLitres: number; fuelType: FuelType };
export function parseFuelSms(message: string): ParsedFuelSms {
  const match = /^FUEL\s+(\d+(?:\.\d+)?)\s+(PETROL|DIESEL)$/i.exec(message.trim());
  if (!match) throw new Error("Expected format: FUEL <litres> <PETROL|DIESEL>");
  const quantityLitres = Number(match[1]);
  if (!Number.isFinite(quantityLitres) || quantityLitres <= 0 || quantityLitres > 20) throw new Error("Fuel quantity must be between 0 and 20 litres");
  return { quantityLitres, fuelType: match[2].toUpperCase() as FuelType };
}

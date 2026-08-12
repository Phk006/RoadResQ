export const roles = ["CUSTOMER", "FUEL_PARTNER", "DELIVERY_AGENT", "OPERATIONS_ADMIN", "SUPER_ADMIN"] as const;
export type Role = (typeof roles)[number];
export const fuelTypes = ["PETROL", "DIESEL"] as const;
export type FuelType = (typeof fuelTypes)[number];
export type Coordinates = { latitude: number; longitude: number; accuracy?: number; timestamp: Date };

import type { Role } from "@/lib/domain";

export function requireRole(actualRole: Role | undefined, allowedRoles: readonly Role[]): asserts actualRole is Role {
  if (!actualRole || !allowedRoles.includes(actualRole)) throw new Error("Forbidden");
}

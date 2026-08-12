import type { Role } from "@prisma/client";

/**
 * Role-based access control.
 *
 * Permissions are coarse-grained capabilities. Each role maps to the set of
 * capabilities it is granted; `can()` is the single check used by server
 * actions, route handlers, and layouts.
 */
export type Permission =
  | "catalog:read"
  | "product:write"
  | "order:read:own"
  | "order:read:vendor"
  | "order:read:all"
  | "payout:read:own"
  | "vendor:manage"
  | "vendor:approve"
  | "user:manage"
  | "admin:access";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  CUSTOMER: ["catalog:read", "order:read:own"],
  VENDOR: [
    "catalog:read",
    "product:write",
    "order:read:vendor",
    "payout:read:own",
    "vendor:manage",
  ],
  ADMIN: [
    "catalog:read",
    "product:write",
    "order:read:all",
    "vendor:approve",
    "user:manage",
    "admin:access",
  ],
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Throw when the role lacks a permission — used to guard server actions. */
export class ForbiddenError extends Error {
  constructor(permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "ForbiddenError";
  }
}

export function assertCan(role: Role | undefined | null, permission: Permission): void {
  if (!can(role, permission)) throw new ForbiddenError(permission);
}

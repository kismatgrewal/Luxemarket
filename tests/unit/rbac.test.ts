import { describe, expect, it } from "vitest";

import { assertCan, can, ForbiddenError, type Permission } from "@/lib/rbac";

// Prisma's `Role` is a plain string-literal union; we redeclare it locally so
// the suite runs even when `@prisma/client` has not been generated yet.
type Role = "CUSTOMER" | "VENDOR" | "ADMIN";

const ROLES: Role[] = ["CUSTOMER", "VENDOR", "ADMIN"];

// Every capability the RBAC layer knows about. Kept in one place so the matrix
// test below fails loudly if a new permission is added without a grant decision.
const ALL_PERMISSIONS: Permission[] = [
  "catalog:read",
  "product:write",
  "order:read:own",
  "order:read:vendor",
  "order:read:all",
  "payout:read:own",
  "vendor:manage",
  "vendor:approve",
  "user:manage",
  "admin:access",
];

// The expected grant set per role — the specification the source must satisfy.
const GRANTED: Record<Role, Permission[]> = {
  CUSTOMER: ["catalog:read", "order:read:own"],
  VENDOR: ["catalog:read", "product:write", "order:read:vendor", "payout:read:own", "vendor:manage"],
  ADMIN: [
    "catalog:read",
    "product:write",
    "order:read:all",
    "vendor:approve",
    "user:manage",
    "admin:access",
  ],
};

describe("can()", () => {
  it("covers every permission for every role via the grant matrix", () => {
    for (const role of ROLES) {
      for (const permission of ALL_PERMISSIONS) {
        const expected = GRANTED[role].includes(permission);
        expect(can(role, permission), `${role} -> ${permission}`).toBe(expected);
      }
    }
  });

  it("grants a customer only catalog reads and their own orders", () => {
    expect(can("CUSTOMER", "catalog:read")).toBe(true);
    expect(can("CUSTOMER", "order:read:own")).toBe(true);
    // A customer may not write products or reach anything vendor/admin scoped.
    expect(can("CUSTOMER", "product:write")).toBe(false);
    expect(can("CUSTOMER", "order:read:all")).toBe(false);
    expect(can("CUSTOMER", "admin:access")).toBe(false);
  });

  it("grants a vendor product + store management but never admin capabilities", () => {
    expect(can("VENDOR", "product:write")).toBe(true);
    expect(can("VENDOR", "order:read:vendor")).toBe(true);
    expect(can("VENDOR", "payout:read:own")).toBe(true);
    expect(can("VENDOR", "vendor:manage")).toBe(true);

    // The headline privilege-escalation guard: a vendor is not an admin.
    expect(can("VENDOR", "admin:access")).toBe(false);
    expect(can("VENDOR", "vendor:approve")).toBe(false);
    expect(can("VENDOR", "user:manage")).toBe(false);
    expect(can("VENDOR", "order:read:all")).toBe(false);
  });

  it("grants an admin the console, approvals, and user management", () => {
    expect(can("ADMIN", "admin:access")).toBe(true);
    expect(can("ADMIN", "vendor:approve")).toBe(true);
    expect(can("ADMIN", "user:manage")).toBe(true);
    expect(can("ADMIN", "order:read:all")).toBe(true);
    // Admins are not vendors: no vendor-scoped payout/manage grants.
    expect(can("ADMIN", "payout:read:own")).toBe(false);
    expect(can("ADMIN", "vendor:manage")).toBe(false);
    expect(can("ADMIN", "order:read:vendor")).toBe(false);
  });

  it("catalog:read is the only permission shared by all three roles", () => {
    for (const role of ROLES) {
      expect(can(role, "catalog:read")).toBe(true);
    }
  });

  it("denies everything for an absent role (unauthenticated request)", () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(can(undefined, permission)).toBe(false);
      expect(can(null, permission)).toBe(false);
    }
  });
});

describe("assertCan()", () => {
  it("returns void without throwing when the role holds the permission", () => {
    expect(() => assertCan("ADMIN", "admin:access")).not.toThrow();
    expect(() => assertCan("VENDOR", "product:write")).not.toThrow();
    expect(() => assertCan("CUSTOMER", "catalog:read")).not.toThrow();
    expect(assertCan("ADMIN", "user:manage")).toBeUndefined();
  });

  it("throws ForbiddenError when the role lacks the permission", () => {
    expect(() => assertCan("VENDOR", "admin:access")).toThrow(ForbiddenError);
    expect(() => assertCan("CUSTOMER", "product:write")).toThrow(ForbiddenError);
    expect(() => assertCan(null, "catalog:read")).toThrow(ForbiddenError);
  });

  it("surfaces the missing permission on the thrown error", () => {
    try {
      assertCan("VENDOR", "vendor:approve");
      expect.unreachable("assertCan should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenError);
      const forbidden = error as ForbiddenError;
      expect(forbidden.name).toBe("ForbiddenError");
      expect(forbidden.message).toBe("Missing permission: vendor:approve");
      // Still a real Error so generic error handlers keep working.
      expect(forbidden).toBeInstanceOf(Error);
    }
  });
});

describe("ForbiddenError", () => {
  it("is constructable directly and embeds the permission", () => {
    const err = new ForbiddenError("admin:access");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ForbiddenError");
    expect(err.message).toContain("admin:access");
  });
});

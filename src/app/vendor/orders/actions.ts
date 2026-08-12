"use server";

import { revalidatePath } from "next/cache";
import type { FulfillmentStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { advanceFulfillment } from "@/server/services/orders";

/**
 * Advance a single order line's fulfillment state (e.g. packed → shipped).
 * The service enforces that the line item belongs to the calling vendor; this
 * wrapper adds the coarse role gate and revalidates the affected views.
 */
export async function advanceFulfillmentAction(
  orderItemId: string,
  status: FulfillmentStatus,
): Promise<void> {
  const user = await getCurrentUser();
  assertCan(user?.role, "order:read:vendor");

  await advanceFulfillment(orderItemId, status);

  revalidatePath("/vendor/orders");
  revalidatePath("/vendor");
}

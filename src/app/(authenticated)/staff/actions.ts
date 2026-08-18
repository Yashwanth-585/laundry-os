"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/*
 * Facility workflow — authorized staff may only move an order
 * forward one step along this chain. No other status is reachable
 * from this action.
 */
const allowedTransitions: Record<string, string> = {
    PICKED_UP: "AT_FACILITY",
    AT_FACILITY: "IN_PROCESS",
    IN_PROCESS: "READY",
};

type ActionResult =
    | { success: true; nextStatus: string }
    | { success: false; error: string };

export async function advanceOrderStatus(
    orderId: string,
    currentStatus: string,
): Promise<ActionResult> {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: "Not authenticated." };
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || profile.role !== "vendor") {
        return { success: false, error: "Not authorized." };
    }

    const nextStatus = allowedTransitions[currentStatus];

    if (!nextStatus) {
        return {
            success: false,
            error: "This status cannot be advanced by staff.",
        };
    }

    // Re-check the order server-side so a stale client can't
    // skip a step. There is a single shared facility, so every
    // authorized staff member may act on every facility order —
    // no per-vendor ownership check is needed here.
    const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, status")
        .eq("id", orderId)
        .single();

    if (orderError || !order) {
        return { success: false, error: "Order not found." };
    }

    if (order.status !== currentStatus) {
        return {
            success: false,
            error: "Order status has already changed. Refresh and try again.",
        };
    }

    const { error: updateError } = await supabase
        .from("orders")
        .update({
            status: nextStatus,
            updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

    if (updateError) {
        console.error("STAFF ORDER UPDATE ERROR:", updateError);

        return {
            success: false,
            error: "Failed to update order status.",
        };
    }

    const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
            order_id: orderId,
            status: nextStatus,
            changed_by: user.id,
        });

    if (historyError) {
        // Status already updated — log but don't fail the action for this.
        console.error("STAFF ORDER HISTORY ERROR:", historyError);
    }

    revalidatePath("/staff");

    return { success: true, nextStatus };
}
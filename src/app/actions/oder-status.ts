"use server";

import { createClient } from "@/lib/supabase/server";

type OrderStatus =
    | "PLACED"
    | "PICKUP_ASSIGNED"
    | "OUT_FOR_PICKUP"
    | "PICKED_UP"
    | "AT_FACILITY"
    | "IN_PROCESS"
    | "READY"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED"
    | "ON_HOLD"
    | "RETURNED";

const allowedTransitions: Record<
    OrderStatus,
    OrderStatus[]
> = {
    PLACED: ["PICKUP_ASSIGNED", "CANCELLED", "ON_HOLD"],

    PICKUP_ASSIGNED: [
        "OUT_FOR_PICKUP",
        "CANCELLED",
        "ON_HOLD",
    ],

    OUT_FOR_PICKUP: [
        "PICKED_UP",
        "ON_HOLD",
        "RETURNED",
    ],

    PICKED_UP: [
        "AT_FACILITY",
        "ON_HOLD",
        "RETURNED",
    ],

    AT_FACILITY: [
        "IN_PROCESS",
        "ON_HOLD",
    ],

    IN_PROCESS: [
        "READY",
        "ON_HOLD",
    ],

    READY: [
        "OUT_FOR_DELIVERY",
        "ON_HOLD",
    ],

    OUT_FOR_DELIVERY: [
        "DELIVERED",
        "ON_HOLD",
        "RETURNED",
    ],

    DELIVERED: [],

    CANCELLED: [],

    ON_HOLD: [
        "PICKUP_ASSIGNED",
        "OUT_FOR_PICKUP",
        "PICKED_UP",
        "AT_FACILITY",
        "IN_PROCESS",
        "READY",
        "OUT_FOR_DELIVERY",
        "CANCELLED",
        "RETURNED",
    ],

    RETURNED: [],
};

export async function updateOrderStatusAction({
    orderId,
    newStatus,
    notes,
}: {
    orderId: string;
    newStatus: OrderStatus;
    notes?: string;
}) {
    const supabase = await createClient();

    /* ----------------------------------------------------------
       AUTH
       ---------------------------------------------------------- */

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            success: false,
            error: "Your session has expired. Please sign in again.",
        };
    }

    /* ----------------------------------------------------------
       ROLE
       ---------------------------------------------------------- */

    const { data: profile, error: profileError } =
        await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

    if (profileError || !profile) {
        return {
            success: false,
            error: "Unable to determine your account role.",
        };
    }

    const role = profile.role as
        | "customer"
        | "delivery_partner"
        | "vendor"
        | "admin";

    if (
        role !== "admin" &&
        role !== "vendor" &&
        role !== "delivery_partner"
    ) {
        return {
            success: false,
            error: "You are not authorized to update order status.",
        };
    }

    /* ----------------------------------------------------------
       GET CURRENT ORDER
       ---------------------------------------------------------- */

    const { data: order, error: orderError } =
        await supabase
            .from("orders")
            .select(
                `
                id,
                status,
                vendor_id
                `,
            )
            .eq("id", orderId)
            .single();

    if (orderError || !order) {
        return {
            success: false,
            error: "Order not found.",
        };
    }

    const currentStatus =
        order.status as OrderStatus;

    /* ----------------------------------------------------------
       VALIDATE TRANSITION
       ---------------------------------------------------------- */

    const possibleTransitions =
        allowedTransitions[currentStatus] ?? [];

    if (
        !possibleTransitions.includes(
            newStatus,
        )
    ) {
        return {
            success: false,
            error: `Invalid status transition: ${currentStatus} → ${newStatus}.`,
        };
    }

    /* ----------------------------------------------------------
       ROLE-SPECIFIC STATUS PERMISSIONS
       ---------------------------------------------------------- */

    if (role === "delivery_partner") {
        const allowedForRider: OrderStatus[] = [
            "OUT_FOR_PICKUP",
            "PICKED_UP",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "ON_HOLD",
            "RETURNED",
        ];

        if (
            !allowedForRider.includes(newStatus)
        ) {
            return {
                success: false,
                error:
                    "Delivery partners cannot perform this status update.",
            };
        }

        const { data: task } =
            await supabase
                .from("delivery_tasks")
                .select("id")
                .eq("order_id", orderId)
                .eq(
                    "delivery_partner_id",
                    (
                        await supabase
                            .from("delivery_partners")
                            .select("id")
                            .eq(
                                "profile_id",
                                user.id,
                            )
                            .single()
                    ).data?.id ?? "",
                )
                .maybeSingle();

        if (!task) {
            return {
                success: false,
                error:
                    "This order is not assigned to you.",
            };
        }
    }

    if (role === "vendor") {
        const { data: vendor } =
            await supabase
                .from("vendors")
                .select("id")
                .eq(
                    "profile_id",
                    user.id,
                )
                .single();

        if (
            !vendor ||
            order.vendor_id !== vendor.id
        ) {
            return {
                success: false,
                error:
                    "This order is not assigned to your facility.",
            };
        }

        const allowedForVendor: OrderStatus[] = [
            "AT_FACILITY",
            "IN_PROCESS",
            "READY",
            "ON_HOLD",
            "RETURNED",
        ];

        if (
            !allowedForVendor.includes(
                newStatus,
            )
        ) {
            return {
                success: false,
                error:
                    "Your facility cannot perform this status update.",
            };
        }
    }

    /* ----------------------------------------------------------
       UPDATE ORDER
       ---------------------------------------------------------- */

    const { data: updatedOrder, error: updateError } =
        await supabase
            .from("orders")
            .update({
                status: newStatus,
                updated_at: new Date().toISOString(),
            })
            .eq("id", orderId)
            .select("id, status")
            .single();

    if (updateError || !updatedOrder) {
        console.error(
            "ORDER STATUS UPDATE ERROR:",
            updateError,
        );

        return {
            success: false,
            error:
                "Unable to update the order status.",
        };
    }

    /* ----------------------------------------------------------
       HISTORY
       ---------------------------------------------------------- */

    const { error: historyError } =
        await supabase
            .from("order_status_history")
            .insert({
                order_id: orderId,
                status: newStatus,
                changed_by: user.id,
                notes:
                    notes?.trim() ||
                    null,
            });

    if (historyError) {
        console.error(
            "ORDER HISTORY ERROR:",
            historyError,
        );

        /*
         * The order status was already changed.
         * Do not pretend the entire operation failed.
         * Return success but flag the history problem.
         */
        return {
            success: true,
            warning:
                "Order status updated, but status history could not be recorded.",
            orderId,
            status: newStatus,
        };
    }

    return {
        success: true,
        orderId,
        status: newStatus,
    };
}
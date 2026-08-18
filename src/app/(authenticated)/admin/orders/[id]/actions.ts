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
    PLACED: [
        "PICKUP_ASSIGNED",
        "CANCELLED",
        "ON_HOLD",
    ],

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

/*
|--------------------------------------------------------------------------
| UPDATE ORDER STATUS
|--------------------------------------------------------------------------
*/

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

    /*
     * ADMIN CHECK
     */

    const { data: profile, error: profileError } =
        await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

    if (
        profileError ||
        !profile ||
        profile.role !== "admin"
    ) {
        return {
            success: false,
            error: "You are not authorized to update order status.",
        };
    }

    /*
     * FETCH CURRENT ORDER
     */

    const { data: order, error: orderError } =
        await supabase
            .from("orders")
            .select("id, status")
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

    /*
     * VALIDATE TRANSITION
     */

    const validNextStatuses =
        allowedTransitions[currentStatus] ?? [];

    if (!validNextStatuses.includes(newStatus)) {
        return {
            success: false,
            error:
                `Order cannot move from ${currentStatus} to ${newStatus}.`,
        };
    }

    /*
     * DELIVERY SAFETY
     *
     * An order cannot be moved to OUT_FOR_DELIVERY
     * unless a DROP task has been assigned.
     */

    if (newStatus === "OUT_FOR_DELIVERY") {
        const { data: deliveryTask, error: deliveryTaskError } =
            await supabase
                .from("delivery_tasks")
                .select(
                    "id, delivery_partner_id, status",
                )
                .eq("order_id", orderId)
                .eq("task_type", "DROP")
                .maybeSingle();

        if (deliveryTaskError) {
            console.error(
                "CHECK DELIVERY TASK ERROR:",
                deliveryTaskError,
            );

            return {
                success: false,
                error:
                    "Unable to verify the delivery assignment.",
            };
        }

        if (!deliveryTask) {
            return {
                success: false,
                error:
                    "Assign a delivery partner before sending this order out for delivery.",
            };
        }

        if (!deliveryTask.delivery_partner_id) {
            return {
                success: false,
                error:
                    "The delivery task does not have a delivery partner assigned.",
            };
        }

        if (
            deliveryTask.status === "COMPLETED" ||
            deliveryTask.status === "CANCELLED"
        ) {
            return {
                success: false,
                error:
                    "The current delivery task cannot be used for delivery.",
            };
        }
    }

    /*
     * UPDATE ORDER
     */

    const now = new Date().toISOString();

    const { data: updatedOrder, error: updateError } =
        await supabase
            .from("orders")
            .update({
                status: newStatus,
                updated_at: now,
            })
            .eq("id", orderId)
            .eq("status", currentStatus)
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
                "Unable to update the order status. Please refresh and try again.",
        };
    }

    /*
     * STATUS HISTORY
     */

    const { error: historyError } =
        await supabase
            .from("order_status_history")
            .insert({
                order_id: orderId,
                status: newStatus,
                changed_by: user.id,
                notes:
                    notes?.trim() ||
                    `Order status changed from ${currentStatus} to ${newStatus}.`,
                created_at: now,
            });

    if (historyError) {
        console.error(
            "ORDER HISTORY ERROR:",
            historyError,
        );

        return {
            success: true,
            warning:
                "Order status was updated, but the status history could not be recorded.",
        };
    }

    return {
        success: true,
        orderId,
        status: newStatus,
    };
}

/*
|--------------------------------------------------------------------------
| ASSIGN DELIVERY PARTNER
|--------------------------------------------------------------------------
|
| This is specifically for the CUSTOMER DELIVERY / DROP phase.
|
| READY
|   ↓
| DROP task ASSIGNED
|   ↓
| OUT_FOR_DELIVERY
|
*/

export async function assignDeliveryPartnerAction({
    orderId,
    deliveryPartnerId,
}: {
    orderId: string;
    deliveryPartnerId: string;
}) {
    const supabase = await createClient();

    /*
     * AUTH
     */

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            success: false,
            error:
                "Your session has expired. Please sign in again.",
        };
    }

    /*
     * ADMIN ROLE
     */

    const { data: profile, error: profileError } =
        await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

    if (
        profileError ||
        !profile ||
        profile.role !== "admin"
    ) {
        return {
            success: false,
            error:
                "You are not authorized to assign delivery partners.",
        };
    }

    /*
     * ORDER
     */

    const { data: order, error: orderError } =
        await supabase
            .from("orders")
            .select("id, status")
            .eq("id", orderId)
            .single();

    if (orderError || !order) {
        return {
            success: false,
            error: "Order not found.",
        };
    }

    /*
     * DELIVERY CAN ONLY BE ASSIGNED
     * WHEN LAUNDRY IS READY.
     */

    if (
        order.status !== "READY" &&
        order.status !== "OUT_FOR_DELIVERY"
    ) {
        return {
            success: false,
            error:
                "A delivery partner can only be assigned when the order is ready for delivery.",
        };
    }

    /*
     * DELIVERY PARTNER
     */

    const {
        data: deliveryPartner,
        error: partnerError,
    } = await supabase
        .from("delivery_partners")
        .select(
            `
            id,
            profile_id,
            is_available,
            is_active,
            is_approved
            `,
        )
        .eq("id", deliveryPartnerId)
        .single();

    if (partnerError || !deliveryPartner) {
        return {
            success: false,
            error: "Delivery partner not found.",
        };
    }

    if (!deliveryPartner.is_active) {
        return {
            success: false,
            error:
                "This delivery partner is inactive.",
        };
    }

    if (!deliveryPartner.is_approved) {
        return {
            success: false,
            error:
                "This delivery partner has not been approved.",
        };
    }

    if (!deliveryPartner.is_available) {
        return {
            success: false,
            error:
                "This delivery partner is currently unavailable.",
        };
    }

    /*
     * CHECK EXISTING DROP TASK
     */

    const {
        data: existingTask,
        error: existingTaskError,
    } = await supabase
        .from("delivery_tasks")
        .select(
            "id, delivery_partner_id, status",
        )
        .eq("order_id", orderId)
        .eq("task_type", "DROP")
        .maybeSingle();

    if (existingTaskError) {
        console.error(
            "EXISTING DROP TASK ERROR:",
            existingTaskError,
        );

        return {
            success: false,
            error:
                "Unable to check the existing delivery task.",
        };
    }

    /*
     * UPDATE EXISTING TASK
     */

    if (existingTask) {
        if (existingTask.status === "COMPLETED") {
            return {
                success: false,
                error:
                    "The delivery has already been completed.",
            };
        }

        const now = new Date().toISOString();

        const {
            error: updateTaskError,
        } = await supabase
            .from("delivery_tasks")
            .update({
                delivery_partner_id:
                    deliveryPartnerId,
                status: "ASSIGNED",
                assigned_at: now,
                accepted_at: null,
                started_at: null,
                completed_at: null,
                delivery_otp: null,
                delivery_otp_verified_at: null,
                updated_at: now,
            })
            .eq("id", existingTask.id);

        if (updateTaskError) {
            console.error(
                "UPDATE DROP TASK ERROR:",
                updateTaskError,
            );

            return {
                success: false,
                error:
                    "Unable to assign the delivery partner.",
            };
        }

        return {
            success: true,
            orderId,
            taskId: existingTask.id,
            status: "ASSIGNED",
            message:
                "Delivery partner assigned successfully.",
        };
    }

    /*
     * CREATE DROP TASK
     */

    const now = new Date().toISOString();

    const {
        data: task,
        error: taskError,
    } = await supabase
        .from("delivery_tasks")
        .insert({
            order_id: orderId,
            delivery_partner_id:
                deliveryPartnerId,
            task_type: "DROP",
            status: "ASSIGNED",
            assigned_at: now,
        })
        .select("id")
        .single();

    if (taskError || !task) {
        console.error(
            "DROP TASK CREATE ERROR:",
            taskError,
        );

        return {
            success: false,
            error:
                "Unable to assign the delivery partner.",
        };
    }

    /*
     * IF ORDER IS READY, KEEP IT READY.
     *
     * Admin can explicitly move it to
     * OUT_FOR_DELIVERY after assignment.
     */

    if (order.status === "READY") {
        const {
            error: historyError,
        } = await supabase
            .from("order_status_history")
            .insert({
                order_id: orderId,
                status: "READY",
                changed_by: user.id,
                notes:
                    "Delivery partner assigned and order is ready for dispatch.",
                created_at: now,
            });

        if (historyError) {
            console.error(
                "DELIVERY ASSIGNMENT HISTORY ERROR:",
                historyError,
            );

            return {
                success: true,
                warning:
                    "Delivery partner assigned, but the assignment history could not be recorded.",
                orderId,
                taskId: task.id,
                status: "READY",
            };
        }
    }

    return {
        success: true,
        orderId,
        taskId: task.id,
        status: "ASSIGNED",
        message:
            "Delivery partner assigned successfully.",
    };
}
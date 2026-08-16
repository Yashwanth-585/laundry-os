"use server";

import { createClient } from "@/lib/supabase/server";

export async function assignDeliveryPartnerAction({
    orderId,
    deliveryPartnerId,
}: {
    orderId: string;
    deliveryPartnerId: string;
}) {
    const supabase = await createClient();

    // ----------------------------------------------------------
    // AUTH
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // ADMIN ROLE
    // ----------------------------------------------------------

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
            error: "You are not authorized to assign delivery partners.",
        };
    }

    // ----------------------------------------------------------
    // ORDER
    // ----------------------------------------------------------

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

    if (order.status !== "PLACED") {
        return {
            success: false,
            error:
                "A delivery partner can only be assigned to an order that is currently placed.",
        };
    }

    // ----------------------------------------------------------
    // DELIVERY PARTNER
    // ----------------------------------------------------------

    const { data: deliveryPartner, error: partnerError } =
        await supabase
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
            error: "This delivery partner is inactive.",
        };
    }

    if (!deliveryPartner.is_approved) {
        return {
            success: false,
            error: "This delivery partner has not been approved.",
        };
    }

    if (!deliveryPartner.is_available) {
        return {
            success: false,
            error: "This delivery partner is currently unavailable.",
        };
    }

    // ----------------------------------------------------------
    // CHECK EXISTING TASK
    // ----------------------------------------------------------

    const { data: existingTask, error: existingTaskError } =
        await supabase
            .from("delivery_tasks")
            .select("id, delivery_partner_id, status")
            .eq("order_id", orderId)
            .eq("task_type", "PICKUP")
            .maybeSingle();

    if (existingTaskError) {
        console.error(
            "EXISTING DELIVERY TASK ERROR:",
            existingTaskError,
        );

        return {
            success: false,
            error: "Unable to check the existing delivery task.",
        };
    }

    if (existingTask) {
        return {
            success: false,
            error: "A pickup task already exists for this order.",
        };
    }

    // ----------------------------------------------------------
    // CREATE PICKUP TASK
    // ----------------------------------------------------------

    const { data: task, error: taskError } =
        await supabase
            .from("delivery_tasks")
            .insert({
                order_id: orderId,
                delivery_partner_id: deliveryPartnerId,
                task_type: "PICKUP",
                status: "ASSIGNED",
                assigned_at: new Date().toISOString(),
            })
            .select("id")
            .single();

    if (taskError || !task) {
        console.error(
            "DELIVERY TASK CREATE ERROR:",
            taskError,
        );

        return {
            success: false,
            error: "Unable to assign the delivery partner.",
        };
    }

    // ----------------------------------------------------------
    // UPDATE ORDER STATUS
    // ----------------------------------------------------------

    const { data: updatedOrder, error: updateError } =
        await supabase
            .from("orders")
            .update({
                status: "PICKUP_ASSIGNED",
                updated_at: new Date().toISOString(),
            })
            .eq("id", orderId)
            .eq("status", "PLACED")
            .select("id, status")
            .single();

    if (updateError || !updatedOrder) {
        console.error(
            "ORDER STATUS UPDATE ERROR:",
            updateError,
        );

        // Roll back the task because the order status could not
        // be changed.
        await supabase
            .from("delivery_tasks")
            .delete()
            .eq("id", task.id);

        return {
            success: false,
            error: "Unable to update the order status.",
        };
    }

    // ----------------------------------------------------------
    // STATUS HISTORY
    // ----------------------------------------------------------

    const { error: historyError } =
        await supabase
            .from("order_status_history")
            .insert({
                order_id: orderId,
                status: "PICKUP_ASSIGNED",
                changed_by: user.id,
                notes: "Delivery partner assigned by admin.",
            });

    if (historyError) {
        console.error(
            "ORDER HISTORY ERROR:",
            historyError,
        );

        return {
            success: true,
            warning:
                "Delivery partner assigned and order updated, but status history could not be recorded.",
            orderId,
            taskId: task.id,
            status: "PICKUP_ASSIGNED",
        };
    }

    return {
        success: true,
        orderId,
        taskId: task.id,
        status: "PICKUP_ASSIGNED",
    };
}

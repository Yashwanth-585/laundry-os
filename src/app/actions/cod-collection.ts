"use server";

import { createClient } from "@/lib/supabase/server";

export async function markCodCollectedAction(taskId: string) {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: "You must be logged in." };
    }

    const { data: partner, error: partnerError } = await supabase
        .from("delivery_partners")
        .select("id")
        .eq("profile_id", user.id)
        .single();

    if (partnerError || !partner) {
        return { success: false, error: "Delivery partner account not found." };
    }

    const { data: task, error: taskError } = await supabase
        .from("delivery_tasks")
        .select("id, order_id, task_type, delivery_partner_id")
        .eq("id", taskId)
        .eq("delivery_partner_id", partner.id)
        .single();

    if (taskError || !task || task.task_type !== "DROP") {
        return { success: false, error: "Delivery task not found." };
    }

    const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, payment_method, total_amount")
        .eq("id", task.order_id)
        .single();

    if (orderError || !order) {
        return { success: false, error: "Order not found." };
    }

    if (order.payment_method !== "COD") {
        return { success: false, error: "This order is not Cash on Delivery." };
    }

    const { error: updateError } = await supabase
        .from("orders")
        .update({
            cod_collected_at: new Date().toISOString(),
            cod_collected_by: user.id,
            payment_status: "PAID",
            updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

    if (updateError) {
        console.error("COD COLLECTION ERROR:", updateError);
        return { success: false, error: "Unable to record cash collection." };
    }

    return { success: true };
}

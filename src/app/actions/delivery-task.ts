"use server";

import { randomInt } from "crypto";

import { createClient } from "@/lib/supabase/server";

export async function assignPickupPartnerAction({
    orderId,
    deliveryPartnerId,
}: {
    orderId: string;
    deliveryPartnerId: string;
}) {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            success: false,
            error: "You must be logged in.",
        };
    }

    // Verify admin access.
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || profile.role !== "admin") {
        return {
            success: false,
            error: "Unauthorized.",
        };
    }

    // Verify the delivery partner exists and is approved/active.
    const { data: partner, error: partnerError } = await supabase
        .from("delivery_partners")
        .select("id, is_active, is_approved, is_available")
        .eq("id", deliveryPartnerId)
        .single();

    if (partnerError || !partner) {
        return {
            success: false,
            error: "Delivery partner not found.",
        };
    }

    if (!partner.is_active || !partner.is_approved || !partner.is_available) {
        return {
            success: false,
            error: "This delivery partner is not available for pickup.",
        };
    }

    // Make sure the order exists.
    const { data: order, error: orderError } = await supabase
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

    // Do not allow pickup assignment after the order
    // has already moved beyond the pickup stage.
    const allowedStatuses = [
        "PLACED",
        "PICKUP_ASSIGNED",
        "ON_HOLD",
    ];

    if (!allowedStatuses.includes(order.status)) {
        return {
            success: false,
            error: `A pickup partner cannot be assigned while the order is ${order.status}.`,
        };
    }

    // Check whether a pickup task already exists.
    const {
        data: existingTask,
        error: existingTaskError,
    } = await supabase
        .from("delivery_tasks")
        .select("id, delivery_partner_id, status")
        .eq("order_id", orderId)
        .eq("task_type", "PICKUP")
        .maybeSingle();

    if (existingTaskError) {
        console.error(
            "CHECK EXISTING PICKUP TASK ERROR:",
            existingTaskError,
        );

        return {
            success: false,
            error: "Unable to check the existing pickup task.",
        };
    }

    if (existingTask) {
        // If the task is already completed, don't overwrite it.
        if (existingTask.status === "COMPLETED") {
            return {
                success: false,
                error: "The pickup task has already been completed.",
            };
        }

        const { error: updateTaskError } = await supabase
            .from("delivery_tasks")
            .update({
                delivery_partner_id: deliveryPartnerId,
                status: "ASSIGNED",
                assigned_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", existingTask.id);

        if (updateTaskError) {
            console.error(
                "UPDATE PICKUP TASK ERROR:",
                updateTaskError,
            );

            return {
                success: false,
                error: "Unable to assign the pickup partner.",
            };
        }
    } else {
        const { error: createTaskError } = await supabase
            .from("delivery_tasks")
            .insert({
                order_id: orderId,
                delivery_partner_id: deliveryPartnerId,
                task_type: "PICKUP",
                status: "ASSIGNED",
                assigned_at: new Date().toISOString(),
            });

        if (createTaskError) {
            console.error(
                "CREATE PICKUP TASK ERROR:",
                createTaskError,
            );

            return {
                success: false,
                error: "Unable to create the pickup task.",
            };
        }
    }

    // Move the order into PICKUP_ASSIGNED when appropriate.
    if (
        order.status === "PLACED" ||
        order.status === "ON_HOLD"
    ) {
        const now = new Date().toISOString();

        const { error: orderUpdateError } = await supabase
            .from("orders")
            .update({
                status: "PICKUP_ASSIGNED",
                updated_at: now,
            })
            .eq("id", orderId);

        if (orderUpdateError) {
            console.error(
                "UPDATE ORDER STATUS AFTER ASSIGNMENT ERROR:",
                orderUpdateError,
            );

            return {
                success: false,
                error:
                    "Pickup was assigned, but the order status could not be updated.",
                warning:
                    "The pickup task was created successfully. Please refresh and verify the order status.",
            };
        }

        // Record the status change in order history.
        const { error: historyError } = await supabase
            .from("order_status_history")
            .insert({
                order_id: orderId,
                status: "PICKUP_ASSIGNED",
                notes: "Pickup partner assigned.",
                created_at: now,
            });

        if (historyError) {
            console.error(
                "CREATE PICKUP ASSIGNMENT HISTORY ERROR:",
                historyError,
            );

            return {
                success: true,
                warning:
                    "Pickup was assigned successfully, but the order history could not be updated.",
            };
        }
    }

    return {
        success: true,
        warning: "Pickup partner assigned successfully.",
    };
}

export async function acceptPickupTaskAction(
    taskId: string,
) {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            success: false,
            error: "You must be logged in.",
        };
    }

    // Verify that the logged-in user is a delivery partner.
    const { data: partner, error: partnerError } = await supabase
        .from("delivery_partners")
        .select("id, is_active, is_approved")
        .eq("profile_id", user.id)
        .single();

    if (partnerError || !partner) {
        return {
            success: false,
            error: "Delivery partner account not found.",
        };
    }

    if (!partner.is_active || !partner.is_approved) {
        return {
            success: false,
            error:
                "Your delivery partner account is not active or approved.",
        };
    }

    // Fetch the task and make sure it belongs to this rider.
    const { data: task, error: taskError } = await supabase
        .from("delivery_tasks")
        .select(
            "id, delivery_partner_id, task_type, status",
        )
        .eq("id", taskId)
        .single();

    if (taskError || !task) {
        return {
            success: false,
            error: "Delivery task not found.",
        };
    }

    if (task.delivery_partner_id !== partner.id) {
        return {
            success: false,
            error: "You are not authorized to accept this task.",
        };
    }

    if (task.task_type !== "PICKUP") {
        return {
            success: false,
            error: "This task is not a pickup task.",
        };
    }

    if (task.status !== "ASSIGNED") {
        return {
            success: false,
            error:
                `This pickup cannot be accepted while it is ${task.status}.`,
        };
    }

    const { error: updateError } = await supabase
        .from("delivery_tasks")
        .update({
            status: "ACCEPTED",
            accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", task.id)
        .eq("delivery_partner_id", partner.id)
        .eq("status", "ASSIGNED");

    if (updateError) {
        console.error(
            "ACCEPT PICKUP TASK ERROR:",
            updateError,
        );

        return {
            success: false,
            error: "Unable to accept the pickup task.",
        };
    }

    return {
        success: true,
        message: "Pickup accepted successfully.",
    };
}

export async function startPickupTaskAction(
    taskId: string,
) {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            success: false,
            error: "You must be logged in.",
        };
    }

    // Verify the logged-in user is a delivery partner.
    const { data: partner, error: partnerError } = await supabase
        .from("delivery_partners")
        .select("id, is_active, is_approved")
        .eq("profile_id", user.id)
        .single();

    if (partnerError || !partner) {
        return {
            success: false,
            error: "Delivery partner account not found.",
        };
    }

    if (!partner.is_active || !partner.is_approved) {
        return {
            success: false,
            error:
                "Your delivery partner account is not active or approved.",
        };
    }

    // Fetch only this rider's pickup task.
    const { data: task, error: taskError } = await supabase
        .from("delivery_tasks")
        .select(
            "id, order_id, delivery_partner_id, task_type, status",
        )
        .eq("id", taskId)
        .eq("delivery_partner_id", partner.id)
        .single();

    if (taskError || !task) {
        return {
            success: false,
            error: "Delivery task not found.",
        };
    }

    if (task.task_type !== "PICKUP") {
        return {
            success: false,
            error: "This task is not a pickup task.",
        };
    }

    if (task.status !== "ACCEPTED") {
        return {
            success: false,
            error:
                `This pickup cannot be started while it is ${task.status}.`,
        };
    }

    // Generate a secure 6-digit OTP server-side.
    const pickupOtp = randomInt(
        100000,
        1000000,
    ).toString();

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
        .from("delivery_tasks")
        .update({
            status: "IN_PROGRESS",
            started_at: now,
            pickup_otp: pickupOtp,
            updated_at: now,
        })
        .eq("id", task.id)
        .eq("delivery_partner_id", partner.id)
        .eq("status", "ACCEPTED");

    if (updateError) {
        console.error(
            "START PICKUP TASK ERROR:",
            updateError,
        );

        return {
            success: false,
            error: "Unable to start the pickup.",
        };
    }

    // Move the order into OUT_FOR_PICKUP.
    const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({
            status: "OUT_FOR_PICKUP",
            updated_at: now,
        })
        .eq("id", task.order_id)
        .eq("status", "PICKUP_ASSIGNED");

    if (orderUpdateError) {
        console.error(
            "UPDATE ORDER STATUS AFTER PICKUP START ERROR:",
            orderUpdateError,
        );

        return {
            success: true,
            warning:
                "Pickup started and OTP generated, but the order status could not be updated.",
        };
    }

    // Record the status change in order history.
    const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
            order_id: task.order_id,
            status: "OUT_FOR_PICKUP",
            notes: "Delivery partner started the pickup.",
            created_at: now,
        });

    if (historyError) {
        console.error(
            "CREATE OUT FOR PICKUP HISTORY ERROR:",
            historyError,
        );

        return {
            success: true,
            warning:
                "Pickup started successfully, but the order history could not be updated.",
        };
    }

    return {
        success: true,
        message: "Pickup started successfully.",
    };
}
export async function verifyPickupOtpAction(
    taskId: string,
    otp: string,
) {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            success: false,
            error: "You must be logged in.",
        };
    }

    // Verify the logged-in user is a delivery partner.
    const { data: partner, error: partnerError } = await supabase
        .from("delivery_partners")
        .select("id, is_active, is_approved")
        .eq("profile_id", user.id)
        .single();

    if (partnerError || !partner) {
        return {
            success: false,
            error: "Delivery partner account not found.",
        };
    }

    if (!partner.is_active || !partner.is_approved) {
        return {
            success: false,
            error: "Your delivery partner account is not active or approved.",
        };
    }

    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
        return {
            success: false,
            error: "Enter a valid 6-digit OTP.",
        };
    }

    // Fetch only this rider's pickup task.
    const { data: task, error: taskError } = await supabase
        .from("delivery_tasks")
        .select(
            `
            id,
            order_id,
            delivery_partner_id,
            task_type,
            status,
            pickup_otp,
            pickup_otp_verified_at
            `,
        )
        .eq("id", taskId)
        .eq("delivery_partner_id", partner.id)
        .single();

    if (taskError || !task) {
        return {
            success: false,
            error: "Delivery task not found.",
        };
    }

    if (task.task_type !== "PICKUP") {
        return {
            success: false,
            error: "This task is not a pickup task.",
        };
    }

    if (task.status !== "IN_PROGRESS") {
        return {
            success: false,
            error: `This pickup cannot be verified while it is ${task.status}.`,
        };
    }

    if (task.pickup_otp_verified_at) {
        return {
            success: false,
            error: "This pickup OTP has already been verified.",
        };
    }

    if (!task.pickup_otp) {
        return {
            success: false,
            error: "A pickup OTP has not been generated for this task.",
        };
    }

    if (task.pickup_otp !== cleanOtp) {
        return {
            success: false,
            error: "Incorrect pickup OTP.",
        };
    }

    const now = new Date().toISOString();

    // Complete the pickup task.
    const { data: completedTask, error: updateError } = await supabase
        .from("delivery_tasks")
        .update({
            status: "COMPLETED",
            pickup_otp_verified_at: now,
            completed_at: now,
            updated_at: now,
        })
        .eq("id", task.id)
        .eq("delivery_partner_id", partner.id)
        .eq("status", "IN_PROGRESS")
        .select("id")
        .single();

    if (updateError || !completedTask) {
        console.error(
            "VERIFY PICKUP OTP ERROR:",
            updateError,
        );

        return {
            success: false,
            error: "Unable to complete the pickup.",
        };
    }

    // Move the order from OUT_FOR_PICKUP to PICKED_UP.
    const { data: updatedOrder, error: orderUpdateError } =
        await supabase
            .from("orders")
            .update({
                status: "PICKED_UP",
                updated_at: now,
            })
            .eq("id", task.order_id)
            .eq("status", "OUT_FOR_PICKUP")
            .select("id, status")
            .single();

    if (orderUpdateError || !updatedOrder) {
        console.error(
            "UPDATE ORDER STATUS AFTER PICKUP ERROR:",
            orderUpdateError,
        );

        return {
            success: false,
            error:
                "Pickup was verified, but the order status could not be updated.",
            warning:
                "The pickup task was completed successfully. Please refresh and verify the order status.",
        };
    }

    // Add PICKED_UP to the order status history.
    const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
            order_id: task.order_id,
            status: "PICKED_UP",
            notes: "Pickup verified by delivery partner.",
        });

    if (historyError) {
        console.error(
            "CREATE PICKED_UP HISTORY ERROR:",
            historyError,
        );

        return {
            success: true,
            message: "Pickup verified and completed successfully.",
            warning:
                "The order was marked as picked up, but the status history could not be updated.",
        };
    }

    return {
        success: true,
        message: "Pickup verified and completed successfully.",
    };
}
export async function toggleRiderAvailabilityAction() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            success: false,
            error: "You must be logged in.",
        };
    }

    // ----------------------------------------------------------
    // VERIFY DELIVERY PARTNER
    // ----------------------------------------------------------

    const { data: partner, error: partnerError } = await supabase
        .from("delivery_partners")
        .select(
            "id, profile_id, is_active, is_approved, is_available",
        )
        .eq("profile_id", user.id)
        .single();

    if (partnerError || !partner) {
        console.error(
            "RIDER AVAILABILITY FETCH ERROR:",
            partnerError,
        );

        return {
            success: false,
            error: "Delivery partner account not found.",
        };
    }

    // ----------------------------------------------------------
    // VERIFY ACCOUNT STATUS
    // ----------------------------------------------------------

    if (!partner.is_approved) {
        return {
            success: false,
            error:
                "Your delivery partner account has not been approved.",
        };
    }

    if (!partner.is_active) {
        return {
            success: false,
            error:
                "Your delivery partner account is currently inactive.",
        };
    }

    // ----------------------------------------------------------
    // TOGGLE AVAILABILITY
    // ----------------------------------------------------------

    const newAvailability = !partner.is_available;
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
        .from("delivery_partners")
        .update({
            is_available: newAvailability,
            updated_at: now,
        })
        .eq("id", partner.id)
        .eq("profile_id", user.id);

    if (updateError) {
        console.error(
            "RIDER AVAILABILITY UPDATE ERROR:",
            updateError,
        );

        return {
            success: false,
            error:
                "Unable to update your availability.",
        };
    }

    return {
        success: true,
        isAvailable: newAvailability,
        message: newAvailability
            ? "You are now available for deliveries."
            : "You are now unavailable for deliveries.",
    };
}
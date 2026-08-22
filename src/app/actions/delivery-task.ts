"use server";

import { randomInt } from "crypto";

import { createClient } from "@/lib/supabase/server";

const DELIVERY_PHOTOS_BUCKET = "delivery-task-photos";

/* ============================================================
   TYPES
============================================================ */

type PhotoUploadResult = {
    success: boolean;
    urls?: string[];
    error?: string;
};

/* ============================================================
   ASSIGN PICKUP PARTNER
============================================================ */

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
            error: "Unauthorized.",
        };
    }

    const { data: partner, error: partnerError } =
        await supabase
            .from("delivery_partners")
            .select(
                "id, is_active, is_approved, is_available",
            )
            .eq("id", deliveryPartnerId)
            .single();

    if (partnerError || !partner) {
        return {
            success: false,
            error: "Delivery partner not found.",
        };
    }

    if (
        !partner.is_active ||
        !partner.is_approved ||
        !partner.is_available
    ) {
        return {
            success: false,
            error:
                "This delivery partner is not available for pickup.",
        };
    }

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

    const {
        data: existingTask,
        error: existingTaskError,
    } = await supabase
        .from("delivery_tasks")
        .select(
            "id, delivery_partner_id, status",
        )
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
            error:
                "Unable to check the existing pickup task.",
        };
    }

    const now = new Date().toISOString();

    if (existingTask) {
        if (existingTask.status === "COMPLETED") {
            return {
                success: false,
                error:
                    "The pickup task has already been completed.",
            };
        }

        const { error: updateTaskError } =
            await supabase
                .from("delivery_tasks")
                .update({
                    delivery_partner_id:
                        deliveryPartnerId,
                    status: "ASSIGNED",
                    assigned_at: now,
                    updated_at: now,

                    /*
                     * Reset previous verification data
                     * if the task is reassigned.
                     */
                    pickup_otp: null,
                    pickup_otp_verified_at: null,
                    photo_urls: [],
                })
                .eq("id", existingTask.id);

        if (updateTaskError) {
            console.error(
                "UPDATE PICKUP TASK ERROR:",
                updateTaskError,
            );

            return {
                success: false,
                error:
                    "Unable to assign the pickup partner.",
            };
        }
    } else {
        const { error: createTaskError } =
            await supabase
                .from("delivery_tasks")
                .insert({
                    order_id: orderId,
                    delivery_partner_id:
                        deliveryPartnerId,
                    task_type: "PICKUP",
                    status: "ASSIGNED",
                    assigned_at: now,
                    photo_urls: [],
                });

        if (createTaskError) {
            console.error(
                "CREATE PICKUP TASK ERROR:",
                createTaskError,
            );

            return {
                success: false,
                error:
                    "Unable to create the pickup task.",
            };
        }
    }

    if (
        order.status === "PLACED" ||
        order.status === "ON_HOLD"
    ) {
        const {
            error: orderUpdateError,
        } = await supabase
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

        const { error: historyError } =
            await supabase
                .from("order_status_history")
                .insert({
                    order_id: orderId,
                    status: "PICKUP_ASSIGNED",
                    notes:
                        "Pickup partner assigned.",
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
        warning:
            "Pickup partner assigned successfully.",
    };
}

/* ============================================================
   ACCEPT PICKUP
============================================================ */

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

    const { data: partner, error: partnerError } =
        await supabase
            .from("delivery_partners")
            .select(
                "id, is_active, is_approved",
            )
            .eq("profile_id", user.id)
            .single();

    if (partnerError || !partner) {
        return {
            success: false,
            error:
                "Delivery partner account not found.",
        };
    }

    if (
        !partner.is_active ||
        !partner.is_approved
    ) {
        return {
            success: false,
            error:
                "Your delivery partner account is not active or approved.",
        };
    }

    const { data: task, error: taskError } =
        await supabase
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

    if (
        task.delivery_partner_id !==
        partner.id
    ) {
        return {
            success: false,
            error:
                "You are not authorized to accept this task.",
        };
    }

    if (task.task_type !== "PICKUP") {
        return {
            success: false,
            error:
                "This task is not a pickup task.",
        };
    }

    if (task.status !== "ASSIGNED") {
        return {
            success: false,
            error:
                `This pickup cannot be accepted while it is ${task.status}.`,
        };
    }

    const now = new Date().toISOString();

    const { error: updateError } =
        await supabase
            .from("delivery_tasks")
            .update({
                status: "ACCEPTED",
                accepted_at: now,
                updated_at: now,
            })
            .eq("id", task.id)
            .eq(
                "delivery_partner_id",
                partner.id,
            )
            .eq("status", "ASSIGNED");

    if (updateError) {
        console.error(
            "ACCEPT PICKUP TASK ERROR:",
            updateError,
        );

        return {
            success: false,
            error:
                "Unable to accept the pickup task.",
        };
    }

    return {
        success: true,
        message:
            "Pickup accepted successfully.",
    };
}

/* ============================================================
   START PICKUP
============================================================ */

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

    const { data: partner, error: partnerError } =
        await supabase
            .from("delivery_partners")
            .select(
                "id, is_active, is_approved",
            )
            .eq("profile_id", user.id)
            .single();

    if (partnerError || !partner) {
        return {
            success: false,
            error:
                "Delivery partner account not found.",
        };
    }

    if (
        !partner.is_active ||
        !partner.is_approved
    ) {
        return {
            success: false,
            error:
                "Your delivery partner account is not active or approved.",
        };
    }

    const { data: task, error: taskError } =
        await supabase
            .from("delivery_tasks")
            .select(
                "id, order_id, delivery_partner_id, task_type, status",
            )
            .eq("id", taskId)
            .eq(
                "delivery_partner_id",
                partner.id,
            )
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
            error:
                "This task is not a pickup task.",
        };
    }

    if (task.status !== "ACCEPTED") {
        return {
            success: false,
            error:
                `This pickup cannot be started while it is ${task.status}.`,
        };
    }

    const pickupOtp = randomInt(
        100000,
        1000000,
    ).toString();

    const now = new Date().toISOString();

    const { error: updateError } =
        await supabase
            .from("delivery_tasks")
            .update({
                status: "IN_PROGRESS",
                started_at: now,
                pickup_otp: pickupOtp,
                pickup_otp_verified_at: null,
                photo_urls: [],
                updated_at: now,
            })
            .eq("id", task.id)
            .eq(
                "delivery_partner_id",
                partner.id,
            )
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

    const {
        error: orderUpdateError,
    } = await supabase
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

    const { error: historyError } =
        await supabase
            .from("order_status_history")
            .insert({
                order_id: task.order_id,
                status: "OUT_FOR_PICKUP",
                notes:
                    "Delivery partner started the pickup.",
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
        message:
            "Pickup started successfully.",
    };
}

/* ============================================================
   UPLOAD DELIVERY TASK PHOTOS
============================================================ */

export async function uploadDeliveryTaskPhotosAction(
    taskId: string,
    formData: FormData,
): Promise<PhotoUploadResult> {
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

    const { data: partner, error: partnerError } =
        await supabase
            .from("delivery_partners")
            .select(
                "id, is_active, is_approved",
            )
            .eq("profile_id", user.id)
            .single();

    if (partnerError || !partner) {
        return {
            success: false,
            error:
                "Delivery partner account not found.",
        };
    }

    if (
        !partner.is_active ||
        !partner.is_approved
    ) {
        return {
            success: false,
            error:
                "Your delivery partner account is not active or approved.",
        };
    }

    const { data: task, error: taskError } =
        await supabase
            .from("delivery_tasks")
            .select(
                `
                id,
                order_id,
                delivery_partner_id,
                task_type,
                status,
                photo_urls
                `,
            )
            .eq("id", taskId)
            .eq(
                "delivery_partner_id",
                partner.id,
            )
            .single();

    if (taskError || !task) {
        return {
            success: false,
            error: "Delivery task not found.",
        };
    }

    if (
        task.task_type !== "PICKUP" &&
        task.task_type !== "DROP"
    ) {
        return {
            success: false,
            error: "Invalid delivery task.",
        };
    }

    if (task.status !== "IN_PROGRESS") {
        return {
            success: false,
            error:
                "Photos can only be uploaded while the task is in progress.",
        };
    }

    const files = formData
        .getAll("photos")
        .filter(
            (value): value is File =>
                value instanceof File &&
                value.size > 0,
        );

    if (files.length === 0) {
        return {
            success: false,
            error:
                "Please select at least one photo.",
        };
    }

    if (files.length > 5) {
        return {
            success: false,
            error:
                "You can upload a maximum of 5 photos.",
        };
    }

    const MAX_FILE_SIZE = 8 * 1024 * 1024;

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    const uploadedUrls: string[] = [];

    for (const file of files) {
        if (!allowedTypes.includes(file.type)) {
            return {
                success: false,
                error:
                    "Only JPG, PNG, and WebP images are allowed.",
            };
        }

        if (file.size > MAX_FILE_SIZE) {
            return {
                success: false,
                error:
                    "Each photo must be smaller than 8 MB.",
            };
        }

        const extension =
            file.type === "image/png"
                ? "png"
                : file.type === "image/webp"
                    ? "webp"
                    : "jpg";

        const fileName =
            `${crypto.randomUUID()}.${extension}`;

        const path =
            `${task.order_id}/${task.id}/${fileName}`;

        const { error: uploadError } =
            await supabase.storage
                .from(
                    DELIVERY_PHOTOS_BUCKET,
                )
                .upload(path, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type,
                });

        if (uploadError) {
            console.error(
                "DELIVERY PHOTO UPLOAD ERROR:",
                uploadError,
            );

            return {
                success: false,
                error:
                    "Unable to upload the verification photo. Please try again.",
            };
        }

        const {
            data: publicUrlData,
        } = supabase.storage
            .from(
                DELIVERY_PHOTOS_BUCKET,
            )
            .getPublicUrl(path);

        uploadedUrls.push(
            publicUrlData.publicUrl,
        );
    }

    const existingUrls =
        Array.isArray(task.photo_urls)
            ? task.photo_urls
            : [];

    const allUrls = [
        ...existingUrls,
        ...uploadedUrls,
    ];

    const { error: updateError } =
        await supabase
            .from("delivery_tasks")
            .update({
                photo_urls: allUrls,
                updated_at:
                    new Date().toISOString(),
            })
            .eq("id", task.id)
            .eq(
                "delivery_partner_id",
                partner.id,
            );

    if (updateError) {
        console.error(
            "SAVE DELIVERY PHOTO URLS ERROR:",
            updateError,
        );

        return {
            success: false,
            error:
                "Photos were uploaded but could not be linked to the task.",
        };
    }

    return {
        success: true,
        urls: uploadedUrls,
    };
}

/* ============================================================
   VERIFY PICKUP OTP
============================================================ */

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

    const { data: partner, error: partnerError } =
        await supabase
            .from("delivery_partners")
            .select(
                "id, is_active, is_approved",
            )
            .eq("profile_id", user.id)
            .single();

    if (partnerError || !partner) {
        return {
            success: false,
            error:
                "Delivery partner account not found.",
        };
    }

    if (
        !partner.is_active ||
        !partner.is_approved
    ) {
        return {
            success: false,
            error:
                "Your delivery partner account is not active or approved.",
        };
    }

    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
        return {
            success: false,
            error:
                "Enter a valid 6-digit OTP.",
        };
    }

    const { data: task, error: taskError } =
        await supabase
            .from("delivery_tasks")
            .select(
                `
                id,
                order_id,
                delivery_partner_id,
                task_type,
                status,
                pickup_otp,
                pickup_otp_verified_at,
                photo_urls
                `,
            )
            .eq("id", taskId)
            .eq(
                "delivery_partner_id",
                partner.id,
            )
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
            error:
                "This task is not a pickup task.",
        };
    }

    if (task.status !== "IN_PROGRESS") {
        return {
            success: false,
            error:
                `This pickup cannot be verified while it is ${task.status}.`,
        };
    }

    if (task.pickup_otp_verified_at) {
        return {
            success: false,
            error:
                "This pickup OTP has already been verified.",
        };
    }

    if (!task.pickup_otp) {
        return {
            success: false,
            error:
                "A pickup OTP has not been generated for this task.",
        };
    }

    if (task.pickup_otp !== cleanOtp) {
        return {
            success: false,
            error: "Incorrect pickup OTP.",
        };
    }

    const photoUrls =
        Array.isArray(task.photo_urls)
            ? task.photo_urls
            : [];

    if (photoUrls.length === 0) {
        return {
            success: false,
            error:
                "Upload at least one pickup verification photo before entering the OTP.",
        };
    }

    const now = new Date().toISOString();

    const {
        data: completedTask,
        error: updateError,
    } = await supabase
        .from("delivery_tasks")
        .update({
            status: "COMPLETED",
            pickup_otp_verified_at: now,
            completed_at: now,
            updated_at: now,
        })
        .eq("id", task.id)
        .eq(
            "delivery_partner_id",
            partner.id,
        )
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
            error:
                "Unable to complete the pickup.",
        };
    }

    const {
        data: updatedOrder,
        error: orderUpdateError,
    } = await supabase
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

    const { error: historyError } =
        await supabase
            .from("order_status_history")
            .insert({
                order_id: task.order_id,
                status: "PICKED_UP",
                notes:
                    "Pickup verified by delivery partner with photo and OTP.",
                created_at: now,
            });

    if (historyError) {
        console.error(
            "CREATE PICKED_UP HISTORY ERROR:",
            historyError,
        );

        return {
            success: true,
            message:
                "Pickup verified and completed successfully.",
            warning:
                "The order was marked as picked up, but the status history could not be updated.",
        };
    }

    return {
        success: true,
        message:
            "Pickup verified and completed successfully.",
    };
}

/* ============================================================
   TOGGLE RIDER AVAILABILITY
============================================================ */

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

    const { data: partner, error: partnerError } =
        await supabase
            .from("delivery_partners")
            .select(
                "id, profile_id, is_active, is_approved, is_available",
            )
            .eq("profile_id", user.id)
            .single();

    if (partnerError || !partner) {
        return {
            success: false,
            error:
                "Delivery partner account not found.",
        };
    }

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

    const newAvailability =
        !partner.is_available;

    const now = new Date().toISOString();

    const { error: updateError } =
        await supabase
            .from("delivery_partners")
            .update({
                is_available:
                    newAvailability,
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
        isAvailable:
            newAvailability,
        message:
            newAvailability
                ? "You are now available for deliveries."
                : "You are now unavailable for deliveries.",
    };
}

/* ============================================================
   ASSIGN DELIVERY
============================================================ */

export async function assignDeliveryTaskAction({
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

    const {
        data: profile,
        error: profileError,
    } = await supabase
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
            error: "Unauthorized.",
        };
    }

    const {
        data: order,
        error: orderError,
    } = await supabase
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

    if (order.status !== "READY") {
        return {
            success: false,
            error:
                "A delivery partner can only be assigned when the order is ready.",
        };
    }

    const {
        data: partner,
        error: partnerError,
    } = await supabase
        .from("delivery_partners")
        .select(
            "id, is_active, is_approved, is_available",
        )
        .eq("id", deliveryPartnerId)
        .single();

    if (partnerError || !partner) {
        return {
            success: false,
            error:
                "Delivery partner not found.",
        };
    }

    if (!partner.is_active) {
        return {
            success: false,
            error:
                "This delivery partner is inactive.",
        };
    }

    if (!partner.is_approved) {
        return {
            success: false,
            error:
                "This delivery partner is not approved.",
        };
    }

    if (!partner.is_available) {
        return {
            success: false,
            error:
                "This delivery partner is currently unavailable.",
        };
    }

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
            "CHECK EXISTING DELIVERY TASK ERROR:",
            existingTaskError,
        );

        return {
            success: false,
            error:
                "Unable to check the existing delivery task.",
        };
    }

    if (existingTask) {
        if (existingTask.status === "COMPLETED") {
            return {
                success: false,
                error:
                    "The delivery task has already been completed.",
            };
        }

        return {
            success: false,
            error:
                "A delivery task already exists for this order.",
        };
    }

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
            photo_urls: [],
        })
        .select("id")
        .single();

    if (taskError || !task) {
        console.error(
            "CREATE DELIVERY TASK ERROR:",
            taskError,
        );

        return {
            success: false,
            error:
                "Unable to create the delivery task.",
        };
    }

    const {
        data: updatedOrder,
        error: orderUpdateError,
    } = await supabase
        .from("orders")
        .update({
            status: "OUT_FOR_DELIVERY",
            updated_at: now,
        })
        .eq("id", orderId)
        .eq("status", "READY")
        .select("id, status")
        .single();

    if (
        orderUpdateError ||
        !updatedOrder
    ) {
        console.error(
            "UPDATE ORDER AFTER DELIVERY ASSIGNMENT ERROR:",
            orderUpdateError,
        );

        await supabase
            .from("delivery_tasks")
            .delete()
            .eq("id", task.id);

        return {
            success: false,
            error:
                "Unable to move the order into delivery.",
        };
    }

    const { error: historyError } =
        await supabase
            .from("order_status_history")
            .insert({
                order_id: orderId,
                status: "OUT_FOR_DELIVERY",
                changed_by: user.id,
                notes:
                    "Delivery partner assigned by admin.",
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
                "Delivery partner assigned, but status history could not be recorded.",
            taskId: task.id,
        };
    }

    return {
        success: true,
        taskId: task.id,
        status: "OUT_FOR_DELIVERY",
    };
}

/* ============================================================
   ACCEPT DELIVERY
============================================================ */

export async function acceptDeliveryTaskAction(
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

    const {
        data: partner,
        error: partnerError,
    } = await supabase
        .from("delivery_partners")
        .select(
            "id, is_active, is_approved",
        )
        .eq("profile_id", user.id)
        .single();

    if (partnerError || !partner) {
        return {
            success: false,
            error:
                "Delivery partner account not found.",
        };
    }

    if (
        !partner.is_active ||
        !partner.is_approved
    ) {
        return {
            success: false,
            error:
                "Your delivery partner account is not active or approved.",
        };
    }

    const {
        data: task,
        error: taskError,
    } = await supabase
        .from("delivery_tasks")
        .select(
            `
            id,
            order_id,
            delivery_partner_id,
            task_type,
            status
            `,
        )
        .eq("id", taskId)
        .single();

    if (taskError || !task) {
        return {
            success: false,
            error: "Delivery task not found.",
        };
    }

    if (
        task.delivery_partner_id !==
        partner.id
    ) {
        return {
            success: false,
            error:
                "You are not authorized to accept this task.",
        };
    }

    if (task.task_type !== "DROP") {
        return {
            success: false,
            error:
                "This task is not a delivery task.",
        };
    }

    if (task.status !== "ASSIGNED") {
        return {
            success: false,
            error:
                `This delivery cannot be accepted while it is ${task.status}.`,
        };
    }

    const now = new Date().toISOString();

    const { error: updateError } =
        await supabase
            .from("delivery_tasks")
            .update({
                status: "ACCEPTED",
                accepted_at: now,
                updated_at: now,
            })
            .eq("id", task.id)
            .eq(
                "delivery_partner_id",
                partner.id,
            )
            .eq("status", "ASSIGNED");

    if (updateError) {
        console.error(
            "ACCEPT DELIVERY TASK ERROR:",
            updateError,
        );

        return {
            success: false,
            error:
                "Unable to accept the delivery task.",
        };
    }

    return {
        success: true,
        message:
            "Delivery accepted successfully.",
    };
}

/* ============================================================
   START DELIVERY
============================================================ */

export async function startDeliveryTaskAction(
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

    const {
        data: partner,
        error: partnerError,
    } = await supabase
        .from("delivery_partners")
        .select(
            "id, is_active, is_approved",
        )
        .eq("profile_id", user.id)
        .single();

    if (partnerError || !partner) {
        return {
            success: false,
            error:
                "Delivery partner account not found.",
        };
    }

    if (
        !partner.is_active ||
        !partner.is_approved
    ) {
        return {
            success: false,
            error:
                "Your delivery partner account is not active or approved.",
        };
    }

    const {
        data: task,
        error: taskError,
    } = await supabase
        .from("delivery_tasks")
        .select(
            `
            id,
            order_id,
            delivery_partner_id,
            task_type,
            status
            `,
        )
        .eq("id", taskId)
        .eq(
            "delivery_partner_id",
            partner.id,
        )
        .single();

    if (taskError || !task) {
        return {
            success: false,
            error: "Delivery task not found.",
        };
    }

    if (task.task_type !== "DROP") {
        return {
            success: false,
            error:
                "This task is not a delivery task.",
        };
    }

    if (task.status !== "ACCEPTED") {
        return {
            success: false,
            error:
                `This delivery cannot be started while it is ${task.status}.`,
        };
    }

    const deliveryOtp = randomInt(
        100000,
        1000000,
    ).toString();

    const now = new Date().toISOString();

    const { error: updateError } =
        await supabase
            .from("delivery_tasks")
            .update({
                status: "IN_PROGRESS",
                started_at: now,
                delivery_otp:
                    deliveryOtp,
                delivery_otp_verified_at:
                    null,
                photo_urls: [],
                updated_at: now,
            })
            .eq("id", task.id)
            .eq(
                "delivery_partner_id",
                partner.id,
            )
            .eq("status", "ACCEPTED");

    if (updateError) {
        console.error(
            "START DELIVERY TASK ERROR:",
            updateError,
        );

        return {
            success: false,
            error:
                "Unable to start the delivery.",
        };
    }

    return {
        success: true,
        message:
            "Delivery started successfully.",
    };
}

/* ============================================================
   VERIFY DELIVERY OTP
============================================================ */

export async function verifyDeliveryOtpAction(
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

    const {
        data: partner,
        error: partnerError,
    } = await supabase
        .from("delivery_partners")
        .select(
            "id, is_active, is_approved",
        )
        .eq("profile_id", user.id)
        .single();

    if (partnerError || !partner) {
        return {
            success: false,
            error:
                "Delivery partner account not found.",
        };
    }

    if (
        !partner.is_active ||
        !partner.is_approved
    ) {
        return {
            success: false,
            error:
                "Your delivery partner account is not active or approved.",
        };
    }

    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
        return {
            success: false,
            error:
                "Enter a valid 6-digit OTP.",
        };
    }

    const {
        data: task,
        error: taskError,
    } = await supabase
        .from("delivery_tasks")
        .select(
            `
            id,
            order_id,
            delivery_partner_id,
            task_type,
            status,
            delivery_otp,
            delivery_otp_verified_at,
            photo_urls
            `,
        )
        .eq("id", taskId)
        .eq(
            "delivery_partner_id",
            partner.id,
        )
        .single();

    if (taskError || !task) {
        return {
            success: false,
            error: "Delivery task not found.",
        };
    }

    if (task.task_type !== "DROP") {
        return {
            success: false,
            error:
                "This task is not a delivery task.",
        };
    }

    if (task.status !== "IN_PROGRESS") {
        return {
            success: false,
            error:
                `This delivery cannot be verified while it is ${task.status}.`,
        };
    }

    if (task.delivery_otp_verified_at) {
        return {
            success: false,
            error:
                "This delivery OTP has already been verified.",
        };
    }

    if (!task.delivery_otp) {
        return {
            success: false,
            error:
                "A delivery OTP has not been generated.",
        };
    }

    if (
        task.delivery_otp !==
        cleanOtp
    ) {
        return {
            success: false,
            error:
                "Incorrect delivery OTP.",
        };
    }

    const photoUrls =
        Array.isArray(task.photo_urls)
            ? task.photo_urls
            : [];

    if (photoUrls.length === 0) {
        return {
            success: false,
            error:
                "Upload at least one delivery verification photo before entering the OTP.",
        };
    }

    const { data: orderForCod } = await supabase
        .from("orders")
        .select("payment_method, cod_collected_at")
        .eq("id", task.order_id)
        .single();

    if (
        orderForCod?.payment_method === "COD" &&
        !orderForCod.cod_collected_at
    ) {
        return {
            success: false,
            error:
                "Please collect and confirm the cash payment before completing this delivery.",
        };
    }

    const now = new Date().toISOString();

    const {
        data: completedTask,
        error: updateError,
    } = await supabase
        .from("delivery_tasks")
        .update({
            status: "COMPLETED",
            delivery_otp_verified_at:
                now,
            completed_at: now,
            updated_at: now,
        })
        .eq("id", task.id)
        .eq(
            "delivery_partner_id",
            partner.id,
        )
        .eq("status", "IN_PROGRESS")
        .select("id")
        .single();

    if (updateError || !completedTask) {
        console.error(
            "VERIFY DELIVERY OTP ERROR:",
            updateError,
        );

        return {
            success: false,
            error:
                "Unable to complete the delivery.",
        };
    }

    const {
        data: updatedOrder,
        error: orderUpdateError,
    } = await supabase
        .from("orders")
        .update({
            status: "DELIVERED",
            updated_at: now,
        })
        .eq("id", task.order_id)
        .eq("status", "OUT_FOR_DELIVERY")
        .select("id, status")
        .single();

    if (
        orderUpdateError ||
        !updatedOrder
    ) {
        console.error(
            "UPDATE ORDER AFTER DELIVERY ERROR:",
            orderUpdateError,
        );

        return {
            success: false,
            error:
                "Delivery was verified, but the order status could not be updated.",
            warning:
                "The delivery task was completed. Please refresh and verify the order.",
        };
    }

    const {
        error: historyError,
    } = await supabase
        .from("order_status_history")
        .insert({
            order_id: task.order_id,
            status: "DELIVERED",
            notes:
                "Delivery completed after customer OTP and photo verification.",
            created_at: now,
        });

    if (historyError) {
        console.error(
            "CREATE DELIVERED HISTORY ERROR:",
            historyError,
        );

        return {
            success: true,
            message:
                "Delivery completed successfully.",
            warning:
                "The order was delivered, but status history could not be updated.",
        };
    }

    return {
        success: true,
        message:
            "Delivery completed successfully.",
    };
}
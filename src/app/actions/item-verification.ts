"use server";

import { createClient } from "@/lib/supabase/server";

const ITEM_PHOTOS_BUCKET = "item-verification-photos";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_FILES = 5;

export type ItemCondition = "GOOD" | "DAMAGED" | "MISSING";

type SubmitItemVerificationResult = {
    success: boolean;
    error?: string;
    photoUrls?: string[];
};

/**
 * Rider reports the condition of a single order item during a PICKUP or
 * DROP task, optionally with photo evidence. Used to protect both the
 * customer and the rider against missing/damaged item disputes.
 */
export async function submitItemVerificationAction(
    taskId: string,
    orderItemId: string,
    condition: ItemCondition,
    note: string,
    formData: FormData,
): Promise<SubmitItemVerificationResult> {
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
        .select("id, is_active, is_approved")
        .eq("profile_id", user.id)
        .single();

    if (partnerError || !partner || !partner.is_active || !partner.is_approved) {
        return {
            success: false,
            error: "Delivery partner account not found or not active.",
        };
    }

    const { data: task, error: taskError } = await supabase
        .from("delivery_tasks")
        .select("id, order_id, delivery_partner_id, task_type, status")
        .eq("id", taskId)
        .eq("delivery_partner_id", partner.id)
        .single();

    if (taskError || !task) {
        return { success: false, error: "Delivery task not found." };
    }

    if (task.task_type !== "PICKUP" && task.task_type !== "DROP") {
        return { success: false, error: "Invalid delivery task." };
    }

    if (task.status !== "IN_PROGRESS") {
        return {
            success: false,
            error: "Items can only be verified while the task is in progress.",
        };
    }

    if (!["GOOD", "DAMAGED", "MISSING"].includes(condition)) {
        return { success: false, error: "Invalid item condition." };
    }

    // Make sure this item actually belongs to this task's order.
    const { data: orderItem, error: orderItemError } = await supabase
        .from("order_items")
        .select("id, order_id")
        .eq("id", orderItemId)
        .eq("order_id", task.order_id)
        .single();

    if (orderItemError || !orderItem) {
        return { success: false, error: "Order item not found on this order." };
    }

    if (condition !== "GOOD" && note.trim().length === 0) {
        return {
            success: false,
            error: "Please add a short note explaining the damage or missing item.",
        };
    }

    const files = formData
        .getAll("photos")
        .filter((value): value is File => value instanceof File && value.size > 0);

    if (condition !== "GOOD" && files.length === 0) {
        return {
            success: false,
            error: "At least one photo is required to report damage or a missing item.",
        };
    }

    if (files.length > MAX_FILES) {
        return { success: false, error: `You can upload a maximum of ${MAX_FILES} photos.` };
    }

    const photoUrls: string[] = [];

    for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
            return { success: false, error: "Only JPG, PNG, and WebP images are allowed." };
        }

        if (file.size > MAX_FILE_SIZE) {
            return { success: false, error: "Each photo must be smaller than 8 MB." };
        }

        const extension =
            file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";

        const path = `${task.order_id}/${task.id}/${orderItemId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
            .from(ITEM_PHOTOS_BUCKET)
            .upload(path, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type,
            });

        if (uploadError) {
            console.error("ITEM VERIFICATION PHOTO UPLOAD ERROR:", uploadError);
            return {
                success: false,
                error: "Unable to upload the verification photo. Please try again.",
            };
        }

        const { data: publicUrlData } = supabase.storage
            .from(ITEM_PHOTOS_BUCKET)
            .getPublicUrl(path);

        photoUrls.push(publicUrlData.publicUrl);
    }

    const { error: upsertError } = await supabase
        .from("delivery_task_item_reports")
        .upsert(
            {
                delivery_task_id: task.id,
                order_item_id: orderItemId,
                task_type: task.task_type,
                condition,
                note: note.trim() || null,
                photo_urls: photoUrls,
                reported_by: user.id,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "delivery_task_id,order_item_id" },
        );

    if (upsertError) {
        console.error("ITEM VERIFICATION SAVE ERROR:", upsertError);
        return {
            success: false,
            error: "Photos were uploaded but the report could not be saved.",
        };
    }

    return { success: true, photoUrls };
}

/**
 * Fetch the order items for a task plus any verification reports already
 * filed for it, so the rider UI can show per-item status.
 */
export async function getTaskItemVerificationAction(taskId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false as const, error: "You must be logged in." };
    }

    const { data: task, error: taskError } = await supabase
        .from("delivery_tasks")
        .select("id, order_id, task_type, delivery_partner_id, delivery_partners(profile_id)")
        .eq("id", taskId)
        .single();

    if (taskError || !task) {
        return { success: false as const, error: "Task not found." };
    }

    const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("id, article_name, category_name, quantity")
        .eq("order_id", task.order_id);

    if (itemsError) {
        return { success: false as const, error: "Unable to load order items." };
    }

    const { data: reports, error: reportsError } = await supabase
        .from("delivery_task_item_reports")
        .select("order_item_id, condition, note, photo_urls")
        .eq("delivery_task_id", taskId);

    if (reportsError) {
        console.error("FETCH ITEM REPORTS ERROR:", reportsError);
    }

    return {
        success: true as const,
        items: items ?? [],
        reports: reports ?? [],
    };
}

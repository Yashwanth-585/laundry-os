"use server";

import { createClient } from "@/lib/supabase/server";

const TICKET_PHOTOS_BUCKET = "ticket-evidence-photos";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_FILES = 5;

export type IssueType = "MISSING_ITEM" | "DAMAGED_ITEM" | "OTHER";

/**
 * Customer-facing orders the complaint bot can attach a ticket to
 * (only delivered orders — you can't report a missing/damaged item
 * before it's actually been through the wash and back).
 */
export async function listComplaintEligibleOrdersAction() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false as const, error: "You must be logged in." };
    }

    const { data: orders, error } = await supabase
        .from("orders")
        .select("id, created_at, total_amount, status, order_items ( id, article_name )")
        .eq("customer_id", user.id)
        .eq("status", "DELIVERED")
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) {
        console.error("LIST COMPLAINT ORDERS ERROR:", error);
        return { success: false as const, error: "Unable to load your orders." };
    }

    return { success: true as const, orders: orders ?? [] };
}

export type CreateTicketInput = {
    orderId: string;
    orderItemId: string | null;
    issueType: IssueType;
    description: string;
};

export async function createSupportTicketAction(
    input: CreateTicketInput,
    formData: FormData,
) {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: "You must be logged in." };
    }

    if (!["MISSING_ITEM", "DAMAGED_ITEM", "OTHER"].includes(input.issueType)) {
        return { success: false, error: "Invalid issue type." };
    }

    if (!input.description || input.description.trim().length < 10) {
        return {
            success: false,
            error: "Please describe the issue in a bit more detail (at least 10 characters).",
        };
    }

    // Confirm the order belongs to this customer and has been delivered.
    const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, customer_id, status")
        .eq("id", input.orderId)
        .eq("customer_id", user.id)
        .single();

    if (orderError || !order) {
        return { success: false, error: "Order not found." };
    }

    if (order.status !== "DELIVERED") {
        return {
            success: false,
            error: "You can only raise a complaint for a delivered order.",
        };
    }

    if (input.orderItemId) {
        const { data: item, error: itemError } = await supabase
            .from("order_items")
            .select("id")
            .eq("id", input.orderItemId)
            .eq("order_id", input.orderId)
            .single();

        if (itemError || !item) {
            return { success: false, error: "Selected item not found on this order." };
        }
    }

    const requiresProof = input.issueType !== "OTHER";

    const files = formData
        .getAll("photos")
        .filter((value): value is File => value instanceof File && value.size > 0);

    if (requiresProof && files.length === 0) {
        return {
            success: false,
            error: "Please attach at least one photo as proof.",
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

        const path = `${user.id}/${input.orderId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
            .from(TICKET_PHOTOS_BUCKET)
            .upload(path, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type,
            });

        if (uploadError) {
            console.error("TICKET PHOTO UPLOAD ERROR:", uploadError);
            return { success: false, error: "Unable to upload photo. Please try again." };
        }

        const { data: publicUrlData } = supabase.storage
            .from(TICKET_PHOTOS_BUCKET)
            .getPublicUrl(path);

        photoUrls.push(publicUrlData.publicUrl);
    }

    const { data: ticket, error: insertError } = await supabase
        .from("support_tickets")
        .insert({
            customer_id: user.id,
            order_id: input.orderId,
            order_item_id: input.orderItemId,
            issue_type: input.issueType,
            description: input.description.trim(),
            photo_urls: photoUrls,
        })
        .select("id")
        .single();

    if (insertError || !ticket) {
        console.error("CREATE TICKET ERROR:", insertError);
        return { success: false, error: "Unable to raise the ticket. Please try again." };
    }

    return { success: true, ticketId: ticket.id };
}

export async function listMyTicketsAction() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false as const, error: "You must be logged in." };
    }

    const { data: tickets, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        return { success: false as const, error: "Unable to load your tickets." };
    }

    return { success: true as const, tickets: tickets ?? [] };
}

/* ============================================================
   ADMIN
============================================================ */

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { ok: false as const, error: "You must be logged in." };
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || profile.role !== "admin") {
        return { ok: false as const, error: "You are not authorized." };
    }

    return { ok: true as const, userId: user.id };
}

export async function adminListTicketsAction() {
    const supabase = await createClient();

    const check = await requireAdmin(supabase);
    if (!check.ok) return { success: false as const, error: check.error };

    const { data: tickets, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("ADMIN LIST TICKETS ERROR:", error);
        return { success: false as const, error: "Unable to load tickets." };
    }

    return { success: true as const, tickets: tickets ?? [] };
}

export type TicketResolutionStatus = "UNDER_REVIEW" | "RESOLVED" | "REJECTED";

export async function adminResolveTicketAction(
    ticketId: string,
    status: TicketResolutionStatus,
    adminNotes: string,
    resolution: string,
) {
    const supabase = await createClient();

    const check = await requireAdmin(supabase);
    if (!check.ok) return { success: false, error: check.error };

    const { error } = await supabase
        .from("support_tickets")
        .update({
            status,
            admin_notes: adminNotes.trim() || null,
            resolution: resolution.trim() || null,
            resolved_at: status === "UNDER_REVIEW" ? null : new Date().toISOString(),
            resolved_by: status === "UNDER_REVIEW" ? null : check.userId,
            updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

    if (error) {
        console.error("ADMIN RESOLVE TICKET ERROR:", error);
        return { success: false, error: "Unable to update the ticket." };
    }

    return { success: true };
}

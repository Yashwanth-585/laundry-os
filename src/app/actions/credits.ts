"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Current credit-earning percentage, visible to any signed-in user
 * (used to show "Earn X% back in credits" at checkout).
 */
export async function getCreditSettingsAction() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("credit_settings")
        .select("percentage")
        .eq("id", 1)
        .single();

    if (error || !data) {
        return { success: false as const, percentage: 0 };
    }

    return { success: true as const, percentage: Number(data.percentage) };
}

/**
 * Admin-only: update the store-wide credit percentage. Uses the service
 * role after verifying the caller is an admin, since only a single
 * `admin` role should ever be able to touch this figure.
 */
export async function adminSetCreditPercentageAction(percentage: number) {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: "You must be logged in." };
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || profile.role !== "admin") {
        return { success: false, error: "You are not authorized." };
    }

    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
        return { success: false, error: "Percentage must be between 0 and 100." };
    }

    const admin = createAdminClient();

    const { error } = await admin
        .from("credit_settings")
        .update({
            percentage,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
        })
        .eq("id", 1);

    if (error) {
        console.error("SET CREDIT PERCENTAGE ERROR:", error);
        return { success: false, error: "Unable to update credit percentage." };
    }

    return { success: true };
}

/**
 * Customer's credit balance + history, for the dashboard.
 */
export async function getMyCreditsAction() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false as const, error: "You must be logged in." };
    }

    const { data: balanceData, error: balanceError } = await supabase.rpc(
        "get_available_credit_balance",
        { p_customer_id: user.id },
    );

    const { data: history, error: historyError } = await supabase
        .from("customer_credits")
        .select("id, order_id, amount, used_amount, status, issued_at, expires_at")
        .eq("customer_id", user.id)
        .order("issued_at", { ascending: false })
        .limit(20);

    if (historyError) {
        console.error("GET MY CREDITS ERROR:", historyError);
    }

    return {
        success: true as const,
        balance: balanceError ? 0 : Number(balanceData ?? 0),
        history: history ?? [],
    };
}

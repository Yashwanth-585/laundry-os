"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function makeAddressDefault(addressId: string) {
    const supabase = await createClient();

    const { data, error: claimsError } = await supabase.auth.getClaims();
    const userId = data?.claims.sub;

    if (claimsError || !userId) {
        return {
            error: "Your session has expired. Please sign in again.",
        };
    }

    // First make sure this address belongs to the current user.
    const { data: address, error: addressError } = await supabase
        .from("addresses")
        .select("id")
        .eq("id", addressId)
        .eq("user_id", userId)
        .single();

    if (addressError || !address) {
        return {
            error: "Address not found.",
        };
    }

    // Remove the default status from the user's existing addresses.
    const { error: clearError } = await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId)
        .eq("is_default", true);

    if (clearError) {
        return {
            error: "We could not update your default address. Please try again.",
        };
    }

    // Make the selected address the default.
    const { error: updateError } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", addressId)
        .eq("user_id", userId);

    if (updateError) {
        return {
            error: "We could not make this address your default. Please try again.",
        };
    }

    revalidatePath("/addresses");

    return { error: null };
}
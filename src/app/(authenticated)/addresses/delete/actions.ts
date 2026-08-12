"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function deleteAddress(addressId: string) {
    const supabase = await createClient();

    const { data, error: claimsError } = await supabase.auth.getClaims();
    const userId = data?.claims.sub;

    if (claimsError || !userId) {
        redirect("/login");
    }

    const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", addressId)
        .eq("user_id", userId);

    if (error) {
        return {
            error: "We could not delete this address. Please try again.",
        };
    }

    revalidatePath("/addresses");

    return { error: null };
}
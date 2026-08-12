"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type UpdateAddressInput = {
    id: string;
    label: string;
    recipientName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    landmark: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number | null;
    longitude: number | null;
    isDefault: boolean;
};

type UpdateAddressResult = { error: string };

function cleanText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function validCoordinate(value: unknown, minimum: number, maximum: number) {
    return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= minimum &&
        value <= maximum
    );
}

export async function updateAddress(
    input: UpdateAddressInput,
): Promise<UpdateAddressResult> {
    const id = cleanText(input.id);
    const label = cleanText(input.label);
    const recipientName = cleanText(input.recipientName);
    const phone = cleanText(input.phone);
    const addressLine1 = cleanText(input.addressLine1);
    const city = cleanText(input.city);
    const state = cleanText(input.state);
    const pincode = cleanText(input.pincode);

    if (
        !id ||
        !label ||
        !recipientName ||
        !phone ||
        !addressLine1 ||
        !city ||
        !state
    ) {
        return { error: "Please complete all required fields." };
    }

    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
        return { error: "Enter a valid six-digit Indian PIN code." };
    }

    if ((input.latitude === null) !== (input.longitude === null)) {
        return {
            error: "Enter both latitude and longitude, or leave both blank.",
        };
    }

    if (
        (input.latitude !== null &&
            !validCoordinate(input.latitude, -90, 90)) ||
        (input.longitude !== null &&
            !validCoordinate(input.longitude, -180, 180))
    ) {
        return { error: "Enter valid latitude and longitude values." };
    }

    const supabase = await createClient();
    const { data, error: claimsError } = await supabase.auth.getClaims();
    const userId = data?.claims.sub;

    if (claimsError || !userId) {
        return { error: "Your session has expired. Please sign in again." };
    }

    const { error: updateError } = await supabase
        .from("addresses")
        .update({
            label,
            recipient_name: recipientName,
            phone,
            address_line1: addressLine1,
            address_line2: cleanText(input.addressLine2) || null,
            landmark: cleanText(input.landmark) || null,
            city,
            state,
            pincode,
            latitude: input.latitude,
            longitude: input.longitude,
            is_default: input.isDefault === true,
        })
        .eq("id", id)
        .eq("user_id", userId);

    if (updateError) {
        return {
            error:
                updateError.code === "23505"
                    ? "You already have a default address. Save this address without making it default."
                    : "We could not update this address. Please check the details and try again.",
        };
    }

    revalidatePath("/addresses");
    redirect("/addresses");
}
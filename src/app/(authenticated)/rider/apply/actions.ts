"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function submitRiderApplicationAction(
    formData: FormData,
) {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    const fullName = String(formData.get("full_name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const vehicleType = String(
        formData.get("vehicle_type") ?? "",
    ).trim();
    const vehicleNumber = String(
        formData.get("vehicle_number") ?? "",
    )
        .trim()
        .toUpperCase();

    if (
        !fullName ||
        !phone ||
        !vehicleType ||
        !vehicleNumber
    ) {
        throw new Error("All rider application fields are required.");
    }

    const { data: profile, error: profileError } =
        await supabase
            .from("profiles")
            .select("id, role")
            .eq("id", user.id)
            .single();

    if (profileError || !profile) {
        throw new Error("Unable to load your profile.");
    }

    if (profile.role !== "customer") {
        throw new Error(
            "Only customer accounts can apply to become delivery partners.",
        );
    }

    const { data: existingApplication } =
        await supabase
            .from("delivery_partner_applications")
            .select("id, status")
            .eq("profile_id", user.id)
            .eq("status", "PENDING")
            .maybeSingle();

    if (existingApplication) {
        throw new Error(
            "You already have a rider application under review.",
        );
    }

    // Update the user's profile information.
    const { error: profileUpdateError } =
        await supabase
            .from("profiles")
            .update({
                full_name: fullName,
                phone,
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

    if (profileUpdateError) {
        console.error(
            "RIDER APPLICATION PROFILE UPDATE ERROR:",
            profileUpdateError,
        );

        throw new Error(
            "Unable to update your profile information.",
        );
    }

    // Create the application.
    const { error: applicationError } =
        await supabase
            .from("delivery_partner_applications")
            .insert({
                profile_id: user.id,
                phone,
                vehicle_type: vehicleType,
                vehicle_number: vehicleNumber,
                status: "PENDING",
            });

    if (applicationError) {
        console.error(
            "RIDER APPLICATION CREATE ERROR:",
            applicationError,
        );

        throw new Error(
            "Unable to submit your rider application.",
        );
    }

    redirect("/rider/apply");
}
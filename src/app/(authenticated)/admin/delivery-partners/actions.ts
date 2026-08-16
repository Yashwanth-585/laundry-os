"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAdminClient() {
    // ----------------------------------------------------------
    // AUTHENTICATED CLIENT
    // ----------------------------------------------------------
    // Use the normal SSR client to identify the currently
    // logged-in user and verify that they are an admin.
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            supabase: null,
            user: null,
            error: "Your session has expired. Please sign in again.",
        };
    }

    // ----------------------------------------------------------
    // VERIFY ADMIN
    // ----------------------------------------------------------

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
            supabase: null,
            user: null,
            error: "You are not authorized to perform this action.",
        };
    }

    // ----------------------------------------------------------
    // ADMIN CLIENT
    // ----------------------------------------------------------
    // At this point we know the current authenticated user is an
    // admin. Use the service-role client for administrative
    // database operations so RLS does not prevent the admin from
    // accessing another user's profile or rider record.

    const adminSupabase = createAdminClient();

    return {
        supabase: adminSupabase,
        user,
        error: null,
    };
}

/**
 * ----------------------------------------------------------
 * APPROVE RIDER APPLICATION
 * ----------------------------------------------------------
 */
export async function approveRiderApplicationAction(
    formData: FormData,
) {
    const applicationId = String(
        formData.get("application_id") ?? "",
    ).trim();

    console.log(
        "APPROVE RIDER ACTION CALLED:",
        applicationId,
    );

    if (!applicationId) {
        return {
            success: false,
            error: "Application ID is required.",
        };
    }

    const { supabase, user, error } = await getAdminClient();

    if (!user || !supabase) {
        console.error(
            "APPROVE RIDER ADMIN VERIFICATION FAILED:",
            error,
        );

        return {
            success: false,
            error,
        };
    }

    console.log(
        "APPROVE RIDER ADMIN VERIFIED:",
        user.id,
    );

    // ----------------------------------------------------------
    // APPLICATION
    // ----------------------------------------------------------

    const {
        data: application,
        error: applicationError,
    } = await supabase
        .from("delivery_partner_applications")
        .select(
            `
            id,
            profile_id,
            phone,
            vehicle_type,
            vehicle_number,
            status
            `,
        )
        .eq("id", applicationId)
        .single();

    if (applicationError || !application) {
        console.error(
            "APPROVE RIDER APPLICATION FETCH ERROR:",
            applicationError,
        );

        return {
            success: false,
            error: "Rider application not found.",
        };
    }

    console.log(
        "APPROVE RIDER APPLICATION FOUND:",
        application,
    );

    if (application.status !== "PENDING") {
        return {
            success: false,
            error: `This application has already been ${application.status.toLowerCase()}.`,
        };
    }

    // ----------------------------------------------------------
    // CHECK APPLICANT PROFILE
    // ----------------------------------------------------------

    const {
        data: applicantProfile,
        error: applicantError,
    } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", application.profile_id)
        .single();

    if (applicantError || !applicantProfile) {
        console.error(
            "APPROVE RIDER PROFILE FETCH ERROR:",
            applicantError,
        );

        return {
            success: false,
            error: "Applicant profile not found.",
        };
    }

    console.log(
        "APPROVE RIDER APPLICANT PROFILE FOUND:",
        applicantProfile,
    );

    if (applicantProfile.role !== "customer") {
        return {
            success: false,
            error:
                "This account is no longer eligible for rider approval.",
        };
    }

    // ----------------------------------------------------------
    // CHECK EXISTING DELIVERY PARTNER
    // ----------------------------------------------------------

    const {
        data: existingPartner,
        error: existingPartnerError,
    } = await supabase
        .from("delivery_partners")
        .select("id")
        .eq("profile_id", application.profile_id)
        .maybeSingle();

    if (existingPartnerError) {
        console.error(
            "EXISTING RIDER CHECK ERROR:",
            existingPartnerError,
        );

        return {
            success: false,
            error: "Unable to verify the rider account.",
        };
    }

    if (existingPartner) {
        return {
            success: false,
            error:
                "A delivery partner profile already exists for this account.",
        };
    }

    const now = new Date().toISOString();

    // ----------------------------------------------------------
    // UPDATE PROFILE ROLE
    // ----------------------------------------------------------

    const {
        error: roleUpdateError,
    } = await supabase
        .from("profiles")
        .update({
            role: "delivery_partner",
            updated_at: now,
        })
        .eq("id", application.profile_id)
        .eq("role", "customer");

    if (roleUpdateError) {
        console.error(
            "RIDER ROLE UPDATE ERROR:",
            roleUpdateError,
        );

        return {
            success: false,
            error:
                "Unable to update the applicant's account role.",
        };
    }

    // ----------------------------------------------------------
    // CREATE DELIVERY PARTNER
    // ----------------------------------------------------------

    const {
        data: deliveryPartner,
        error: partnerCreateError,
    } = await supabase
        .from("delivery_partners")
        .insert({
            profile_id: application.profile_id,
            phone: application.phone,
            vehicle_type: application.vehicle_type,
            vehicle_number: application.vehicle_number,
            is_available: false,
            is_active: true,
            is_approved: true,
        })
        .select("id")
        .single();

    if (partnerCreateError || !deliveryPartner) {
        console.error(
            "DELIVERY PARTNER CREATE ERROR:",
            partnerCreateError,
        );

        // Roll profile role back.
        await supabase
            .from("profiles")
            .update({
                role: "customer",
                updated_at: new Date().toISOString(),
            })
            .eq("id", application.profile_id);

        return {
            success: false,
            error:
                "Unable to create the delivery partner account.",
        };
    }

    console.log(
        "DELIVERY PARTNER CREATED:",
        deliveryPartner.id,
    );

    // ----------------------------------------------------------
    // APPROVE APPLICATION
    // ----------------------------------------------------------

    const {
        error: applicationUpdateError,
    } = await supabase
        .from("delivery_partner_applications")
        .update({
            status: "APPROVED",
            reviewed_by: user.id,
            reviewed_at: now,
            updated_at: now,
        })
        .eq("id", applicationId)
        .eq("status", "PENDING");

    if (applicationUpdateError) {
        console.error(
            "RIDER APPLICATION APPROVAL ERROR:",
            applicationUpdateError,
        );

        // Roll back delivery partner.
        await supabase
            .from("delivery_partners")
            .delete()
            .eq("id", deliveryPartner.id);

        // Roll back profile role.
        await supabase
            .from("profiles")
            .update({
                role: "customer",
                updated_at: new Date().toISOString(),
            })
            .eq("id", application.profile_id);

        return {
            success: false,
            error:
                "Unable to finalize the rider application approval.",
        };
    }

    console.log(
        "RIDER APPLICATION APPROVED:",
        applicationId,
    );

    return {
        success: true,
        message: "Rider application approved successfully.",
    };
}

/**
 * ----------------------------------------------------------
 * REJECT RIDER APPLICATION
 * ----------------------------------------------------------
 */
export async function rejectRiderApplicationAction(
    formData: FormData,
) {
    const applicationId = String(
        formData.get("application_id") ?? "",
    ).trim();

    const rejectionReason = String(
        formData.get("rejection_reason") ?? "",
    );

    if (!applicationId) {
        return {
            success: false,
            error: "Application ID is required.",
        };
    }

    const reason = rejectionReason.trim();

    if (!reason) {
        return {
            success: false,
            error: "Please provide a rejection reason.",
        };
    }

    if (reason.length > 500) {
        return {
            success: false,
            error:
                "Rejection reason cannot exceed 500 characters.",
        };
    }

    const { supabase, user, error } = await getAdminClient();

    if (!user || !supabase) {
        return {
            success: false,
            error,
        };
    }

    // ----------------------------------------------------------
    // APPLICATION
    // ----------------------------------------------------------

    const {
        data: application,
        error: applicationError,
    } = await supabase
        .from("delivery_partner_applications")
        .select("id, profile_id, status")
        .eq("id", applicationId)
        .single();

    if (applicationError || !application) {
        return {
            success: false,
            error: "Rider application not found.",
        };
    }

    if (application.status !== "PENDING") {
        return {
            success: false,
            error: `This application has already been ${application.status.toLowerCase()}.`,
        };
    }

    // ----------------------------------------------------------
    // REJECT APPLICATION
    // ----------------------------------------------------------

    const now = new Date().toISOString();

    const {
        error: updateError,
    } = await supabase
        .from("delivery_partner_applications")
        .update({
            status: "REJECTED",
            reviewed_by: user.id,
            reviewed_at: now,
            rejection_reason: reason,
            updated_at: now,
        })
        .eq("id", applicationId)
        .eq("status", "PENDING");

    if (updateError) {
        console.error(
            "RIDER APPLICATION REJECTION ERROR:",
            updateError,
        );

        return {
            success: false,
            error:
                "Unable to reject the rider application.",
        };
    }

    return {
        success: true,
        message: "Rider application rejected.",
    };
}

/**
 * ----------------------------------------------------------
 * ACTIVATE / DEACTIVATE RIDER
 * ----------------------------------------------------------
 */
export async function toggleRiderActiveAction(
    formData: FormData,
) {
    const riderId = String(
        formData.get("rider_id") ?? "",
    ).trim();

    if (!riderId) {
        return {
            success: false,
            error: "Rider ID is required.",
        };
    }

    const { supabase, user, error } = await getAdminClient();

    if (!user || !supabase) {
        return {
            success: false,
            error,
        };
    }

    // ----------------------------------------------------------
    // FETCH RIDER
    // ----------------------------------------------------------

    const {
        data: rider,
        error: riderError,
    } = await supabase
        .from("delivery_partners")
        .select(
            "id, profile_id, is_active, is_approved, is_available",
        )
        .eq("id", riderId)
        .single();

    if (riderError || !rider) {
        return {
            success: false,
            error: "Delivery partner not found.",
        };
    }

    if (!rider.is_approved) {
        return {
            success: false,
            error:
                "This delivery partner has not been approved.",
        };
    }

    const newActiveState = !rider.is_active;
    const now = new Date().toISOString();

    // ----------------------------------------------------------
    // UPDATE RIDER
    // ----------------------------------------------------------

    const {
        error: updateError,
    } = await supabase
        .from("delivery_partners")
        .update({
            is_active: newActiveState,

            // An inactive rider must not remain available
            // for new assignments.
            is_available: newActiveState
                ? rider.is_available
                : false,

            updated_at: now,
        })
        .eq("id", rider.id);

    if (updateError) {
        console.error(
            "TOGGLE RIDER ACTIVE ERROR:",
            updateError,
        );

        return {
            success: false,
            error:
                "Unable to update the rider account.",
        };
    }

    return {
        success: true,
        message: newActiveState
            ? "Rider activated successfully."
            : "Rider deactivated successfully.",
    };
}
"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ActionResult =
    | { success: true; message: string }
    | { success: false; error: string };

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function inviteStaffAction(
    input: {
        fullName: string;
        email: string;
    },
): Promise<ActionResult> {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: "You must be logged in." };
    }

    // Verify admin access.
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || profile.role !== "admin") {
        return { success: false, error: "Unauthorized." };
    }

    const fullName = input.fullName.trim();
    const email = input.email.trim().toLowerCase();

    if (!fullName) {
        return { success: false, error: "Full name is required." };
    }

    if (!isValidEmail(email)) {
        return {
            success: false,
            error: "Enter a valid email address.",
        };
    }

    const admin = createAdminClient();

    // Check whether this email already belongs to an account.
    // (Supabase's admin API does not support filtering listUsers
    // by email directly, so we look it up ourselves — acceptable
    // for a single-facility app with a small user base.)
    const { data: userList, error: listError } =
        await admin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
        });

    if (listError) {
        console.error("STAFF INVITE — LIST USERS ERROR:", listError);

        return {
            success: false,
            error:
                "Unable to verify the email address right now. Please try again.",
        };
    }

    const existingUser = userList.users.find(
        (candidate) => candidate.email?.toLowerCase() === email,
    );

    if (existingUser) {
        const { data: existingProfile } = await admin
            .from("profiles")
            .select("role")
            .eq("id", existingUser.id)
            .single();

        if (existingProfile?.role === "vendor") {
            return {
                success: false,
                error: "A staff account with this email already exists.",
            };
        }

        // Refuse to silently convert another admin account.
        if (existingProfile?.role === "admin") {
            return {
                success: false,
                error:
                    "This email belongs to an admin account and cannot be converted to staff.",
            };
        }

        // Convert the existing account (customer / delivery_partner)
        // to staff in place. Their login credentials are untouched —
        // only their role and name change, so the next time they
        // sign in, existing role-based routing sends them to /staff.
        //
        // upsert (not update) so that a missing profile row is
        // created rather than silently matching zero rows —
        // .update().eq() would otherwise report success even when
        // nothing was actually written.
        const { data: convertedProfile, error: convertError } =
            await admin
                .from("profiles")
                .upsert(
                    {
                        id: existingUser.id,
                        role: "vendor",
                        full_name: fullName,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "id" },
                )
                .select("id")
                .single();

        if (convertError || !convertedProfile) {
            console.error(
                "STAFF CONVERT EXISTING ACCOUNT ERROR:",
                convertError,
            );

            return {
                success: false,
                error:
                    "Unable to convert this account to staff. Please try again.",
            };
        }

        revalidatePath("/admin/staff");

        return {
            success: true,
            message:
                "Existing account converted to staff successfully.",
        };
    }

    // No existing account — send a fresh invitation.
    const { data: invited, error: inviteError } =
        await admin.auth.admin.inviteUserByEmail(email);

    if (inviteError || !invited?.user) {
        console.error("STAFF INVITE ERROR:", inviteError);

        return {
            success: false,
            error:
                "Unable to send the staff invitation. Please try again.",
        };
    }

    // The on_auth_user_created trigger should have already created
    // a default profile row (role='customer') by the time this
    // resolves — but we upsert rather than update so that, even if
    // that row somehow isn't there yet, we still land the correct
    // role/name instead of silently writing nothing.
    const { data: updatedProfile, error: updateProfileError } =
        await admin
            .from("profiles")
            .upsert(
                {
                    id: invited.user.id,
                    role: "vendor",
                    full_name: fullName,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "id" },
            )
            .select("id")
            .single();

    if (updateProfileError || !updatedProfile) {
        console.error(
            "STAFF PROFILE UPDATE ERROR:",
            updateProfileError,
        );

        return {
            success: false,
            error:
                "The invitation was sent, but the staff profile could not be fully set up. Please check manually.",
        };
    }

    revalidatePath("/admin/staff");

    return {
        success: true,
        message: "Staff invitation sent successfully.",
    };
}
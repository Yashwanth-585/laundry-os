import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
    approveRiderApplicationAction,
    rejectRiderApplicationAction,
    toggleRiderActiveAction,
} from "./actions";

function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default async function AdminDeliveryPartnersPage() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    // ----------------------------------------------------------
    // VERIFY ADMIN
    // ----------------------------------------------------------

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

    if (
        profileError ||
        !profile ||
        profile.role !== "admin"
    ) {
        redirect("/dashboard");
    }

    // ----------------------------------------------------------
    // FETCH APPLICATIONS
    // ----------------------------------------------------------

    const {
        data: applications,
        error: applicationsError,
    } = await supabase
        .from("delivery_partner_applications")
        .select(
            `
            id,
            profile_id,
            phone,
            vehicle_type,
            vehicle_number,
            status,
            rejection_reason,
            created_at,
            updated_at
            `,
        )
        .order("created_at", { ascending: false });

    if (applicationsError) {
        console.error(
            "ADMIN RIDER APPLICATIONS ERROR:",
            applicationsError,
        );
    }

    const allApplications = applications ?? [];

    const pendingApplications = allApplications.filter(
        (application) => application.status === "PENDING",
    );

    const reviewedApplications = allApplications.filter(
        (application) => application.status !== "PENDING",
    );

    // ----------------------------------------------------------
    // FETCH APPROVED RIDERS
    // ----------------------------------------------------------

    const { data: riders, error: ridersError } = await supabase
        .from("delivery_partners")
        .select(
            `
            id,
            profile_id,
            phone,
            vehicle_type,
            vehicle_number,
            is_available,
            is_active,
            is_approved,
            created_at
            `,
        )
        .order("created_at", { ascending: false });

    if (ridersError) {
        console.error(
            "ADMIN RIDERS ERROR:",
            ridersError,
        );
    }

    const approvedRiders = riders ?? [];

    // ----------------------------------------------------------
    // FETCH PROFILE NAMES
    // ----------------------------------------------------------

    const profileIds = Array.from(
        new Set([
            ...allApplications.map(
                (application) => application.profile_id,
            ),
            ...approvedRiders.map(
                (rider) => rider.profile_id,
            ),
        ]),
    );

    let applicantProfiles: {
        id: string;
        full_name: string | null;
    }[] = [];

    if (profileIds.length > 0) {
        const {
            data: profiles,
            error: profilesError,
        } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", profileIds);

        if (profilesError) {
            console.error(
                "ADMIN RIDER PROFILES ERROR:",
                profilesError,
            );
        }

        applicantProfiles = profiles ?? [];
    }

    const profileMap = new Map(
        applicantProfiles.map((item) => [
            item.id,
            item.full_name,
        ]),
    );

    // ----------------------------------------------------------
    // STATS
    // ----------------------------------------------------------

    const availableRiders = approvedRiders.filter(
        (rider) =>
            rider.is_active &&
            rider.is_approved &&
            rider.is_available,
    ).length;

    return (
        <main className="min-h-screen bg-sky-100/70">
            <div className="mx-auto max-w-[1500px] px-4 py-8 pb-20 sm:px-5 lg:px-6">

                {/* Header */}
                <header>
                    <Link
                        href="/admin"
                        className="text-xs font-bold text-brand-blue-deep hover:underline"
                    >
                        ← Back to Admin Dashboard
                    </Link>

                    <p className="mt-5 text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                        Administration
                    </p>

                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                        Delivery Partners
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                        Review rider applications and manage approved
                        delivery partners.
                    </p>
                </header>

                {/* Stats */}
                <section className="mt-8 grid gap-4 sm:grid-cols-3">

                    {/* Pending */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Pending applications
                        </p>

                        <p className="mt-3 text-3xl font-extrabold text-brand-orange">
                            {pendingApplications.length}
                        </p>
                    </div>

                    {/* Approved */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Approved riders
                        </p>

                        <p className="mt-3 text-3xl font-extrabold text-brand-navy">
                            {approvedRiders.length}
                        </p>
                    </div>

                    {/* Available */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Available riders
                        </p>

                        <p className="mt-3 text-3xl font-extrabold text-emerald-600">
                            {availableRiders}
                        </p>
                    </div>
                </section>

                {/* =====================================================
                    PENDING APPLICATIONS
                ====================================================== */}

                <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-5">
                        <h2 className="font-bold text-slate-900">
                            Pending Applications
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Review applications submitted by customers who
                            want to become delivery partners.
                        </p>
                    </div>

                    {pendingApplications.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {pendingApplications.map(
                                (application) => (
                                    <div
                                        key={application.id}
                                        className="px-6 py-6"
                                    >
                                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

                                            {/* Application information */}
                                            <div className="grid flex-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

                                                {/* Applicant */}
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                        Applicant
                                                    </p>

                                                    <p className="mt-2 text-sm font-bold text-slate-900">
                                                        {profileMap.get(
                                                            application.profile_id,
                                                        ) ??
                                                            "Unknown user"}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-400">
                                                        Applied{" "}
                                                        {formatDate(
                                                            application.created_at,
                                                        )}
                                                    </p>
                                                </div>

                                                {/* Phone */}
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                        Phone
                                                    </p>

                                                    <p className="mt-2 text-sm font-semibold text-slate-700">
                                                        {
                                                            application.phone
                                                        }
                                                    </p>
                                                </div>

                                                {/* Vehicle */}
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                        Vehicle
                                                    </p>

                                                    <p className="mt-2 text-sm font-semibold text-slate-700">
                                                        {
                                                            application.vehicle_type
                                                        }
                                                    </p>
                                                </div>

                                                {/* Vehicle number */}
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                        Vehicle number
                                                    </p>

                                                    <p className="mt-2 text-sm font-bold text-slate-800">
                                                        {
                                                            application.vehicle_number
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">

                                                {/* Approve */}
                                                <form
                                                    action={async (formData) => {
                                                        "use server";

                                                        await approveRiderApplicationAction(formData);
                                                    }}
                                                >
                                                    <input
                                                        type="hidden"
                                                        name="application_id"
                                                        value={
                                                            application.id
                                                        }
                                                    />

                                                    <button
                                                        type="submit"
                                                        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                                                    >
                                                        Approve Application
                                                    </button>
                                                </form>

                                                {/* Reject */}
                                                <form
                                                    action={async (formData) => {
                                                        "use server";

                                                        await rejectRiderApplicationAction(formData);
                                                    }}
                                                    className="flex flex-col gap-2"
                                                >
                                                    <input
                                                        type="hidden"
                                                        name="application_id"
                                                        value={
                                                            application.id
                                                        }
                                                    />

                                                    <input
                                                        name="rejection_reason"
                                                        type="text"
                                                        placeholder="Reason for rejection"
                                                        required
                                                        maxLength={500}
                                                        className="rounded-lg border border-slate-300 px-3 py-2.5 text-xs outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
                                                    />

                                                    <button
                                                        type="submit"
                                                        className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
                                                    >
                                                        Reject Application
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    ) : (
                        <div className="px-6 py-12 text-center">
                            <p className="text-sm font-semibold text-slate-700">
                                No pending applications
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                New rider applications will appear here.
                            </p>
                        </div>
                    )}
                </section>

                {/* =====================================================
                    APPROVED RIDERS
                ====================================================== */}

                <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-5">
                        <h2 className="font-bold text-slate-900">
                            Approved Riders
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Delivery partners currently registered with
                            WashLand.
                        </p>
                    </div>

                    {approvedRiders.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1100px] text-left">
                                <thead className="border-b border-slate-100 bg-slate-50/70">
                                    <tr>
                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Rider
                                        </th>

                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Phone
                                        </th>

                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Vehicle
                                        </th>

                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Account
                                        </th>

                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Availability
                                        </th>

                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Created
                                        </th>

                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {approvedRiders.map(
                                        (rider) => (
                                            <tr
                                                key={rider.id}
                                                className="hover:bg-slate-50"
                                            >
                                                {/* Rider */}
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-bold text-slate-900">
                                                        {profileMap.get(
                                                            rider.profile_id,
                                                        ) ??
                                                            "Unknown user"}
                                                    </p>
                                                </td>

                                                {/* Phone */}
                                                <td className="px-6 py-4 text-sm text-slate-700">
                                                    {rider.phone ??
                                                        "—"}
                                                </td>

                                                {/* Vehicle */}
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-semibold text-slate-700">
                                                        {rider.vehicle_type ??
                                                            "—"}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-400">
                                                        {rider.vehicle_number ??
                                                            "—"}
                                                    </p>
                                                </td>

                                                {/* Account status */}
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${rider.is_active &&
                                                            rider.is_approved
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-red-50 text-red-700"
                                                            }`}
                                                    >
                                                        {rider.is_active &&
                                                            rider.is_approved
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </span>
                                                </td>

                                                {/* Availability */}
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${rider.is_available
                                                            ? "bg-blue-50 text-blue-700"
                                                            : "bg-slate-100 text-slate-600"
                                                            }`}
                                                    >
                                                        {rider.is_available
                                                            ? "Available"
                                                            : "Unavailable"}
                                                    </span>
                                                </td>

                                                {/* Created */}
                                                <td className="px-6 py-4 text-sm text-slate-500">
                                                    {formatDate(
                                                        rider.created_at,
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-4">
                                                    <form
                                                        action={async (formData) => {
                                                            "use server";

                                                            await toggleRiderActiveAction(formData);
                                                        }}
                                                    >
                                                        <input
                                                            type="hidden"
                                                            name="rider_id"
                                                            value={
                                                                rider.id
                                                            }
                                                        />

                                                        <button
                                                            type="submit"
                                                            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${rider.is_active
                                                                ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                                                                }`}
                                                        >
                                                            {rider.is_active
                                                                ? "Deactivate"
                                                                : "Activate"}
                                                        </button>
                                                    </form>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="px-6 py-12 text-center text-sm text-slate-500">
                            No approved riders yet.
                        </div>
                    )}
                </section>

                {/* =====================================================
                    APPLICATION HISTORY
                ====================================================== */}

                {
                    reviewedApplications.length > 0 && (
                        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-100 px-6 py-5">
                                <h2 className="font-bold text-slate-900">
                                    Application History
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    Previously reviewed rider applications.
                                </p>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {reviewedApplications.map(
                                    (application) => (
                                        <div
                                            key={application.id}
                                            className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">
                                                    {profileMap.get(
                                                        application.profile_id,
                                                    ) ??
                                                        "Unknown user"}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    {
                                                        application.vehicle_type
                                                    }{" "}
                                                    ·{" "}
                                                    {
                                                        application.vehicle_number
                                                    }
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${application.status ===
                                                        "APPROVED"
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-red-50 text-red-700"
                                                        }`}
                                                >
                                                    {
                                                        application.status
                                                    }
                                                </span>

                                                {application.rejection_reason && (
                                                    <span className="max-w-md text-xs text-slate-500">
                                                        {
                                                            application.rejection_reason
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>
                        </section>
                    )
                }
            </div >
        </main >
    );
}
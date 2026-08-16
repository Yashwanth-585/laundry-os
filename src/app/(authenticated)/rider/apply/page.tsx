import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { submitRiderApplicationAction } from "./actions";

export default async function RiderApplicationPage() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        redirect("/dashboard");
    }

    // Already a rider — no reason to apply again.
    if (profile.role === "delivery_partner") {
        redirect("/rider");
    }

    // Only customers can submit rider applications.
    if (profile.role !== "customer") {
        redirect("/dashboard");
    }

    const { data: existingApplication } = await supabase
        .from("delivery_partner_applications")
        .select(
            `
            id,
            phone,
            vehicle_type,
            vehicle_number,
            status,
            rejection_reason,
            created_at,
            updated_at
            `,
        )
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    return (
        <main className="min-h-screen bg-sky-100/70">
            <div className="mx-auto max-w-3xl px-4 py-8 pb-20 sm:px-6 lg:px-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                        Delivery Partner
                    </p>

                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy">
                        Become a Rider
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        Submit your details to apply as a WashLand delivery
                        partner. Your application will be reviewed by an
                        administrator.
                    </p>

                    {existingApplication?.status === "PENDING" && (
                        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-bold text-amber-800">
                                Application under review
                            </p>

                            <p className="mt-1 text-sm text-amber-700">
                                Your rider application is currently being
                                reviewed by the administration team.
                            </p>
                        </div>
                    )}

                    {existingApplication?.status === "APPROVED" && (
                        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                            <p className="text-sm font-bold text-emerald-800">
                                Application approved
                            </p>

                            <p className="mt-1 text-sm text-emerald-700">
                                Your rider account has been approved.
                            </p>

                            <a
                                href="/rider"
                                className="mt-3 inline-flex rounded-lg bg-brand-navy px-4 py-2 text-xs font-bold text-white hover:bg-brand-blue-deep"
                            >
                                Go to Rider Dashboard
                            </a>
                        </div>
                    )}

                    {existingApplication?.status === "REJECTED" && (
                        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
                            <p className="text-sm font-bold text-red-800">
                                Application rejected
                            </p>

                            {existingApplication.rejection_reason && (
                                <p className="mt-1 text-sm text-red-700">
                                    Reason:{" "}
                                    {existingApplication.rejection_reason}
                                </p>
                            )}

                            <p className="mt-2 text-xs text-red-600">
                                You may submit a new application with updated
                                information.
                            </p>
                        </div>
                    )}

                    {(!existingApplication ||
                        existingApplication.status === "REJECTED") && (
                            <form
                                action={submitRiderApplicationAction}
                                className="mt-8 space-y-5"
                            >
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Full name
                                        <input
                                            name="full_name"
                                            type="text"
                                            defaultValue={profile.full_name ?? ""}
                                            required
                                            className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 outline-none focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/20"
                                        />
                                    </label>

                                    <label className="block text-sm font-semibold text-slate-700">
                                        Phone number
                                        <input
                                            name="phone"
                                            type="tel"
                                            defaultValue={
                                                existingApplication?.phone ??
                                                profile.phone ??
                                                ""
                                            }
                                            required
                                            className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 outline-none focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/20"
                                        />
                                    </label>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Vehicle type
                                        <select
                                            name="vehicle_type"
                                            defaultValue={
                                                existingApplication?.vehicle_type ??
                                                ""
                                            }
                                            required
                                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 outline-none focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/20"
                                        >
                                            <option value="">
                                                Select vehicle
                                            </option>
                                            <option value="BIKE">Bike</option>
                                            <option value="SCOOTER">
                                                Scooter
                                            </option>
                                            <option value="CAR">Car</option>
                                            <option value="VAN">Van</option>
                                        </select>
                                    </label>

                                    <label className="block text-sm font-semibold text-slate-700">
                                        Vehicle number
                                        <input
                                            name="vehicle_number"
                                            type="text"
                                            defaultValue={
                                                existingApplication?.vehicle_number ??
                                                ""
                                            }
                                            required
                                            className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 uppercase outline-none focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/20"
                                        />
                                    </label>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-xs leading-5 text-slate-500">
                                        Your application will remain pending until
                                        an administrator reviews and approves it.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full rounded-lg bg-brand-navy px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-blue-deep"
                                >
                                    Submit Rider Application
                                </button>
                            </form>
                        )}
                </div>
            </div>
        </main>
    );
}
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import AvailabilityToggle from "./AvailabilityToggle";

function formatStatus(status: string) {
    return status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date: string | null) {
    if (!date) return "Not assigned";

    return new Date(date).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default async function RiderDashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    // ----------------------------------------------------------
    // VERIFY DELIVERY PARTNER
    // ----------------------------------------------------------

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();

    if (
        profileError ||
        !profile ||
        profile.role !== "delivery_partner"
    ) {
        redirect("/dashboard");
    }

    const { data: deliveryPartner, error: partnerError } =
        await supabase
            .from("delivery_partners")
            .select(
                `
                id,
                is_active,
                is_approved,
                is_available
                `,
            )
            .eq("profile_id", user.id)
            .single();

    if (partnerError || !deliveryPartner) {
        return (
            <main className="min-h-screen bg-sky-100/70">
                <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                    <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-red-500">
                            Delivery Partner
                        </p>

                        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
                            Rider account not configured
                        </h1>

                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            Your account is marked as a delivery partner, but
                            no delivery partner profile is currently linked to
                            your account.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // ----------------------------------------------------------
    // FETCH RIDER TASKS
    // ----------------------------------------------------------

    const { data: tasks, error: tasksError } = await supabase
        .from("delivery_tasks")
        .select(
            `
            id,
            order_id,
            task_type,
            status,
            assigned_at,
            accepted_at,
            started_at,
            completed_at,
            pickup_otp,
            delivery_otp,
            actual_item_count,
            actual_weight,
            notes
            `,
        )
        .eq("delivery_partner_id", deliveryPartner.id)
        .order("assigned_at", { ascending: false });

    if (tasksError) {
        console.error("RIDER TASKS ERROR:", tasksError);
    }

    const allTasks = tasks ?? [];

    // BOTH pickup and delivery tasks.
    const assignedTasks = allTasks.filter(
        (task) =>
            ["PICKUP", "DROP"].includes(task.task_type) &&
            task.status === "ASSIGNED",
    );

    const activeTasks = allTasks.filter(
        (task) =>
            !["COMPLETED", "CANCELLED"].includes(task.status),
    );

    return (
        <main className="min-h-screen bg-sky-100/70">
            <div className="mx-auto max-w-6xl px-4 py-8 pb-20 sm:px-6 lg:px-8">

                {/* Header */}
                <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                            Delivery Operations
                        </p>

                        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                            Rider Dashboard
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                            Welcome back,{" "}
                            <span className="font-semibold text-slate-800">
                                {profile.full_name || user.email}
                            </span>
                        </p>
                    </div>

                    <AvailabilityToggle
                        initialAvailability={deliveryPartner.is_available}
                    />
                </header>

                {/* Stats */}
                <section className="mt-8 grid gap-4 sm:grid-cols-3">

                    {/* Assigned */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Assigned tasks
                        </p>

                        <p className="mt-3 text-3xl font-extrabold text-brand-orange">
                            {assignedTasks.length}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Waiting for your action
                        </p>
                    </div>

                    {/* Active */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Active tasks
                        </p>

                        <p className="mt-3 text-3xl font-extrabold text-brand-navy">
                            {activeTasks.length}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Tasks currently in progress
                        </p>
                    </div>

                    {/* Account */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Account
                        </p>

                        <p
                            className={`mt-3 text-lg font-extrabold ${deliveryPartner.is_active &&
                                    deliveryPartner.is_approved
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }`}
                        >
                            {deliveryPartner.is_active &&
                                deliveryPartner.is_approved
                                ? "Active"
                                : "Inactive"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Delivery partner status
                        </p>
                    </div>
                </section>

                {/* Assigned Tasks */}
                <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">

                    <div className="border-b border-slate-100 px-6 py-5">
                        <h2 className="font-bold text-slate-900">
                            Assigned Tasks
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Pickup and delivery tasks assigned to you by the
                            admin.
                        </p>
                    </div>

                    {assignedTasks.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {assignedTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="flex flex-col gap-5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-bold text-slate-900">
                                                Order #
                                                {task.order_id
                                                    .slice(0, 8)
                                                    .toUpperCase()}
                                            </p>

                                            {/* TASK TYPE */}
                                            {task.task_type === "PICKUP" ? (
                                                <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                                                    PICKUP
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700">
                                                    DELIVERY
                                                </span>
                                            )}
                                        </div>

                                        <p className="mt-1 text-xs text-slate-500">
                                            {task.task_type === "PICKUP"
                                                ? "Customer → Facility"
                                                : "Facility → Customer"}
                                        </p>

                                        <p className="mt-2 text-xs text-slate-400">
                                            Assigned{" "}
                                            {formatDate(task.assigned_at)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${task.task_type === "PICKUP"
                                                    ? "border border-amber-100 bg-amber-50 text-amber-700"
                                                    : "border border-purple-100 bg-purple-50 text-purple-700"
                                                }`}
                                        >
                                            {formatStatus(task.status)}
                                        </span>

                                        <Link
                                            href={`/rider/tasks/${task.id}`}
                                            className="rounded-lg bg-brand-navy px-4 py-2.5 text-xs font-bold text-white transition hover:bg-brand-blue-deep"
                                        >
                                            View Task
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="px-6 py-12 text-center">
                            <p className="text-sm font-semibold text-slate-700">
                                No assigned tasks
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                New pickup or delivery assignments from the
                                admin will appear here.
                            </p>
                        </div>
                    )}
                </section>

                {/* Account information */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="font-bold text-slate-900">
                        Delivery Partner Status
                    </h2>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3">

                        <div>
                            <p className="text-xs text-slate-400">
                                Active
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-800">
                                {deliveryPartner.is_active ? "Yes" : "No"}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-400">
                                Approved
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-800">
                                {deliveryPartner.is_approved
                                    ? "Yes"
                                    : "No"}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-400">
                                Available
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-800">
                                {deliveryPartner.is_available
                                    ? "Yes"
                                    : "No"}
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
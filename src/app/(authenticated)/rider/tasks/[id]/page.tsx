import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AcceptPickupButton } from "@/components/rider/accept-pickup-button";
import { StartPickupButton } from "@/components/rider/start-pickup-button";
import { VerifyPickupOtp } from "@/components/rider/verify-pickup-otp";

function formatStatus(status: string) {
    return status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date: string | null) {
    if (!date) return "Not available";

    return new Date(date).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default async function RiderTaskPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    // Verify delivery partner account.
    const { data: partner, error: partnerError } = await supabase
        .from("delivery_partners")
        .select("id, is_active, is_approved")
        .eq("profile_id", user.id)
        .single();

    if (
        partnerError ||
        !partner ||
        !partner.is_active ||
        !partner.is_approved
    ) {
        redirect("/dashboard");
    }

    // Fetch only this rider's task.
    const { data: task, error: taskError } = await supabase
        .from("delivery_tasks")
        .select(
            `
            id,
            order_id,
            delivery_partner_id,
            task_type,
            status,
            assigned_at,
            accepted_at,
            started_at,
            completed_at,
            pickup_otp_verified_at,
            notes,
            orders (
                id,
                customer_id,
                address_id,
                status,
                pickup_date,
                pickup_slot,
                notes,
                subtotal,
                delivery_fee,
                tax_amount,
                total_amount,
                payment_status
            )
            `,
        )
        .eq("id", id)
        .eq("delivery_partner_id", partner.id)
        .single();

    if (taskError || !task) {
        redirect("/rider");
    }

    if (task.task_type !== "PICKUP") {
        redirect("/rider");
    }

    const order = Array.isArray(task.orders)
        ? task.orders[0]
        : task.orders;

    if (!order) {
        return (
            <main className="min-h-screen bg-sky-100/70">
                <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                    <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
                        <h1 className="text-xl font-bold text-slate-900">
                            Order information unavailable
                        </h1>

                        <p className="mt-2 text-sm text-slate-600">
                            The pickup task exists, but its associated order
                            could not be loaded.
                        </p>

                        <Link
                            href="/rider"
                            className="mt-6 inline-flex rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-bold text-white"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // Fetch the pickup address separately.
    const { data: address, error: addressError } = await supabase
        .from("addresses")
        .select(
            `
            id,
            label,
            recipient_name,
            phone,
            address_line1,
            address_line2,
            landmark,
            city,
            state,
            pincode,
            latitude,
            longitude
            `,
        )
        .eq("id", order.address_id)
        .single();

    if (addressError) {
        console.error("RIDER ADDRESS ERROR:", addressError);
    }

    return (
        <main className="min-h-screen bg-sky-100/70">
            <div className="mx-auto max-w-4xl px-4 py-8 pb-20 sm:px-6 lg:px-8">
                {/* Back */}
                <Link
                    href="/rider"
                    className="text-sm font-semibold text-brand-blue-deep hover:underline"
                >
                    ← Back to Rider Dashboard
                </Link>

                {/* Header */}
                <header className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                                Pickup Task
                            </p>

                            <h1 className="mt-2 text-2xl font-extrabold text-brand-navy">
                                Order #
                                {task.order_id
                                    .slice(0, 8)
                                    .toUpperCase()}
                            </h1>

                            <p className="mt-2 text-sm text-slate-500">
                                Assigned {formatDate(task.assigned_at)}
                            </p>
                        </div>

                        <span className="inline-flex w-fit rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                            {formatStatus(task.status)}
                        </span>
                    </div>
                </header>

                {/* Pickup schedule */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="font-bold text-slate-900">
                        Pickup Schedule
                    </h2>

                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Pickup date
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-800">
                                {new Date(
                                    `${order.pickup_date}T00:00:00`,
                                ).toLocaleDateString("en-IN", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Pickup slot
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-800">
                                {order.pickup_slot}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Customer / address */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="font-bold text-slate-900">
                        Pickup Location
                    </h2>

                    {address ? (
                        <div className="mt-5">
                            <p className="text-base font-bold text-slate-900">
                                {address.recipient_name}
                            </p>

                            <a
                                href={`tel:${address.phone}`}
                                className="mt-1 inline-block text-sm font-semibold text-brand-blue-deep hover:underline"
                            >
                                {address.phone}
                            </a>

                            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                                <p>{address.address_line1}</p>

                                {address.address_line2 ? (
                                    <p>{address.address_line2}</p>
                                ) : null}

                                {address.landmark ? (
                                    <p>
                                        Landmark: {address.landmark}
                                    </p>
                                ) : null}

                                <p>
                                    {address.city}, {address.state}{" "}
                                    {address.pincode}
                                </p>
                            </div>

                            {address.latitude !== null &&
                                address.longitude !== null ? (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${address.latitude},${address.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-4 inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Open in Maps
                                </a>
                            ) : null}
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-red-600">
                            Pickup address could not be loaded.
                        </p>
                    )}
                </section>

                {/* Order notes */}
                {order.notes || task.notes ? (
                    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="font-bold text-slate-900">
                            Notes
                        </h2>

                        {order.notes ? (
                            <div className="mt-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Customer order notes
                                </p>

                                <p className="mt-2 text-sm leading-6 text-slate-700">
                                    {order.notes}
                                </p>
                            </div>
                        ) : null}

                        {task.notes ? (
                            <div className="mt-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Task notes
                                </p>

                                <p className="mt-2 text-sm leading-6 text-slate-700">
                                    {task.notes}
                                </p>
                            </div>
                        ) : null}
                    </section>
                ) : null}

                {/* Task action */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="font-bold text-slate-900">
                        Pickup Action
                    </h2>

                    {task.status === "ASSIGNED" ? (
                        <>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Accept this pickup when you are ready to take
                                responsibility for the assignment.
                            </p>

                            <div className="mt-5">
                                <AcceptPickupButton taskId={task.id} />
                            </div>
                        </>
                    ) : task.status === "ACCEPTED" ? (
                        <>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Start the pickup when you have reached the
                                customer's location.
                            </p>

                            <div className="mt-5">
                                <StartPickupButton taskId={task.id} />
                            </div>
                        </>
                    ) : task.status === "IN_PROGRESS" ? (
                        <>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Ask the customer for the 6-digit pickup OTP
                                and enter it below to complete the pickup.
                            </p>

                            <div className="mt-5">
                                <VerifyPickupOtp taskId={task.id} />
                            </div>
                        </>
                    ) : (
                        <div className="mt-5 rounded-xl bg-slate-50 p-4">
                            <p className="text-sm font-semibold text-slate-700">
                                This task is currently{" "}
                                {formatStatus(task.status)}.
                            </p>

                            {task.accepted_at ? (
                                <p className="mt-1 text-xs text-slate-500">
                                    Accepted{" "}
                                    {formatDate(task.accepted_at)}
                                </p>
                            ) : null}

                            {task.started_at ? (
                                <p className="mt-1 text-xs text-slate-500">
                                    Started{" "}
                                    {formatDate(task.started_at)}
                                </p>
                            ) : null}

                            {task.completed_at ? (
                                <p className="mt-1 text-xs text-slate-500">
                                    Completed{" "}
                                    {formatDate(task.completed_at)}
                                </p>
                            ) : null}

                            {task.pickup_otp_verified_at ? (
                                <p className="mt-1 text-xs text-slate-500">
                                    OTP verified{" "}
                                    {formatDate(
                                        task.pickup_otp_verified_at,
                                    )}
                                </p>
                            ) : null}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
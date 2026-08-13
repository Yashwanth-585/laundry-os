import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

function formatStatus(status: string) {
    return status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter: string) =>
            letter.toUpperCase(),
        );
}

function getStatusClasses(status: string) {
    switch (status) {
        case "PLACED":
            return "bg-blue-50 text-blue-700";

        case "PICKED_UP":
        case "AT_FACILITY":
        case "IN_PROCESS":
            return "bg-amber-50 text-amber-700";

        case "READY":
        case "OUT_FOR_DELIVERY":
            return "bg-indigo-50 text-indigo-700";

        case "DELIVERED":
            return "bg-emerald-50 text-emerald-700";

        case "CANCELLED":
        case "RETURNED":
            return "bg-red-50 text-red-700";

        default:
            return "bg-slate-100 text-slate-700";
    }
}

export default async function OrdersPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data: orders, error } = await supabase
        .from("orders")
        .select(
            `
            id,
            status,
            pickup_date,
            pickup_slot,
            subtotal,
            delivery_fee,
            tax_amount,
            total_amount,
            created_at
            `,
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("ORDERS PAGE ERROR:", error);
    }

    return (
        <main className="mx-auto max-w-6xl px-4 py-8 pb-20 sm:px-6 lg:px-8">
            <header>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                    My orders
                </p>

                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                    Your laundry orders
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                    View your current and previous laundry orders,
                    pickup schedules, and order totals.
                </p>
            </header>

            {error ? (
                <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
                    We couldn't load your orders. Please try again.
                </div>
            ) : !orders?.length ? (
                <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="text-5xl">🧺</div>

                    <h2 className="mt-4 text-xl font-extrabold text-brand-navy">
                        No orders yet
                    </h2>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                        Your laundry orders will appear here after
                        you place your first order.
                    </p>

                    <Link
                        href="/services"
                        className="mt-6 inline-flex rounded-xl bg-brand-navy px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-blue-deep"
                    >
                        Browse services
                    </Link>
                </div>
            ) : (
                <div className="mt-8 space-y-4">
                    {orders.map((order) => {
                        const createdAt = new Date(
                            order.created_at,
                        );

                        const pickupDate = new Date(
                            `${order.pickup_date}T00:00:00`,
                        );

                        return (
                            <Link
                                key={order.id}
                                href={`/orders/${order.id}`}
                                className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-blue-deep/30 hover:shadow-md sm:p-6"
                            >
                                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h2 className="font-bold text-slate-900">
                                                Order #
                                                {order.id.slice(
                                                    0,
                                                    8,
                                                ).toUpperCase()}
                                            </h2>

                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(
                                                    order.status,
                                                )}`}
                                            >
                                                {formatStatus(
                                                    order.status,
                                                )}
                                            </span>
                                        </div>

                                        <p className="mt-2 text-xs text-slate-400">
                                            Placed{" "}
                                            {createdAt.toLocaleDateString(
                                                "en-IN",
                                                {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                },
                                            )}
                                        </p>
                                    </div>

                                    <div className="text-left sm:text-right">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Total
                                        </p>

                                        <p className="mt-1 text-xl font-extrabold text-brand-navy">
                                            ₹
                                            {Number(
                                                order.total_amount,
                                            ).toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                            Pickup date
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                            {pickupDate.toLocaleDateString(
                                                "en-IN",
                                                {
                                                    weekday: "short",
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                },
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                            Pickup slot
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                            {order.pickup_slot}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                                    <span className="text-sm font-semibold text-slate-500">
                                        View order details
                                    </span>

                                    <span className="text-lg font-bold text-brand-blue-deep">
                                        →
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
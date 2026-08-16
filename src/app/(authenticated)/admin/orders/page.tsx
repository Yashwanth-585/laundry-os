import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function formatStatus(status: string) {
    return status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusClasses(status: string) {
    switch (status) {
        case "PLACED":
            return "bg-blue-50 text-blue-700 border-blue-100";

        case "PICKUP_ASSIGNED":
        case "OUT_FOR_PICKUP":
            return "bg-amber-50 text-amber-700 border-amber-100";

        case "PICKED_UP":
        case "AT_FACILITY":
        case "IN_PROCESS":
            return "bg-orange-50 text-orange-700 border-orange-100";

        case "READY":
        case "OUT_FOR_DELIVERY":
            return "bg-indigo-50 text-indigo-700 border-indigo-100";

        case "DELIVERED":
            return "bg-emerald-50 text-emerald-700 border-emerald-100";

        case "CANCELLED":
        case "RETURNED":
            return "bg-red-50 text-red-700 border-red-100";

        case "ON_HOLD":
            return "bg-slate-100 text-slate-700 border-slate-200";

        default:
            return "bg-slate-100 text-slate-700 border-slate-200";
    }
}

export default async function AdminOrdersPage() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    const { data: profile, error: profileError } =
        await supabase
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

    const { data: orders, error: ordersError } =
        await supabase
            .from("orders")
            .select(
                `
                id,
                customer_id,
                status,
                pickup_date,
                pickup_slot,
                subtotal,
                delivery_fee,
                tax_amount,
                total_amount,
                payment_status,
                created_at,
                updated_at
                `,
            )
            .order("created_at", {
                ascending: false,
            });

    if (ordersError) {
        console.error(
            "ADMIN ORDERS PAGE ERROR:",
            ordersError,
        );
    }

    const allOrders = orders ?? [];

    const activeOrders = allOrders.filter(
        (order) =>
            ![
                "DELIVERED",
                "CANCELLED",
                "RETURNED",
            ].includes(order.status),
    );

    const paidOrders = allOrders.filter(
        (order) =>
            order.payment_status === "PAID",
    );

    const pendingPayments = allOrders.filter(
        (order) =>
            order.payment_status !== "PAID",
    );

    const revenue = paidOrders.reduce(
        (sum, order) =>
            sum + Number(order.total_amount ?? 0),
        0,
    );

    return (
        <main className="min-h-screen bg-sky-100/70">
            <div className="mx-auto max-w-[1500px] px-4 py-8 pb-20 sm:px-5 lg:px-6">

                {/* Header */}
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
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
                            Manage Orders
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                            View customer orders and monitor their
                            complete lifecycle.
                        </p>
                    </div>
                </header>

                {/* Stats */}
                <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Total orders
                        </p>

                        <p className="mt-3 text-3xl font-extrabold text-brand-navy">
                            {allOrders.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Active orders
                        </p>

                        <p className="mt-3 text-3xl font-extrabold text-brand-orange">
                            {activeOrders.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Pending payments
                        </p>

                        <p className="mt-3 text-3xl font-extrabold text-amber-600">
                            {pendingPayments.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Paid revenue
                        </p>

                        <p className="mt-3 text-3xl font-extrabold text-emerald-600">
                            ₹{revenue.toFixed(2)}
                        </p>
                    </div>
                </section>

                {/* Orders table */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

                    <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-bold text-slate-900">
                                All Orders
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Every order placed through LaundryOS.
                            </p>
                        </div>

                        <span className="text-xs font-semibold text-slate-400">
                            {allOrders.length} orders
                        </span>
                    </div>

                    {allOrders.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1050px] text-left">
                                <thead className="border-b border-slate-100 bg-slate-50/70">
                                    <tr>
                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Order
                                        </th>

                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Pickup
                                        </th>

                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Status
                                        </th>

                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Payment
                                        </th>

                                        <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Total
                                        </th>

                                        <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Action
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {allOrders.map((order) => (
                                        <tr
                                            key={order.id}
                                            className="transition hover:bg-slate-50"
                                        >
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-900">
                                                    #
                                                    {order.id
                                                        .slice(0, 8)
                                                        .toUpperCase()}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-400">
                                                    {new Date(
                                                        order.created_at,
                                                    ).toLocaleDateString(
                                                        "en-IN",
                                                        {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric",
                                                        },
                                                    )}
                                                </p>
                                            </td>

                                            <td className="px-6 py-4">
                                                <p className="text-sm font-semibold text-slate-700">
                                                    {new Date(
                                                        `${order.pickup_date}T00:00:00`,
                                                    ).toLocaleDateString(
                                                        "en-IN",
                                                        {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric",
                                                        },
                                                    )}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-400">
                                                    {order.pickup_slot}
                                                </p>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                                                        order.status,
                                                    )}`}
                                                >
                                                    {formatStatus(
                                                        order.status,
                                                    )}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${order.payment_status ===
                                                        "PAID"
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-amber-50 text-amber-700"
                                                        }`}
                                                >
                                                    {
                                                        order.payment_status
                                                    }
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <p className="text-sm font-extrabold text-brand-navy">
                                                    ₹
                                                    {Number(
                                                        order.total_amount,
                                                    ).toFixed(2)}
                                                </p>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/admin/orders/${order.id}`}
                                                    className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-brand-blue-deep transition hover:border-brand-blue-deep hover:bg-brand-blue-deep/5"
                                                >
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="px-6 py-12 text-center text-sm text-slate-500">
                            No orders yet.
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
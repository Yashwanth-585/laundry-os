import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import StaffOrderActions from "./StaffOrderActions";

function formatStatus(status: string) {
    return status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusClasses(status: string) {
    switch (status) {
        case "PICKED_UP":
            return "bg-orange-50 text-orange-700 border-orange-100";

        case "AT_FACILITY":
            return "bg-amber-50 text-amber-700 border-amber-100";

        case "IN_PROCESS":
            return "bg-indigo-50 text-indigo-700 border-indigo-100";

        case "READY":
            return "bg-emerald-50 text-emerald-700 border-emerald-100";

        default:
            return "bg-slate-100 text-slate-700 border-slate-200";
    }
}

// Facility workflow this dashboard is scoped to.
const FACILITY_STATUSES = [
    "PICKED_UP",
    "AT_FACILITY",
    "IN_PROCESS",
    "READY",
];

export default async function StaffDashboardPage() {
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
        .select("role, full_name")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || profile.role !== "vendor") {
        redirect("/dashboard");
    }

    // Single shared facility — every authorized staff member sees
    // every order in the facility workflow, not just their own.
    const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(
            `
            id,
            customer_id,
            status,
            pickup_date,
            pickup_slot,
            payment_status,
            total_amount,
            created_at
            `,
        )
        .in("status", FACILITY_STATUSES)
        .order("pickup_date", { ascending: true });

    if (ordersError) {
        console.error("STAFF ORDERS ERROR:", ordersError);
    }
    console.log("STAFF ORDERS:", orders);
    console.log("STAFF ORDERS ERROR:", ordersError);

    const allOrders = orders ?? [];
    const orderIds = allOrders.map((order) => order.id);

    // Customer names/phones — looked up separately rather than as a
    // nested select, since the FK relationship name isn't guaranteed.
    const customerIds = [
        ...new Set(allOrders.map((order) => order.customer_id)),
    ];

    const { data: customerProfiles } =
        customerIds.length > 0
            ? await supabase
                .from("profiles")
                .select("id, full_name, phone")
                .in("id", customerIds)
            : { data: [] as { id: string; full_name: string | null; phone: string | null }[] };

    const customerMap = new Map(
        (customerProfiles ?? []).map((customer) => [
            customer.id,
            customer,
        ]),
    );

    // Items/quantities per order.
    const { data: orderItems } =
        orderIds.length > 0
            ? await supabase
                .from("order_items")
                .select("order_id, article_name, category_name, quantity")
                .in("order_id", orderIds)
            : { data: [] as { order_id: string; article_name: string; category_name: string; quantity: number }[] };

    const itemsByOrder = new Map<
        string,
        { article_name: string; category_name: string; quantity: number }[]
    >();

    for (const item of orderItems ?? []) {
        const existing = itemsByOrder.get(item.order_id) ?? [];
        existing.push(item);
        itemsByOrder.set(item.order_id, existing);
    }

    const today = new Date().toISOString().split("T")[0];

    const ordersAtFacility = allOrders.filter(
        (order) => order.status === "AT_FACILITY",
    );

    const ordersInProcess = allOrders.filter(
        (order) => order.status === "IN_PROCESS",
    );

    const ordersReady = allOrders.filter(
        (order) => order.status === "READY",
    );

    const ordersToday = allOrders.filter(
        (order) => order.pickup_date === today,
    );

    return (
        <main className="min-h-screen bg-sky-100/70">
            <div className="mx-auto max-w-[1500px] px-4 py-8 pb-20 sm:px-5 lg:px-6">
                {/* Header */}
                <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                            Facility Operations
                        </p>

                        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                            Staff Dashboard
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                            Welcome back,{" "}
                            <span className="font-semibold text-slate-800">
                                {profile.full_name || user.email}
                            </span>
                        </p>
                    </div>
                </header>

                {/* Stats */}
                <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Orders at facility
                        </p>

                        <p className="mt-3 text-3xl font-extrabold text-amber-600">
                            {ordersAtFacility.length}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Waiting to start processing
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            In process
                        </p>

                        <p className="mt-3 text-3xl font-extrabold text-brand-navy">
                            {ordersInProcess.length}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Currently being cleaned
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Ready
                        </p>

                        <p className="mt-3 text-3xl font-extrabold text-emerald-600">
                            {ordersReady.length}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Ready for delivery handoff
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Today&apos;s orders
                        </p>

                        <p className="mt-3 text-3xl font-extrabold text-brand-orange">
                            {ordersToday.length}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Scheduled for today
                        </p>
                    </div>
                </section>

                {/* Orders requiring staff action */}
                <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-5">
                        <h2 className="font-bold text-slate-900">
                            Orders Requiring Staff Action
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Shared facility queue — picked-up orders move from
                            here through to Ready.
                        </p>
                    </div>

                    {allOrders.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {allOrders.map((order) => {
                                const customer = customerMap.get(
                                    order.customer_id,
                                );

                                const items =
                                    itemsByOrder.get(order.id) ?? [];

                                const totalPieces = items.reduce(
                                    (sum, item) => sum + item.quantity,
                                    0,
                                );

                                return (
                                    <div
                                        key={order.id}
                                        className="flex flex-col gap-5 px-6 py-5 sm:flex-row sm:items-start sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <p className="text-sm font-bold text-slate-900">
                                                    Order #
                                                    {order.id
                                                        .slice(0, 8)
                                                        .toUpperCase()}
                                                </p>

                                                <span
                                                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                                                        order.status,
                                                    )}`}
                                                >
                                                    {formatStatus(order.status)}
                                                </span>

                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${order.payment_status === "PAID"
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-amber-50 text-amber-700"
                                                        }`}
                                                >
                                                    {order.payment_status}
                                                </span>
                                            </div>

                                            <p className="mt-2 text-sm font-semibold text-slate-700">
                                                {customer?.full_name ||
                                                    "Customer"}
                                                {customer?.phone
                                                    ? ` · ${customer.phone}`
                                                    : ""}
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                Pickup{" "}
                                                {new Date(
                                                    `${order.pickup_date}T00:00:00`,
                                                ).toLocaleDateString(
                                                    "en-IN",
                                                    {
                                                        weekday: "short",
                                                        day: "numeric",
                                                        month: "short",
                                                    },
                                                )}{" "}
                                                · {order.pickup_slot}
                                            </p>

                                            {/* Items */}
                                            {items.length > 0 ? (
                                                <div className="mt-3 max-w-md rounded-lg bg-slate-50 px-3 py-2.5">
                                                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                                        Items ·{" "}
                                                        {totalPieces}{" "}
                                                        {totalPieces === 1
                                                            ? "piece"
                                                            : "pieces"}
                                                    </p>

                                                    <ul className="mt-1.5 space-y-0.5">
                                                        {items.map(
                                                            (item, index) => (
                                                                <li
                                                                    key={`${order.id}-${index}`}
                                                                    className="flex items-center justify-between text-xs text-slate-600"
                                                                >
                                                                    <span>
                                                                        {
                                                                            item.article_name
                                                                        }
                                                                    </span>

                                                                    <span className="font-semibold text-slate-800">
                                                                        ×{" "}
                                                                        {
                                                                            item.quantity
                                                                        }
                                                                    </span>
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                </div>
                                            ) : (
                                                <p className="mt-3 text-xs text-slate-400">
                                                    No items recorded.
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end sm:gap-3">
                                            <p className="text-sm font-extrabold text-brand-navy">
                                                ₹
                                                {Number(
                                                    order.total_amount,
                                                ).toFixed(2)}
                                            </p>

                                            <StaffOrderActions
                                                orderId={order.id}
                                                status={order.status}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="px-6 py-12 text-center">
                            <p className="text-sm font-semibold text-slate-700">
                                No orders in the facility queue
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Orders will appear here once a rider marks
                                them as picked up.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
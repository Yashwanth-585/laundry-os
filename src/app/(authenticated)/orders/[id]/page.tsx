import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type OrderPageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function OrderDetailPage({
    params,
}: OrderPageProps) {
    const { id } = await params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        notFound();
    }

    const { data: order, error: orderError } =
        await supabase
            .from("orders")
            .select(
                `
                id,
                customer_id,
                status,
                pickup_date,
                pickup_slot,
                notes,
                subtotal,
                delivery_fee,
                tax_amount,
                total_amount,
                created_at,
                addresses (
                    label,
                    recipient_name,
                    phone,
                    address_line1,
                    address_line2,
                    landmark,
                    city,
                    state,
                    pincode
                ),
                order_items (
                    id,
                    article_name,
                    category_name,
                    unit_price,
                    quantity,
                    total_price
                ),
                order_status_history (
                    id,
                    status,
                    notes,
                    created_at
                )
                `,
            )
            .eq("id", id)
            .eq("customer_id", user.id)
            .single();

    if (orderError || !order) {
        console.error("ORDER DETAIL ERROR:", orderError);
        notFound();
    }

    const address = Array.isArray(order.addresses)
        ? order.addresses[0]
        : order.addresses;

    const items = Array.isArray(order.order_items)
        ? order.order_items
        : [];

    const history = Array.isArray(order.order_status_history)
        ? [...order.order_status_history].sort(
            (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
        )
        : [];

    const orderDate = new Date(order.created_at);

    const formattedOrderDate =
        orderDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });

    const formattedPickupDate =
        new Date(`${order.pickup_date}T00:00:00`).toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
            },
        );

    const statusLabel = order.status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter: string) =>
            letter.toUpperCase(),
        );

    return (
        <main className="mx-auto max-w-6xl px-4 py-8 pb-20 sm:px-6 lg:px-8">
            <Link
                href="/services"
                className="text-sm font-semibold text-brand-blue-deep hover:underline"
            >
                ← Continue shopping
            </Link>

            {/* HEADER */}
            <header className="mt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                            Order confirmed
                        </p>

                        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                            Your laundry order
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Order placed on {formattedOrderDate}
                        </p>
                    </div>

                    <div className="inline-flex w-fit items-center rounded-full bg-brand-blue-deep/10 px-4 py-2 text-sm font-bold text-brand-blue-deep">
                        {statusLabel}
                    </div>
                </div>
            </header>

            {/* ORDER CONTENT */}
            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="space-y-6">
                    {/* ORDER ID */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                            Order number
                        </p>

                        <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-800">
                            {order.id}
                        </p>
                    </section>

                    {/* PICKUP */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                            Pickup schedule
                        </p>

                        <h2 className="mt-1 text-xl font-extrabold text-brand-navy">
                            When we'll collect your laundry
                        </h2>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl bg-slate-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Date
                                </p>

                                <p className="mt-1 text-sm font-bold text-slate-900">
                                    {formattedPickupDate}
                                </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Time
                                </p>

                                <p className="mt-1 text-sm font-bold text-slate-900">
                                    {order.pickup_slot}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* ADDRESS */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                            Pickup address
                        </p>

                        <h2 className="mt-1 text-xl font-extrabold text-brand-navy">
                            {address?.label ?? "Pickup address"}
                        </h2>

                        {address && (
                            <div className="mt-4 text-sm leading-6 text-slate-600">
                                <p className="font-semibold text-slate-800">
                                    {address.recipient_name} ·{" "}
                                    {address.phone}
                                </p>

                                <p className="mt-2">
                                    {address.address_line1}

                                    {address.address_line2
                                        ? `, ${address.address_line2}`
                                        : ""}

                                    {address.landmark
                                        ? `, Near ${address.landmark}`
                                        : ""}

                                    <br />

                                    {address.city},{" "}
                                    {address.state} -{" "}
                                    {address.pincode}
                                </p>
                            </div>
                        )}
                    </section>

                    {/* ITEMS */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                                Order items
                            </p>

                            <h2 className="mt-1 text-xl font-extrabold text-brand-navy">
                                Laundry summary
                            </h2>
                        </div>

                        <div className="mt-5 divide-y divide-slate-100">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                                >
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900">
                                            {item.article_name}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                            {item.category_name} ·{" "}
                                            {item.quantity} × ₹
                                            {Number(
                                                item.unit_price,
                                            ).toFixed(2)}
                                        </p>
                                    </div>

                                    <p className="shrink-0 font-bold text-slate-900">
                                        ₹
                                        {Number(
                                            item.total_price,
                                        ).toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* STATUS HISTORY */}
                    {history.length > 0 && (
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                                Order progress
                            </p>

                            <h2 className="mt-1 text-xl font-extrabold text-brand-navy">
                                Status history
                            </h2>

                            <div className="mt-5 space-y-5">
                                {history.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex gap-3"
                                    >
                                        <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-brand-blue-deep" />

                                        <div>
                                            <p className="text-sm font-bold text-slate-900">
                                                {entry.status
                                                    .replaceAll(
                                                        "_",
                                                        " ",
                                                    )
                                                    .toLowerCase()
                                                    .replace(
                                                        /\b\w/g,
                                                        (
                                                            letter: string,
                                                        ) =>
                                                            letter.toUpperCase(),
                                                    )}
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500">
                                                {new Date(
                                                    entry.created_at,
                                                ).toLocaleString(
                                                    "en-IN",
                                                    {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                    },
                                                )}
                                            </p>

                                            {entry.notes && (
                                                <p className="mt-1 text-sm text-slate-600">
                                                    {entry.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* SUMMARY */}
                <aside className="lg:sticky lg:top-24 lg:self-start">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
                        <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                            Payment summary
                        </p>

                        <h2 className="mt-2 text-xl font-extrabold text-brand-navy">
                            Order total
                        </h2>

                        <div className="mt-6 space-y-3 border-b border-slate-100 pb-5">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">
                                    Subtotal
                                </span>

                                <span className="font-semibold text-slate-800">
                                    ₹
                                    {Number(
                                        order.subtotal,
                                    ).toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">
                                    Pickup & delivery
                                </span>

                                <span className="font-semibold text-slate-800">
                                    ₹
                                    {Number(
                                        order.delivery_fee,
                                    ).toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">
                                    Tax
                                </span>

                                <span className="font-semibold text-slate-800">
                                    ₹
                                    {Number(
                                        order.tax_amount,
                                    ).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between">
                            <span className="font-bold text-slate-900">
                                Total
                            </span>

                            <span className="text-2xl font-extrabold text-brand-navy">
                                ₹
                                {Number(
                                    order.total_amount,
                                ).toFixed(2)}
                            </span>
                        </div>

                        {order.notes && (
                            <div className="mt-6 rounded-xl bg-slate-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Special instructions
                                </p>

                                <p className="mt-2 text-sm leading-5 text-slate-600">
                                    {order.notes}
                                </p>
                            </div>
                        )}

                        <Link
                            href="/services"
                            className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand-navy px-5 py-3.5 text-sm font-bold text-white transition hover:bg-brand-blue-deep"
                        >
                            Place another order
                        </Link>

                        <Link
                            href="/orders"
                            className="mt-3 flex w-full items-center justify-center rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                            View my orders
                        </Link>
                    </div>
                </aside>
            </div>
        </main>
    );
}
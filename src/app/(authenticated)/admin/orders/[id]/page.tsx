import PickupAssignment from "./PickupAssignment";
import DeliveryAssignment from "./DeliveryAssignment";
import OrderStatusControl from "./OrderStatusControl";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type OrderPageProps = {
    params: Promise<{
        id: string;
    }>;
};

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

export default async function AdminOrderDetailPage({
    params,
}: OrderPageProps) {
    const { id } = await params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== "admin") {
        redirect("/dashboard");
    }

    const { data: order, error } = await supabase
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
            payment_status,
            created_at,
            updated_at,
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
                created_at,
                changed_by
            )
            `,
        )
        .eq("id", id)
        .single();

    if (error || !order) {
        console.error("ADMIN ORDER DETAIL ERROR:", error);
        notFound();
    }

    const { data: customer } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("id", order.customer_id)
        .maybeSingle();

    /*
     * PICKUP DELIVERY TASK
     *
     * Fetch the pickup task separately so the existing order query
     * does not depend on a delivery_tasks relationship.
     */
    const { data: pickupTask, error: pickupTaskError } =
        await supabase
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
                pickup_otp,
                pickup_otp_verified_at,
                delivery_otp,
                delivery_otp_verified_at,
                actual_item_count,
                actual_weight,
                notes,
                photo_urls,
                created_at,
                updated_at
                `,
            )
            .eq("order_id", id)
            .eq("task_type", "PICKUP")
            .maybeSingle();

    if (pickupTaskError) {
        console.error(
            "ADMIN PICKUP TASK ERROR:",
            pickupTaskError,
        );
    }

    /*
 * FINAL DELIVERY TASK
 */
    const { data: deliveryTask, error: deliveryTaskError } =
        await supabase
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
            delivery_otp,
            delivery_otp_verified_at,
            notes,
            photo_urls,
            created_at,
            updated_at
            `,
            )
            .eq("order_id", id)
            .eq("task_type", "DROP")
            .maybeSingle();

    if (deliveryTaskError) {
        console.error(
            "ADMIN DELIVERY TASK ERROR:",
            deliveryTaskError,
        );
    }

    /*
     * DELIVERY PARTNERS
     *
     * Only active + approved partners should be available
     * for admin assignment.
     */
    const { data: deliveryPartners, error: partnersError } =
        await supabase
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
                is_approved
                `,
            )
            .eq("is_active", true)
            .eq("is_approved", true)
            .order("created_at", {
                ascending: true,
            });

    if (partnersError) {
        console.error(
            "ADMIN DELIVERY PARTNERS ERROR:",
            partnersError,
        );
    }

    const availablePartners = deliveryPartners ?? [];

    /*
     * Get the names of the delivery partners from profiles.
     */
    const partnerProfileIds = availablePartners.map(
        (partner) => partner.profile_id,
    );

    const { data: partnerProfiles } =
        partnerProfileIds.length > 0
            ? await supabase
                .from("profiles")
                .select("id, full_name")
                .in("id", partnerProfileIds)
            : { data: [] };

    const profileNameMap = new Map(
        (partnerProfiles ?? []).map((profile) => [
            profile.id,
            profile.full_name,
        ]),
    );

    const partnersForAssignment = availablePartners.map(
        (partner) => ({
            id: partner.id,
            profile_id: partner.profile_id,
            full_name:
                profileNameMap.get(partner.profile_id) ?? null,
            phone: partner.phone,
        }),
    );

    const address = Array.isArray(order.addresses)
        ? order.addresses[0]
        : order.addresses;

    const { data: itemReports } = await supabase
        .from("delivery_task_item_reports")
        .select(
            `
            order_item_id,
            task_type,
            condition,
            note,
            photo_urls,
            delivery_tasks!inner ( order_id )
            `,
        )
        .eq("delivery_tasks.order_id", id);

    const reportsByItem = new Map<
        string,
        { task_type: string; condition: string; note: string | null; photo_urls: string[] }[]
    >();

    for (const report of itemReports ?? []) {
        const existing = reportsByItem.get(report.order_item_id) ?? [];
        existing.push({
            task_type: report.task_type,
            condition: report.condition,
            note: report.note,
            photo_urls: report.photo_urls ?? [],
        });
        reportsByItem.set(report.order_item_id, existing);
    }

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

    return (
        <main className="min-h-screen bg-sky-100/70">
            <div className="mx-auto max-w-[1400px] px-4 py-8 pb-20 sm:px-5 lg:px-6">

                {/* HEADER */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <Link
                            href="/admin/orders"
                            className="text-sm font-semibold text-brand-blue-deep hover:text-brand-navy"
                        >
                            ← Back to Orders
                        </Link>

                        <p className="mt-5 text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                            Administration
                        </p>

                        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy">
                            Order #{order.id.slice(0, 8).toUpperCase()}
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Created{" "}
                            {new Date(order.created_at).toLocaleString(
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
                    </div>

                    <span
                        className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-bold ${getStatusClasses(
                            order.status,
                        )}`}
                    >
                        {formatStatus(order.status)}
                    </span>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">

                    {/* LEFT SIDE */}
                    <div className="space-y-6">

                        {/* CUSTOMER */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                                Customer
                            </p>

                            <h2 className="mt-2 text-xl font-extrabold text-brand-navy">
                                {customer?.full_name || "Customer"}
                            </h2>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                        Phone
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-slate-800">
                                        {customer?.phone ||
                                            address?.phone ||
                                            "—"}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                        Customer ID
                                    </p>

                                    <p className="mt-1 break-all font-mono text-xs text-slate-600">
                                        {order.customer_id}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* PICKUP */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                                Pickup schedule
                            </p>

                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                        Date
                                    </p>

                                    <p className="mt-1 font-bold text-slate-900">
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

                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                        Time slot
                                    </p>

                                    <p className="mt-1 font-bold text-slate-900">
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

                            <h2 className="mt-2 text-xl font-extrabold text-brand-navy">
                                {address?.label || "Pickup Address"}
                            </h2>

                            {address ? (
                                <div className="mt-4 text-sm leading-6 text-slate-600">
                                    <p className="font-bold text-slate-900">
                                        {address.recipient_name}
                                    </p>

                                    <p>
                                        {address.address_line1}
                                        {address.address_line2
                                            ? `, ${address.address_line2}`
                                            : ""}
                                        {address.landmark
                                            ? `, Near ${address.landmark}`
                                            : ""}
                                    </p>

                                    <p>
                                        {address.city}, {address.state} -{" "}
                                        {address.pincode}
                                    </p>

                                    <p className="mt-2 font-semibold text-slate-800">
                                        {address.phone}
                                    </p>
                                </div>
                            ) : (
                                <p className="mt-4 text-sm text-slate-500">
                                    No address information available.
                                </p>
                            )}
                        </section>

                        {/* ITEMS */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                                Order items
                            </p>

                            <div className="mt-5 divide-y divide-slate-100">
                                {items.length > 0 ? (
                                    items.map((item) => {
                                        const reports = reportsByItem.get(item.id) ?? [];

                                        return (
                                            <div
                                                key={item.id}
                                                className="py-4 first:pt-0 last:pb-0"
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    <div>
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

                                                    <p className="font-bold text-slate-900">
                                                        ₹
                                                        {Number(
                                                            item.total_price,
                                                        ).toFixed(2)}
                                                    </p>
                                                </div>

                                                {reports.length > 0 && (
                                                    <div className="mt-2 space-y-1.5">
                                                        {reports.map((report, index) => (
                                                            <div
                                                                key={index}
                                                                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                                                                    report.condition === "GOOD"
                                                                        ? "bg-emerald-50 text-emerald-700"
                                                                        : report.condition === "DAMAGED"
                                                                          ? "bg-amber-50 text-amber-700"
                                                                          : "bg-red-50 text-red-700"
                                                                }`}
                                                            >
                                                                {report.task_type === "PICKUP"
                                                                    ? "At pickup"
                                                                    : "At delivery"}
                                                                : {report.condition}
                                                                {report.note ? ` — ${report.note}` : ""}
                                                                {report.photo_urls.length > 0 && (
                                                                    <span className="ml-1 font-normal">
                                                                        ({report.photo_urls.length} photo
                                                                        {report.photo_urls.length === 1 ? "" : "s"})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="py-4 text-sm text-slate-500">
                                        No order items found.
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* HISTORY */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                                Order progress
                            </p>

                            <h2 className="mt-1 text-xl font-extrabold text-brand-navy">
                                Status history
                            </h2>

                            {history.length > 0 ? (
                                <div className="relative mt-6">
                                    <div className="absolute bottom-1 left-[5px] top-1 border-l border-dashed border-slate-200" />

                                    <div className="space-y-6">
                                        {history.map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="relative flex gap-4"
                                            >
                                                <div className="relative z-10 mt-1 size-2.5 shrink-0 rounded-full bg-brand-blue-deep ring-4 ring-white" />

                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">
                                                        {formatStatus(
                                                            entry.status,
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
                                </div>
                            ) : (
                                <p className="mt-5 text-sm text-slate-500">
                                    No status history recorded.
                                </p>
                            )}
                        </section>
                    </div>

                    {/* RIGHT SIDE */}
                    <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">

                        {/* PICKUP ASSIGNMENT */}
                        <PickupAssignment
                            orderId={order.id}
                            task={pickupTask}
                            deliveryPartners={partnersForAssignment}
                        />

                        {/* FINAL DELIVERY ASSIGNMENT */}
                        {order.status === "READY" ||
                            order.status === "OUT_FOR_DELIVERY" ||
                            order.status === "DELIVERED" ? (
                            <DeliveryAssignment
                                orderId={order.id}
                                task={deliveryTask}
                                deliveryPartners={partnersForAssignment}
                            />
                        ) : null}

                        {/* ORDER STATUS CONTROL */}
                        <OrderStatusControl
                            orderId={order.id}
                            currentStatus={
                                order.status as Parameters<
                                    typeof OrderStatusControl
                                >[0]["currentStatus"]
                            }
                        />

                        {/* STATUS */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                                Order status
                            </p>

                            <div className="mt-4">
                                <span
                                    className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold ${getStatusClasses(
                                        order.status,
                                    )}`}
                                >
                                    {formatStatus(order.status)}
                                </span>
                            </div>

                            <p className="mt-4 text-xs leading-5 text-slate-500">
                                Status changes are handled through the operational
                                order-management flow.
                            </p>
                        </section>

                        {/* PAYMENT */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                                Payment
                            </p>

                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-sm text-slate-500">
                                    Payment status
                                </span>

                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-bold ${order.payment_status === "PAID"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-amber-50 text-amber-700"
                                        }`}
                                >
                                    {order.payment_status}
                                </span>
                            </div>

                            <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">
                                        Subtotal
                                    </span>

                                    <span className="font-semibold">
                                        ₹
                                        {Number(
                                            order.subtotal,
                                        ).toFixed(2)}
                                    </span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">
                                        Delivery
                                    </span>

                                    <span className="font-semibold">
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

                                    <span className="font-semibold">
                                        ₹
                                        {Number(
                                            order.tax_amount,
                                        ).toFixed(2)}
                                    </span>
                                </div>

                                <div className="flex justify-between border-t border-slate-100 pt-4">
                                    <span className="font-bold">
                                        Total
                                    </span>

                                    <span className="text-xl font-extrabold text-brand-navy">
                                        ₹
                                        {Number(
                                            order.total_amount,
                                        ).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </section>

                        {/* NOTES */}
                        {order.notes && (
                            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                                    Special instructions
                                </p>

                                <p className="mt-3 text-sm leading-6 text-slate-600">
                                    {order.notes}
                                </p>
                            </section>
                        )}
                    </aside>
                </div>
            </div>
        </main>
    );
}
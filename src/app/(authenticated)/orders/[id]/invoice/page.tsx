import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import InvoicePrintButton from "@/components/orders/InvoicePrintButton";

type InvoicePageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function InvoicePage({ params }: InvoicePageProps) {
    const { id } = await params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        notFound();
    }

    const { data: order, error } = await supabase
        .from("orders")
        .select(
            `
            id,
            status,
            payment_status,
            payment_method,
            credits_applied,
            subtotal,
            delivery_fee,
            tax_amount,
            total_amount,
            created_at,
            addresses (
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
            )
            `,
        )
        .eq("id", id)
        .eq("customer_id", user.id)
        .single();

    if (error || !order) {
        notFound();
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

    const isPaid =
        order.payment_status === "PAID" ||
        (order.payment_method === "COD" && order.status === "DELIVERED");

    if (!isPaid) {
        return (
            <main className="mx-auto max-w-xl px-4 py-16 text-center">
                <p className="text-lg font-bold text-slate-900">
                    Invoice not available yet
                </p>
                <p className="mt-2 text-sm text-slate-500">
                    The invoice will be available once payment for this order is
                    complete.
                </p>
            </main>
        );
    }

    const address = Array.isArray(order.addresses) ? order.addresses[0] : order.addresses;
    const items = Array.isArray(order.order_items) ? order.order_items : [];

    return (
        <div className="mx-auto max-w-3xl px-4 py-10 print:p-0">
            <div className="mb-6 flex justify-end print:hidden">
                <InvoicePrintButton />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm print:rounded-none print:border-0 print:shadow-none">
                <div className="flex items-start justify-between border-b border-slate-100 pb-6">
                    <div>
                        <p className="text-2xl font-extrabold tracking-tight text-brand-navy">
                            Washland
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Laundry &amp; Dry Cleaning</p>
                    </div>

                    <div className="text-right">
                        <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                            Invoice
                        </p>
                        <p className="mt-1 font-mono text-sm text-slate-700">
                            #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            {new Date(order.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            })}
                        </p>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                            Billed to
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                            {address?.recipient_name ?? profile?.full_name ?? "Customer"}
                        </p>
                        {address && (
                            <p className="mt-1 text-sm leading-5 text-slate-500">
                                {address.address_line1}
                                {address.address_line2 ? `, ${address.address_line2}` : ""}
                                {address.landmark ? `, Near ${address.landmark}` : ""}
                                <br />
                                {address.city}, {address.state} - {address.pincode}
                            </p>
                        )}
                        <p className="mt-1 text-sm text-slate-500">{address?.phone}</p>
                    </div>

                    <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                            Payment
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                            {order.payment_method === "COD" ? "Cash on Delivery" : "Paid Online"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-emerald-600">Paid</p>
                    </div>
                </div>

                <table className="mt-8 w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                            <th className="pb-2">Item</th>
                            <th className="pb-2">Category</th>
                            <th className="pb-2 text-right">Qty</th>
                            <th className="pb-2 text-right">Rate</th>
                            <th className="pb-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.id} className="border-b border-slate-100">
                                <td className="py-2.5 font-semibold text-slate-800">
                                    {item.article_name}
                                </td>
                                <td className="py-2.5 text-slate-500">{item.category_name}</td>
                                <td className="py-2.5 text-right text-slate-700">
                                    {item.quantity}
                                </td>
                                <td className="py-2.5 text-right text-slate-700">
                                    ₹{Number(item.unit_price).toFixed(2)}
                                </td>
                                <td className="py-2.5 text-right font-semibold text-slate-900">
                                    ₹{Number(item.total_price).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-6 flex justify-end">
                    <div className="w-64 space-y-2 text-sm">
                        <div className="flex justify-between text-slate-600">
                            <span>Subtotal</span>
                            <span>₹{Number(order.subtotal).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                            <span>Delivery fee</span>
                            <span>₹{Number(order.delivery_fee).toFixed(2)}</span>
                        </div>
                        {Number(order.tax_amount) > 0 && (
                            <div className="flex justify-between text-slate-600">
                                <span>Tax</span>
                                <span>₹{Number(order.tax_amount).toFixed(2)}</span>
                            </div>
                        )}
                        {Number(order.credits_applied) > 0 && (
                            <div className="flex justify-between text-emerald-600">
                                <span>Laundry Coins applied</span>
                                <span>-₹{Number(order.credits_applied).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold text-slate-900">
                            <span>Total paid</span>
                            <span>₹{Number(order.total_amount).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <p className="mt-10 text-center text-xs text-slate-400">
                    Thank you for choosing Washland. This is a computer-generated invoice.
                </p>
            </div>
        </div>
    );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import CheckoutForm from "./CheckoutForm";

export default async function CheckoutPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: addresses, error } = await supabase
        .from("addresses")
        .select(
            "id, label, recipient_name, phone, address_line1, address_line2, landmark, city, state, pincode, is_default",
        )
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {
        console.error("CHECKOUT ADDRESS ERROR:", error);
    }

    return (
        <main className="mx-auto max-w-6xl px-4 py-8 pb-20 sm:px-6 lg:px-8">
            <Link
                href="/cart"
                className="text-sm font-semibold text-brand-blue-deep hover:underline"
            >
                ← Back to cart
            </Link>

            <header className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                    Checkout
                </p>

                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                    Schedule your pickup
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                    Choose where and when you'd like us to collect your
                    laundry.
                </p>
            </header>

            {error ? (
                <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    We couldn't load your saved addresses. Please try again.
                </div>
            ) : (
                <CheckoutForm
                    addresses={addresses ?? []}
                />
            )}
        </main>
    );
}
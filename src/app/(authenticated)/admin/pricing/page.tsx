import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PricingManager from "@/components/admin/PricingManager";

export default async function AdminPricingPage() {
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

    if (profileError || !profile || profile.role !== "admin") {
        redirect("/dashboard");
    }

    const { data: catalogItems, error } = await supabase
        .from("catalog_items")
        .select("id, category, name, price, is_active")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

    if (error) {
        console.error("ADMIN PRICING ERROR:", error);
    }

    return (
        <main className="min-h-screen bg-sky-100/70">
            <div className="mx-auto max-w-[1400px] px-4 py-8 pb-20 sm:px-5 lg:px-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                            Administration
                        </p>

                        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                            Services & Pricing
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                            Manage laundry services and their prices.
                            Changes here will be used for future orders.
                        </p>
                    </div>

                    <a
                        href="/admin"
                        className="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-brand-blue-deep/30 hover:text-brand-blue-deep"
                    >
                        ← Back to Dashboard
                    </a>
                </header>

                <section className="mt-8">
                    <PricingManager items={catalogItems ?? []} />
                </section>
            </div>
        </main>
    );
}
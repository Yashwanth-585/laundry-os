import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

const serviceIcons: Record<string, string> = {
    "Wash & Fold": "🧺",
    "Wash & Iron": "👕",
    "Steam Iron": "♨️",
    "Dry Cleaning": "✨",
    "Premium / Delicates": "💎",
    Household: "🏠",
    "Shoe & Bag Cleaning": "👟",
};

export default async function ServicesPage() {
    console.log("🔥 NEW SERVICES PAGE IS RUNNING");
    const supabase = await createClient();

    const { data: services, error } = await supabase
        .from("services")
        .select("id, name, description")
        .eq("is_active", true)
        .neq("name", "Add-ons")
        .order("created_at", { ascending: true });
    console.log("SERVICES:", services);
    console.log("SERVICE ERROR:", error);

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <header className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                    Our Services
                </p>

                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                    Professional laundry care
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                    Choose the services you need, select your items, and build your
                    laundry order in just a few steps.
                </p>
            </header>

            {error ? (
                <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    We couldn't load our services. Please try again later.
                </div>
            ) : (
                <section
                    className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                    aria-label="Laundry services"
                >
                    {services?.map((service) => (
                        <Link
                            key={service.id}
                            href={`/services/${service.id}`}
                            className="group flex min-h-60 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-blue-deep hover:shadow-md"
                        >
                            <div className="flex items-start justify-between">
                                <span className="flex size-12 items-center justify-center rounded-xl bg-brand-navy/10 text-2xl transition-colors group-hover:bg-brand-navy">
                                    {serviceIcons[service.name] ?? "🧼"}
                                </span>

                                <span className="text-xl text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-blue-deep">
                                    →
                                </span>
                            </div>

                            <div className="mt-6">
                                <h2 className="text-lg font-bold text-slate-900">
                                    {service.name}
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {service.description}
                                </p>
                            </div>

                            <div className="mt-auto pt-6 text-sm font-semibold text-brand-blue-deep">
                                View items
                            </div>
                        </Link>
                    ))}
                </section>
            )}
        </main>
    );
}
import Image from "next/image";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

const serviceImages: Record<string, string> = {
    "Wash & Fold": "/services/wash-fold-services.jpg",
    "Wash & Iron": "/services/wash-iron-services.jpg",
    "Steam Iron": "/services/steam-iron-services.jpg",
    "Dry Cleaning": "/services/dry-cleaning-services.jpg",
    "Premium / Delicates": "/services/premium-delicates-services.jpg",
    Household: "/services/household-services.jpg",
    "Shoe & Bag Cleaning": "/services/shoe-bag-cleaning-services.jpg",
};

export default async function ServicesPage() {
    const supabase = await createClient();

    const { data: services, error } = await supabase
        .from("services")
        .select("id, name, description")
        .eq("is_active", true)
        .neq("name", "Add-ons")
        .order("created_at", { ascending: true });

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Page Header */}
            <header className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                    Our Services
                </p>

                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                    Professional laundry care
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                    Choose the services you need, select your items, and build
                    your laundry order in just a few steps.
                </p>
            </header>

            {/* Error State */}
            {error ? (
                <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    We couldn't load our services. Please try again later.
                </div>
            ) : (
                <section
                    className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                    aria-label="Laundry services"
                >
                    {services?.map((service) => {
                        const image =
                            serviceImages[service.name] ??
                            "/services/wash-fold-services.jpg";

                        return (
                            <Link
                                key={service.id}
                                href={`/services/${service.id}`}
                                className="group relative isolate flex min-h-[320px] overflow-hidden rounded-2xl bg-brand-navy shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                            >
                                {/* Background Image */}
                                <Image
                                    src={image}
                                    alt={service.name}
                                    fill
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                />

                                {/* Dark Overlay */}
                                <div className="absolute inset-0 -z-0 bg-gradient-to-t from-brand-navy/70 via-brand-navy/20 to-black/5 transition-opacity duration-300 group-hover:from-brand-navy/60 group-hover:via-brand-navy/15" />

                                {/* Subtle overall overlay for readability */}
                                <div className="absolute inset-0 -z-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/0" />

                                {/* Content */}
                                <div className="relative z-10 mt-auto w-full p-6">
                                    <div className="flex items-end justify-between gap-4">
                                        <div className="min-w-0">
                                            <h2 className="text-xl font-bold text-white sm:text-2xl">
                                                {service.name}
                                            </h2>

                                            <p className="mt-2 max-w-[90%] text-sm leading-5 text-white/80">
                                                {service.description}
                                            </p>
                                        </div>

                                        {/* Arrow */}
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-lg text-white backdrop-blur-sm transition-all duration-300 group-hover:translate-x-1 group-hover:border-white/50 group-hover:bg-white/20">
                                            →
                                        </span>
                                    </div>

                                    <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-white/70 transition-colors group-hover:text-white">
                                        View items
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </section>
            )}
        </main>
    );
}
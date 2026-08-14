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
        <main className="relative overflow-hidden bg-sky-100/70">
            {/* Ambient background, matching the homepage hero */}
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -left-24 -top-24 size-[24rem] rounded-full bg-brand-blue-deep/10 blur-3xl" />
                <div className="absolute -right-24 top-10 size-[20rem] rounded-full bg-brand-orange/10 blur-3xl" />
                <div className="absolute inset-0 opacity-[0.3] bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.08)_1px,transparent_0)] bg-[size:26px_26px]" />
            </div>

            <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-5 lg:px-6 lg:py-14">
                {/* Page Header */}
                <header className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-dashed border-brand-blue-deep/40 bg-white py-1 pl-1.5 pr-3.5 text-xs font-bold uppercase tracking-wider text-brand-blue-deep shadow-sm">
                        <span className="flex size-4 items-center justify-center rounded-full bg-brand-blue-deep/10">
                            <span className="size-1.5 rounded-full bg-brand-orange" />
                        </span>
                        Our Services
                    </div>

                    <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-brand-navy sm:text-5xl sm:leading-[1.1]">
                        Professional laundry care
                    </h1>

                    <p className="mt-4 text-base leading-7 text-slate-600">
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
                        className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4"
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
                                    className="group relative isolate flex min-h-[220px] overflow-hidden rounded-2xl bg-brand-navy shadow-sm ring-1 ring-transparent transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-orange/15 hover:ring-brand-orange/50"
                                >
                                    {/* Background Image */}
                                    <Image
                                        src={image}
                                        alt={service.name}
                                        fill
                                        sizes="(max-width: 640px) 50vw, 25vw"
                                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                    />

                                    {/* Standardized legibility scrim */}
                                    <div className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />

                                    {/* Garment-tag corner accent */}
                                    <div className="absolute left-3 top-3 z-10 hidden items-center gap-1 rounded-full border border-dashed border-white/40 bg-white/10 py-0.5 pl-1 pr-2 backdrop-blur-sm sm:flex">
                                        <span className="flex size-3 items-center justify-center rounded-full bg-white/90">
                                            <span className="size-1 rounded-full bg-brand-orange" />
                                        </span>
                                    </div>

                                    {/* Bottom accent line, appears on hover */}
                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-0.5 origin-left scale-x-0 bg-brand-orange transition-transform duration-300 group-hover:scale-x-100" />

                                    {/* Content */}
                                    <div className="relative z-10 mt-auto w-full p-4">
                                        <h2 className="text-sm font-bold leading-tight text-white">
                                            {service.name}
                                        </h2>

                                        <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-white/75">
                                            {service.description}
                                        </p>

                                        <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/80 transition-colors group-hover:text-brand-orange">
                                            View items
                                            <span className="transition-transform duration-300 group-hover:translate-x-1">
                                                →
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </section>
                )}
            </div>
        </main>
    );
}
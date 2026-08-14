import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import ServiceCatalog from "./ServiceCatalog";

type ServicePageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function ServicePage({
    params,
}: ServicePageProps) {
    const { id } = await params;

    const supabase = await createClient();

    const { data: service, error: serviceError } = await supabase
        .from("services")
        .select("id, name, description")
        .eq("id", id)
        .eq("is_active", true)
        .single();

    if (serviceError || !service) {
        notFound();
    }

    const { data: serviceItems, error: itemsError } = await supabase
        .from("service_catalog_items")
        .select(`
            id,
            price,
            catalog_item:catalog_items (
                id,
                name,
                category
            )
        `)
        .eq("service_id", id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

    if (itemsError) {
        console.error("SERVICE ITEMS ERROR:", itemsError);
    }

    const items = (serviceItems ?? []).flatMap((item) => {
        const catalogItem = Array.isArray(item.catalog_item)
            ? item.catalog_item[0]
            : item.catalog_item;

        if (!catalogItem) {
            return [];
        }

        return [
            {
                id: item.id,
                catalogItemId: catalogItem.id,
                name: catalogItem.name,
                category: catalogItem.category,
                price: Number(item.price),
            },
        ];
    });

    return (
        <div className="min-h-screen bg-sky-100/70">
            <main className="mx-auto max-w-[1400px] px-4 py-8 pb-32 sm:px-5 lg:px-6">
                <Link
                    href="/services"
                    className="group inline-flex items-center gap-2 text-sm font-semibold text-brand-blue-deep transition hover:text-brand-navy"
                >
                    <span className="transition-transform group-hover:-translate-x-0.5">
                        ←
                    </span>{" "}
                    Back to services
                </Link>

                <header className="mt-6 max-w-3xl">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                        {service.name}
                    </p>

                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                        Select your items
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                        Select the garments you want to include in your{" "}
                        {service.name.toLowerCase()} order.
                    </p>
                </header>

                {itemsError ? (
                    <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        We couldn't load the items for this service. Please try
                        again later.
                    </div>
                ) : (
                    <ServiceCatalog
                        service={{
                            id: service.id,
                            name: service.name,
                        }}
                        items={items}
                    />
                )}
            </main>
        </div>
    );
}
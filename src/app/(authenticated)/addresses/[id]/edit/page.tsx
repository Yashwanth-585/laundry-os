import Link from "next/link";
import { notFound } from "next/navigation";

import { EditAddressForm } from "@/components/addresses/edit-address-form";
import { createClient } from "@/lib/supabase/server";

type EditAddressPageProps = {
    params: Promise<{ id: string }>;
};

export default async function EditAddressPage({
    params,
}: EditAddressPageProps) {
    const { id } = await params;

    const supabase = await createClient();

    const { data: address, error } = await supabase
        .from("addresses")
        .select(
            "id, label, recipient_name, phone, address_line1, address_line2, landmark, city, state, pincode, latitude, longitude, is_default",
        )
        .eq("id", id)
        .single();

    if (error || !address) {
        notFound();
    }

    return (
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
            <div>
                <Link
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue-deep transition hover:text-brand-navy"
                    href="/addresses"
                >
                    ← Back to saved addresses
                </Link>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-brand-navy">
                    Edit Address
                </h1>

                <p className="mt-1 text-sm text-slate-600">
                    Update your pickup and delivery address details.
                </p>

                <EditAddressForm address={address} />
            </div>
        </main>
    );
}
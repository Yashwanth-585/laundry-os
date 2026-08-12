import Link from "next/link";

import { NewAddressForm } from "@/components/addresses/new-address-form";

export default function NewAddressPage() {
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
          Add New Address
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Add a pickup and delivery address for your laundry orders.
        </p>
        <NewAddressForm />
      </div>
    </main>
  );
}

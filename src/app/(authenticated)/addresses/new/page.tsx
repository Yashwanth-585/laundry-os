import Link from "next/link";

import { NewAddressForm } from "@/components/addresses/new-address-form";

export default function NewAddressPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 sm:px-6 lg:px-8 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-2xl">
        <Link className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50" href="/addresses">
          ← Saved addresses
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Add address</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Add a pickup and delivery address for your laundry.
        </p>
        <NewAddressForm />
      </div>
    </main>
  );
}

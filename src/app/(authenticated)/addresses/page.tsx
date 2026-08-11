import { createClient } from "@/lib/supabase/server";

export default async function AddressesPage() {
  const supabase = await createClient();
  const { data: addresses, error } = await supabase
    .from("addresses")
    .select(
      "id, label, recipient_name, phone, address_line1, address_line2, landmark, city, state, pincode, is_default",
    )
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 sm:px-6 lg:px-8 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-3xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Account
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Saved addresses
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Manage the pickup and delivery addresses for your laundry.
            </p>
          </div>
          <button
            className="rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950"
            type="button"
            disabled
            title="Address creation is coming soon"
          >
            Add address
          </button>
        </header>

        {error ? (
          <p className="mt-10 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            Your addresses could not be loaded. Please try again later.
          </p>
        ) : addresses?.length ? (
          <section className="mt-8 grid gap-4" aria-label="Saved addresses">
            {addresses.map((address) => (
              <article
                key={address.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold">{address.label}</h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {address.recipient_name} · {address.phone}
                    </p>
                  </div>
                  {address.is_default ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Default
                    </span>
                  ) : null}
                </div>

                <address className="mt-4 not-italic text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                  <p>{address.address_line1}</p>
                  {address.address_line2 ? <p>{address.address_line2}</p> : null}
                  {address.landmark ? <p>Near {address.landmark}</p> : null}
                  <p>
                    {address.city}, {address.state} {address.pincode}
                  </p>
                </address>
              </article>
            ))}
          </section>
        ) : (
          <section className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold">No saved addresses yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Add an address to make future laundry pickups and deliveries easier.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

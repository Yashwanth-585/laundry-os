import Link from "next/link";
import { DeleteAddressButton } from "@/components/addresses/delete-address-button";
import { MakeDefaultButton } from "@/components/addresses/make-default-button";
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
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
              Account Management
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-brand-navy">
              Saved Addresses
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage pickup and delivery locations for your laundry service.
            </p>
          </div>
          <Link
            className="rounded-lg bg-brand-navy px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-blue-deep focus:outline-none focus:ring-2 focus:ring-brand-blue-deep/30"
            href="/addresses/new"
          >
            + Add address
          </Link>
        </header>

        {error ? (
          <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Your addresses could not be loaded. Please try again later.
          </p>
        ) : addresses?.length ? (
          <section className="mt-8 grid gap-4" aria-label="Saved addresses">
            {addresses.map((address) => (
              <article
                key={address.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {address.label}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {address.recipient_name} · {address.phone}
                    </p>
                  </div>
                  {address.is_default ? (
                    <span className="rounded-full bg-brand-blue-deep/10 border border-brand-blue-deep/20 px-3 py-1 text-xs font-semibold text-brand-blue-deep">
                      Default Address
                    </span>
                  ) : null}
                </div>

                <address className="mt-4 not-italic text-sm leading-6 text-slate-600 border-t border-slate-100 pt-3">
                  <p>{address.address_line1}</p>
                  {address.address_line2 ? <p>{address.address_line2}</p> : null}
                  {address.landmark ? <p>Near {address.landmark}</p> : null}
                  <p className="font-medium text-slate-800">
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                </address>
                <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                  {!address.is_default ? (
                    <MakeDefaultButton addressId={address.id} />
                  ) : null}

                  <Link
                    href={`/addresses/${address.id}/edit`}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-blue-deep/20"
                  >
                    Edit address
                  </Link>

                  <DeleteAddressButton addressId={address.id} />
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <h2 className="text-lg font-bold text-brand-navy">No saved addresses yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
              Add an address to make future laundry pickups and deliveries easier.
            </p>
            <Link
              className="mt-6 inline-block rounded-lg bg-brand-navy px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-blue-deep"
              href="/addresses/new"
            >
              Add your first address
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}

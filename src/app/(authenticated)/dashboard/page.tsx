import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const email = typeof data?.claims.email === "string" ? data.claims.email : "";

  if (error || !userId) {
    redirect("/login");
  }

  const { data: addressData } = await supabase.from("addresses").select("id");
  const addressCount = addressData?.length ?? 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
              Account Overview
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Welcome back to WashLand LaundryOS.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700">
            <span className="inline-block size-2 rounded-full bg-emerald-500"></span>
            Session Active
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Saved Addresses Card */}
          <Link
            href="/addresses"
            className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-brand-blue-deep hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-brand-navy/10 p-2.5 text-brand-navy group-hover:bg-brand-navy group-hover:text-white transition-colors">
                  <svg
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                    />
                  </svg>
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 group-hover:bg-brand-blue-deep/10 group-hover:text-brand-blue-deep transition-colors">
                  {addressCount} {addressCount === 1 ? "address" : "addresses"}
                </span>
              </div>
              <h2 className="mt-5 text-base font-bold text-slate-900">
                Saved Addresses
              </h2>
              <p className="mt-1 text-xs text-slate-500 leading-5">
                Manage your pickup and delivery locations for laundry orders.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-brand-blue-deep">
              <span>View & Add Locations</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>

          {/* User Account Info Card */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-slate-100 p-2.5 text-slate-700">
                  <svg
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  Customer
                </span>
              </div>
              <h2 className="mt-5 text-base font-bold text-slate-900">
                User Profile
              </h2>
              <p className="mt-1 truncate text-xs font-medium text-slate-600">
                {email || userId}
              </p>
            </div>
            <div className="mt-6 border-t border-slate-100 pt-3 text-xs text-slate-400">
              Authenticated via Supabase
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

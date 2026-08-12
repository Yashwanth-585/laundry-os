import Image from "next/image";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/washland-horizontal.png"
            alt="WashLand LaundryOS"
            width={160}
            height={40}
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg bg-brand-navy px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-blue-deep"
              >
                Go to Dashboard
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-brand-navy px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-blue-deep"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-16 sm:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue-deep/20 bg-brand-blue-deep/5 px-3.5 py-1 text-xs font-semibold text-brand-blue-deep w-fit">
          <span className="inline-block size-2 rounded-full bg-brand-orange"></span>
          WashLand LaundryOS
        </div>
        <h1 className="mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-brand-navy sm:text-6xl sm:leading-[1.15]">
          Smart, effortless laundry & dry-cleaning management.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          Everything your laundry operations need — streamlined customer care, saved addresses, scheduled pickups, and seamless delivery.
        </p>
        <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
          {isAuthenticated ? (
            <Link
              className="rounded-lg bg-brand-navy px-6 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-brand-blue-deep focus:outline-none focus:ring-2 focus:ring-brand-blue-deep/30"
              href="/dashboard"
            >
              Open Dashboard →
            </Link>
          ) : (
            <>
              <Link
                className="rounded-lg bg-brand-navy px-6 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-brand-blue-deep focus:outline-none focus:ring-2 focus:ring-brand-blue-deep/30"
                href="/signup"
              >
                Create an account
              </Link>
              <Link
                className="rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                href="/login"
              >
                Sign in to your account
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

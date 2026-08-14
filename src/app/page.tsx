import Image from "next/image";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";
import { HeroSlideshow } from "@/components/home/hero-slideshow";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 scroll-smooth">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/washland-horizontal.png"
              alt="WashLand LaundryOS"
              width={360}
              height={90}
              className="h-auto w-[190px] shrink-0 object-contain sm:w-[230px]"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a
              href="#services"
              className="transition hover:text-brand-navy"
            >
              Services
            </a>

            <a
              href="#how-it-works"
              className="transition hover:text-brand-navy"
            >
              How it works
            </a>

            <a
              href="#why-washland"
              className="transition hover:text-brand-navy"
            >
              Why WashLand
            </a>
          </nav>

          {/* Right Auth Links */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/orders"
                  className="hidden rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
                >
                  My Orders
                </Link>

                <Link
                  href="/dashboard"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-brand-navy"
                >
                  Dashboard
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
        </div>
      </header>

      <main className="flex-1">
        {/* =========================================================
            HERO
        ========================================================== */}
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Hero Text */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue-deep/20 bg-brand-blue-deep/5 px-3.5 py-1 text-xs font-semibold text-brand-blue-deep">
                <span className="inline-block size-2 rounded-full bg-brand-orange" />
                WashLand LaundryOS
              </div>

              <h1 className="mt-5 max-w-3xl text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl sm:leading-[1.15] lg:text-5xl">
                Smart, effortless laundry & dry-cleaning operations.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Everything your laundry operations need — streamlined
                customer care, saved addresses, scheduled pickups, and
                seamless delivery workflow.
              </p>

              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
                <a
                  href="#services"
                  className="rounded-lg bg-brand-navy px-6 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-brand-blue-deep focus:outline-none focus:ring-2 focus:ring-brand-blue-deep/30"
                >
                  Explore Services →
                </a>

                {isAuthenticated ? (
                  <Link
                    className="rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    href="/dashboard"
                  >
                    Open Dashboard
                  </Link>
                ) : (
                  <Link
                    className="rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    href="/signup"
                  >
                    Get Started
                  </Link>
                )}
              </div>
            </div>

            {/* Hero Slideshow */}
            <div className="lg:col-span-5">
              <HeroSlideshow />
            </div>
          </div>
        </section>

        {/* =========================================================
            SERVICES
        ========================================================== */}
        <section
          id="services"
          className="border-t border-slate-200 bg-white py-16 sm:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                Services
              </h2>

              <p className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                Our Core Fabric Care Services
              </p>

              <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
                Comprehensive laundry and dry-cleaning solutions tailored to
                your schedule and garment requirements.
              </p>
            </div>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {/* Wash & Fold */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition hover:-translate-y-1 hover:border-brand-blue-deep/30 hover:bg-white hover:shadow-md">
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-navy text-white">
                  <svg
                    className="size-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3l-3-3m3 3l3-3"
                    />
                  </svg>
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  Wash & Fold
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Everyday clothing thoroughly washed with care, dried, and
                  neatly folded for your convenience.
                </p>
              </div>

              {/* Dry Cleaning */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition hover:-translate-y-1 hover:border-brand-blue-deep/30 hover:bg-white hover:shadow-md">
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-blue-deep text-white">
                  <svg
                    className="size-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"
                    />
                  </svg>
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  Dry Cleaning
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Specialized treatment for delicate fabrics, formal attire,
                  suits, and garments requiring expert care.
                </p>
              </div>

              {/* Ironing */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition hover:-translate-y-1 hover:border-brand-blue-deep/30 hover:bg-white hover:shadow-md">
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-navy text-white">
                  <svg
                    className="size-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                    />
                  </svg>
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  Ironing & Pressing
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Professional steam pressing and precision ironing to ensure
                  a crisp, wrinkle-free finish.
                </p>
              </div>

              {/* Pickup & Delivery */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition hover:-translate-y-1 hover:border-brand-blue-deep/30 hover:bg-white hover:shadow-md">
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-orange text-white">
                  <svg
                    className="size-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677"
                    />
                  </svg>
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  Pickup & Delivery
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Reliable doorstep pickup and drop-off managed around your
                  preferred address locations.
                </p>
              </div>
            </div>

            {/* Start an Order */}
            <div className="mt-10 text-center">
              <Link
                href={isAuthenticated ? "/services" : "/login"}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-navy px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-blue-deep"
              >
                {isAuthenticated
                  ? "Start an Order"
                  : "Sign in to start an order"}
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================================
            HOW IT WORKS
        ========================================================== */}
        <section
          id="how-it-works"
          className="border-t border-slate-200 bg-slate-50/70 py-16 sm:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                Process
              </h2>

              <p className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                How WashLand Works
              </p>

              <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
                Four simple steps from scheduling to fresh laundry at your
                door.
              </p>
            </div>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [
                  "1",
                  "Schedule Request",
                  "Select your required fabric services and specify your pickup location.",
                ],
                [
                  "2",
                  "Doorstep Pickup",
                  "Our team collects your garments safely from your saved address.",
                ],
                [
                  "3",
                  "Professional Care",
                  "Items are washed, dry-cleaned, or pressed using high-grade standards.",
                ],
                [
                  "4",
                  "Fresh Delivery",
                  "Fresh, crisp laundry is packaged and delivered right back to your door.",
                ],
              ].map(([number, title, description], index) => (
                <div
                  key={number}
                  className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <span
                    className={`inline-flex size-8 items-center justify-center rounded-full text-xs font-extrabold text-white ${index === 3
                      ? "bg-brand-orange"
                      : index === 1
                        ? "bg-brand-blue-deep"
                        : "bg-brand-navy"
                      }`}
                  >
                    {number}
                  </span>

                  <h3 className="mt-4 text-base font-bold text-slate-900">
                    {title}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            WHY WASHLAND
        ========================================================== */}
        <section
          id="why-washland"
          className="border-t border-slate-200 bg-white py-16 sm:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                  Why WashLand
                </h2>

                <p className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                  Built for Convenience & Quality
                </p>

                <p className="mt-4 text-base text-slate-600">
                  WashLand brings structure, accountability, and seamless
                  address management to your everyday laundry needs.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:col-span-7">
                {[
                  [
                    "Saved Address Management",
                    "Store and organize home, work, and secondary pickup addresses with pin-point accuracy.",
                  ],
                  [
                    "Convenient Doorstep Service",
                    "Eliminate trips to local laundromats with scheduled pickup and delivery options.",
                  ],
                  [
                    "Dedicated Fabric Care",
                    "Tailored cleaning workflows for everyday cottons, delicates, suits, and linens.",
                  ],
                  [
                    "Reliable Operation",
                    "Structured service handling built on the LaundryOS platform for consistent results.",
                  ],
                ].map(([title, description]) => (
                  <div
                    key={title}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-5"
                  >
                    <h3 className="text-sm font-bold text-slate-900">
                      {title}
                    </h3>

                    <p className="mt-1.5 text-xs leading-5 text-slate-600">
                      {description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            FINAL CTA
        ========================================================== */}
        <section className="border-t border-slate-200 bg-brand-navy py-16 text-white">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Ready for effortless laundry care?
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-base text-slate-200">
              Choose your services, build your order, and manage your laundry
              through WashLand.
            </p>

            <div className="mt-8 flex justify-center gap-4">
              <Link
                href={isAuthenticated ? "/services" : "#services"}
                className="rounded-lg bg-white px-6 py-3.5 text-sm font-semibold text-brand-navy transition hover:bg-slate-100"
              >
                {isAuthenticated
                  ? "Start an Order →"
                  : "Explore Services →"}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================
          FOOTER
      ========================================================== */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Image
              src="/brand/washland-horizontal.png"
              alt="WashLand"
              width={260}
              height={65}
              className="h-auto w-[150px] object-contain"
            />

            <p className="text-xs text-slate-500">
              Smart laundry & dry-cleaning operations platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-600">
            <a
              href="#services"
              className="transition hover:text-brand-navy"
            >
              Services
            </a>

            <a
              href="#how-it-works"
              className="transition hover:text-brand-navy"
            >
              How it works
            </a>

            <a
              href="#why-washland"
              className="transition hover:text-brand-navy"
            >
              Why WashLand
            </a>

            {!isAuthenticated && (
              <>
                <Link
                  href="/login"
                  className="transition hover:text-brand-navy"
                >
                  Sign in
                </Link>

                <Link
                  href="/signup"
                  className="transition hover:text-brand-navy"
                >
                  Get started
                </Link>
              </>
            )}

            {isAuthenticated && (
              <Link
                href="/orders"
                className="transition hover:text-brand-navy"
              >
                My Orders
              </Link>
            )}
          </div>

          <p className="text-xs text-slate-400">
            © 2026 WashLand. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
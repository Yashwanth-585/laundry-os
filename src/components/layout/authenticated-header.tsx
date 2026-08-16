"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";

interface AuthenticatedHeaderProps {
  userEmail?: string;
  role?: "admin" | "delivery_partner" | "customer" | "vendor";
}

export function AuthenticatedHeader({
  userEmail,
  role = "customer",
}: AuthenticatedHeaderProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const customerNavLinks = [
    {
      href: "/services",
      label: "Services",
    },
    {
      href: "/orders",
      label: "My Orders",
    },
    {
      href: "/dashboard",
      label: "Dashboard",
    },
    {
      href: "/addresses",
      label: "Addresses",
    },
  ];

  const adminNavLinks = [
    {
      href: "/admin",
      label: "Admin Dashboard",
    },
    {
      href: "/admin/orders",
      label: "Orders",
    },
    {
      href: "/admin/delivery-partners",
      label: "Delivery Partners",
    },
  ];

  const riderNavLinks = [
    {
      href: "/rider",
      label: "Rider Dashboard",
    },
  ];

  const vendorNavLinks = [
    {
      href: "/vendor",
      label: "Vendor Dashboard",
    },
  ];

  const navLinks =
    role === "admin"
      ? adminNavLinks
      : role === "delivery_partner"
        ? riderNavLinks
        : role === "vendor"
          ? vendorNavLinks
          : customerNavLinks;

  const isAdmin = role === "admin";
  const isRider = role === "delivery_partner";
  const isVendor = role === "vendor";

  const homeHref = isAdmin
    ? "/admin"
    : isRider
      ? "/rider"
      : isVendor
        ? "/vendor"
        : "/";

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="h-[3px] w-full bg-gradient-to-r from-brand-navy via-brand-blue-deep to-brand-orange" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link
            href={homeHref}
            className="flex items-center gap-2"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Image
              src="/brand/washland-horizontal.png"
              alt="WashLand LaundryOS"
              width={320}
              height={80}
              className="h-auto w-[160px] shrink-0 object-contain sm:w-[180px]"
              priority
            />
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive(link.href)
                  ? "bg-brand-blue-deep/10 font-semibold text-brand-navy"
                  : "text-slate-600 hover:bg-brand-blue-deep/5 hover:text-brand-navy"
                  }`}
              >
                {link.label}

                {isActive(link.href) && (
                  <span className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-brand-orange" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop right side */}
        <div className="hidden items-center gap-4 md:flex">
          {/* Customer Cart */}
          {role === "customer" && (
            <Link
              href="/cart"
              className={`relative rounded-md px-3 py-2 text-sm font-semibold shadow-sm transition-colors ${isActive("/cart")
                ? "bg-brand-navy text-white"
                : "text-slate-600 hover:bg-brand-blue-deep/5 hover:text-brand-navy"
                }`}
            >
              <span className="flex items-center gap-2">
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.8"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835L5.76 6.75m0 0h14.49c.715 0 1.225.69.998 1.368l-1.35 4.05a1.5 1.5 0 01-1.423 1.026H8.01a1.5 1.5 0 01-1.423-1.026L5.76 6.75zm2.25 9.75a1.5 1.5 0 103 0m6 0a1.5 1.5 0 103 0"
                  />
                </svg>
                Cart
              </span>
            </Link>
          )}

          {userEmail ? (
            <span
              className="max-w-[220px] truncate text-xs font-medium text-slate-500"
              title={userEmail}
            >
              {userEmail}
            </span>
          ) : null}

          <div className="h-5 w-px bg-slate-200" />

          <LogoutButton />
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-brand-blue-deep/5 hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-blue-deep focus:ring-inset"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle main menu"
          >
            {isMobileMenuOpen ? (
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
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
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`rounded-md px-3 py-2 text-base font-medium transition-colors ${isActive(link.href)
                  ? "bg-brand-blue-deep/10 font-semibold text-brand-navy"
                  : "text-slate-700 hover:bg-brand-blue-deep/5 hover:text-brand-navy"
                  }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile Cart — customer only */}
            {role === "customer" && (
              <Link
                href="/cart"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium transition-colors ${isActive("/cart")
                  ? "bg-brand-navy font-semibold text-white"
                  : "text-slate-700 hover:bg-brand-blue-deep/5 hover:text-brand-navy"
                  }`}
              >
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.8"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835L5.76 6.75m0 0h14.49c.715 0 1.225.69.998 1.368l-1.35 4.05a1.5 1.5 0 01-1.423 1.026H8.01a1.5 1.5 0 01-1.423-1.026L5.76 6.75zm2.25 9.75a1.5 1.5 0 103 0m6 0a1.5 1.5 0 103 0"
                  />
                </svg>
                Cart
              </Link>
            )}
          </nav>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3">
            {userEmail ? (
              <span className="px-3 text-xs font-medium text-slate-500">
                Signed in as {userEmail}
              </span>
            ) : null}

            <div className="px-3">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
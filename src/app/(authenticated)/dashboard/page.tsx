import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

function getStatusClasses(status: string) {
  switch (status) {
    case "PLACED":
      return "bg-blue-50 text-blue-700 border-blue-100";

    case "PICKED_UP":
    case "AT_FACILITY":
    case "IN_PROCESS":
      return "bg-amber-50 text-amber-700 border-amber-100";

    case "READY":
    case "OUT_FOR_DELIVERY":
      return "bg-indigo-50 text-indigo-700 border-indigo-100";

    case "DELIVERED":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";

    case "CANCELLED":
    case "RETURNED":
      return "bg-red-50 text-red-700 border-red-100";

    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const email =
    typeof data?.claims.email === "string" ? data.claims.email : "";

  if (error || !userId) {
    redirect("/login");
  }

  /* ------------------------------------------------------------
     Fetch dashboard data
  ------------------------------------------------------------ */

  const [
    { data: addresses },
    { data: orders },
  ] = await Promise.all([
    supabase
      .from("addresses")
      .select("id")
      .eq("user_id", userId),

    supabase
      .from("orders")
      .select(
        `
        id,
        status,
        pickup_date,
        pickup_slot,
        total_amount,
        created_at
        `,
      )
      .eq("customer_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const addressCount = addresses?.length ?? 0;
  const allOrders = orders ?? [];

  const activeOrders = allOrders.filter(
    (order) =>
      !["DELIVERED", "CANCELLED", "RETURNED"].includes(order.status),
  );

  const completedOrders = allOrders.filter(
    (order) => order.status === "DELIVERED",
  );

  const totalSpent = allOrders.reduce(
    (sum, order) => sum + Number(order.total_amount ?? 0),
    0,
  );

  const recentOrders = allOrders.slice(0, 3);
  const currentOrder = activeOrders[0];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-20 sm:px-6 lg:px-8">
      {/* ----------------------------------------------------------
          Header
      ----------------------------------------------------------- */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
            Dashboard
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
            Welcome back
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Manage your laundry orders, addresses, and account from one place.
          </p>
        </div>

        <Link
          href="/services"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-brand-navy px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-blue-deep hover:shadow-md"
        >
          Start an Order
          <span>→</span>
        </Link>
      </header>

      {/* ----------------------------------------------------------
          Stats
      ----------------------------------------------------------- */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Orders */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-navy/10 text-brand-navy">
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.7"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 7.5h10.5M6.75 12h10.5M6.75 16.5h6"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.25 3.75h13.5A1.5 1.5 0 0120.25 5.25v13.5a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V5.25a1.5 1.5 0 011.5-1.5z"
                />
              </svg>
            </span>

            <span className="text-xs font-semibold text-slate-400">
              Lifetime
            </span>
          </div>

          <p className="mt-5 text-2xl font-extrabold text-slate-900">
            {allOrders.length}
          </p>

          <p className="mt-1 text-xs font-medium text-slate-500">
            Total orders
          </p>
        </div>

        {/* Active Orders */}
        <Link
          href="/orders"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-blue-deep/30 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <span className="size-2.5 rounded-full bg-amber-500" />
            </span>

            <span className="text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-blue-deep">
              →
            </span>
          </div>

          <p className="mt-5 text-2xl font-extrabold text-slate-900">
            {activeOrders.length}
          </p>

          <p className="mt-1 text-xs font-medium text-slate-500">
            Active orders
          </p>
        </Link>

        {/* Completed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              ✓
            </span>

            <span className="text-xs font-semibold text-slate-400">
              Completed
            </span>
          </div>

          <p className="mt-5 text-2xl font-extrabold text-slate-900">
            {completedOrders.length}
          </p>

          <p className="mt-1 text-xs font-medium text-slate-500">
            Delivered orders
          </p>
        </div>

        {/* Total Spent */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange font-bold">
              ₹
            </span>

            <span className="text-xs font-semibold text-slate-400">
              Lifetime
            </span>
          </div>

          <p className="mt-5 text-2xl font-extrabold text-slate-900">
            ₹{totalSpent.toFixed(2)}
          </p>

          <p className="mt-1 text-xs font-medium text-slate-500">
            Total spent
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------------
          Main dashboard grid
      ----------------------------------------------------------- */}
      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Current Order */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="font-bold text-slate-900">
                Current Order
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Keep track of your latest laundry request.
              </p>
            </div>

            <Link
              href="/orders"
              className="text-xs font-bold text-brand-blue-deep hover:underline"
            >
              View all
            </Link>
          </div>

          {currentOrder ? (
            <Link
              href={`/orders/${currentOrder.id}`}
              className="block p-6 transition hover:bg-slate-50/60"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-bold text-slate-900">
                      Order #
                      {currentOrder.id
                        .slice(0, 8)
                        .toUpperCase()}
                    </h3>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                        currentOrder.status,
                      )}`}
                    >
                      {formatStatus(currentOrder.status)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    Pickup:{" "}
                    <span className="font-semibold text-slate-700">
                      {new Date(
                        `${currentOrder.pickup_date}T00:00:00`,
                      ).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>{" "}
                    · {currentOrder.pickup_slot}
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Total
                  </p>

                  <p className="mt-1 text-xl font-extrabold text-brand-navy">
                    ₹{Number(currentOrder.total_amount).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs font-semibold text-slate-500">
                  View order details
                </span>

                <span className="text-brand-blue-deep">→</span>
              </div>
            </Link>
          ) : (
            <div className="p-8 text-center">
              <div className="text-4xl">🧺</div>

              <h3 className="mt-3 font-bold text-slate-900">
                No active orders
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Ready for your next laundry pickup?
              </p>

              <Link
                href="/services"
                className="mt-5 inline-flex rounded-xl bg-brand-navy px-5 py-2.5 text-xs font-bold text-white transition hover:bg-brand-blue-deep"
              >
                Browse Services
              </Link>
            </div>
          )}
        </div>

        {/* Laundry Coins */}
        <div className="relative overflow-hidden rounded-2xl bg-brand-navy p-6 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-brand-blue-deep/40 blur-2xl" />

          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-xl">
                🪙
              </div>

              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-200">
                Coming soon
              </span>
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-300">
              Laundry Coins
            </p>

            <p className="mt-2 text-3xl font-extrabold">
              —
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Earn coins from eligible laundry orders and use them for future
              benefits.
            </p>

            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="text-xs text-slate-400">
                Your coin balance and earning history will appear here once
                the rewards system is enabled.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------
          Recent Orders + Quick Actions
      ----------------------------------------------------------- */}
      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="font-bold text-slate-900">
                Recent Orders
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Your latest laundry activity.
              </p>
            </div>

            <Link
              href="/orders"
              className="text-xs font-bold text-brand-blue-deep hover:underline"
            >
              View all
            </Link>
          </div>

          {recentOrders.length ? (
            <div className="divide-y divide-slate-100">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        Order #
                        {order.id.slice(0, 8).toUpperCase()}
                      </p>

                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getStatusClasses(
                          order.status,
                        )}`}
                      >
                        {formatStatus(order.status)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(order.created_at).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-extrabold text-brand-navy">
                      ₹{Number(order.total_amount).toFixed(2)}
                    </p>

                    <span className="text-xs text-brand-blue-deep">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              No order activity yet.
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-900">
            Quick Actions
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Common things you may want to do.
          </p>

          <div className="mt-5 space-y-3">
            <Link
              href="/services"
              className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-brand-blue-deep/30 hover:bg-brand-blue-deep/5"
            >
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Start an Order
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Choose laundry services
                </p>
              </div>

              <span className="text-brand-blue-deep transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>

            <Link
              href="/addresses"
              className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-brand-blue-deep/30 hover:bg-brand-blue-deep/5"
            >
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Manage Addresses
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {addressCount} saved{" "}
                  {addressCount === 1 ? "location" : "locations"}
                </p>
              </div>

              <span className="text-brand-blue-deep transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>

            <Link
              href="/orders"
              className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-brand-blue-deep/30 hover:bg-brand-blue-deep/5"
            >
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Order History
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  View all your orders
                </p>
              </div>

              <span className="text-brand-blue-deep transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------
          Account
      ----------------------------------------------------------- */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
              Account
            </p>

            <h2 className="mt-2 text-lg font-extrabold text-slate-900">
              Your WashLand account
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {email || userId}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700">
            <span className="size-2 rounded-full bg-emerald-500" />
            Account active
          </div>
        </div>
      </section>
    </main>
  );
}
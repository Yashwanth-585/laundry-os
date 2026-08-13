"use client";

import Link from "next/link";

import { useCart } from "@/context/CartContext";

const MAX_VISIBLE_ITEMS_DESKTOP = 4;
const MAX_VISIBLE_ITEMS_MOBILE = 3;

export default function CartPage() {
    const {
        items,
        updateQuantity,
        removeItem,
        totalItems,
        totalAmount,
    } = useCart();

    const services = Array.from(
        new Set(items.map((item) => item.serviceId)),
    ).map((serviceId) => ({
        id: serviceId,
        name:
            items.find(
                (item) => item.serviceId === serviceId,
            )?.serviceName ?? "",
    }));

    const hasUnpricedItems = items.some(
        (item) => item.price <= 0,
    );

    /* ---------------------------------------------------------------------- */
    /* EMPTY CART                                                             */
    /* ---------------------------------------------------------------------- */

    if (items.length === 0) {
        return (
            <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <div className="text-4xl">🧺</div>

                    <h1 className="mt-4 text-2xl font-extrabold text-brand-navy">
                        Your order is empty
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Select a service and add some items to your order.
                    </p>

                    <Link
                        href="/services"
                        className="mt-6 inline-flex rounded-xl bg-brand-navy px-6 py-3 text-sm font-bold text-white"
                    >
                        Browse services
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main
            className="
                mx-auto
                max-w-[1500px]
                px-4
                py-8
                pb-32
                sm:px-6
                lg:px-8
                lg:pr-[390px]
            "
        >
            {/* ---------------------------------------------------------------- */}
            {/* HEADER                                                           */}
            {/* ---------------------------------------------------------------- */}

            <Link
                href="/services"
                className="text-sm font-semibold text-brand-blue-deep hover:underline"
            >
                ← Add another service
            </Link>

            <header className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                    Your order
                </p>

                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy">
                    Review your items
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    {totalItems}{" "}
                    {totalItems === 1 ? "piece" : "pieces"} selected across{" "}
                    {services.length}{" "}
                    {services.length === 1 ? "service" : "services"}
                </p>
            </header>

            {/* ---------------------------------------------------------------- */}
            {/* SERVICE GRID                                                     */}
            {/* ---------------------------------------------------------------- */}

            <div className="mt-8">
                <div className="grid gap-6 sm:grid-cols-2">
                    {services.map((service) => {
                        const serviceItems = items.filter(
                            (item) => item.serviceId === service.id,
                        );

                        const serviceTotal = serviceItems.reduce(
                            (total, item) =>
                                total + item.price * item.quantity,
                            0,
                        );

                        const hasUnpricedServiceItems =
                            serviceItems.some((item) => item.price <= 0);

                        const visibleDesktopItems = serviceItems.slice(
                            0,
                            MAX_VISIBLE_ITEMS_DESKTOP,
                        );

                        const visibleMobileItems = serviceItems.slice(
                            0,
                            MAX_VISIBLE_ITEMS_MOBILE,
                        );

                        const desktopRemaining = Math.max(
                            0,
                            serviceItems.length -
                            MAX_VISIBLE_ITEMS_DESKTOP,
                        );

                        const mobileRemaining = Math.max(
                            0,
                            serviceItems.length -
                            MAX_VISIBLE_ITEMS_MOBILE,
                        );

                        return (
                            <section
                                key={service.id}
                                className="
                                    flex
                                    h-[350px]
                                    flex-col
                                    overflow-hidden
                                    rounded-2xl
                                    border
                                    border-slate-200
                                    bg-white
                                    shadow-sm
                                    transition
                                    hover:-translate-y-0.5
                                    hover:shadow-md
                                "
                            >
                                {/* SERVICE HEADER */}
                                <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h2 className="truncate text-base font-extrabold text-brand-navy">
                                                {service.name}
                                            </h2>

                                            <p className="mt-1 text-xs text-slate-500">
                                                {serviceItems.length}{" "}
                                                {serviceItems.length === 1
                                                    ? "article"
                                                    : "articles"}
                                            </p>
                                        </div>

                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                                            🧺
                                        </div>
                                    </div>
                                </div>

                                {/* ITEMS */}
                                <div className="flex-1 px-5 py-3">
                                    {/* MOBILE */}
                                    <div className="sm:hidden">
                                        <div className="space-y-2">
                                            {visibleMobileItems.map((item) => (
                                                <CartItemRow
                                                    key={
                                                        item.serviceCatalogItemId
                                                    }
                                                    item={item}
                                                    updateQuantity={
                                                        updateQuantity
                                                    }
                                                    removeItem={removeItem}
                                                />
                                            ))}
                                        </div>

                                        {mobileRemaining > 0 && (
                                            <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-center">
                                                <span className="text-xs font-semibold text-slate-500">
                                                    +{mobileRemaining} more{" "}
                                                    {mobileRemaining === 1
                                                        ? "article"
                                                        : "articles"}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* DESKTOP */}
                                    <div className="hidden sm:block">
                                        <div className="space-y-2">
                                            {visibleDesktopItems.map((item) => (
                                                <CartItemRow
                                                    key={
                                                        item.serviceCatalogItemId
                                                    }
                                                    item={item}
                                                    updateQuantity={
                                                        updateQuantity
                                                    }
                                                    removeItem={removeItem}
                                                />
                                            ))}
                                        </div>

                                        {desktopRemaining > 0 && (
                                            <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-center">
                                                <span className="text-xs font-semibold text-slate-500">
                                                    +{desktopRemaining} more{" "}
                                                    {desktopRemaining === 1
                                                        ? "article"
                                                        : "articles"}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* SERVICE TOTAL */}
                                <div className="mt-auto flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                                    <span className="text-xs font-semibold text-slate-500">
                                        Service subtotal
                                    </span>

                                    {hasUnpricedServiceItems ? (
                                        <span className="text-sm font-bold text-slate-600">
                                            Price pending
                                        </span>
                                    ) : (
                                        <span className="text-base font-extrabold text-slate-900">
                                            ₹{serviceTotal.toFixed(2)}
                                        </span>
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            {/* ================================================================= */}
            {/* DESKTOP ORDER SUMMARY                                             */}
            {/* ================================================================= */}

            <aside
                className="
                    fixed
                    right-6
                    top-[calc(50%+44px)]
                    z-30
                    hidden
                    w-[340px]
                    -translate-y-1/2
                    lg:block
                "
            >
                <OrderSummary
                    services={services}
                    items={items}
                    totalItems={totalItems}
                    totalAmount={totalAmount}
                    hasUnpricedItems={hasUnpricedItems}
                />
            </aside>

            {/* ================================================================= */}
            {/* MOBILE ORDER SUMMARY                                              */}
            {/* ================================================================= */}

            <div className="mt-8 lg:hidden">
                <OrderSummary
                    services={services}
                    items={items}
                    totalItems={totalItems}
                    totalAmount={totalAmount}
                    hasUnpricedItems={hasUnpricedItems}
                />
            </div>
        </main>
    );
}

/* ========================================================================== */
/* ORDER SUMMARY                                                              */
/* ========================================================================== */

function OrderSummary({
    services,
    items,
    totalItems,
    totalAmount,
    hasUnpricedItems,
}: {
    services: {
        id: string;
        name: string;
    }[];
    items: {
        serviceId: string;
        price: number;
        quantity: number;
    }[];
    totalItems: number;
    totalAmount: number;
    hasUnpricedItems: boolean;
}) {
    return (
        <section
            className="
                flex
                max-h-[calc(100vh-160px)]
                flex-col
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-4
                shadow-lg
            "
        >
            {/* HEADER */}
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                    Order summary
                </p>

                <h2 className="mt-1.5 text-xl font-extrabold text-brand-navy">
                    Your order
                </h2>
            </div>

            {/* QUICK STATS */}
            <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 p-2.5">
                    <p className="text-[11px] text-slate-500">
                        Services
                    </p>

                    <p className="mt-0.5 text-base font-extrabold text-slate-900">
                        {services.length}
                    </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-2.5">
                    <p className="text-[11px] text-slate-500">
                        Pieces
                    </p>

                    <p className="mt-0.5 text-base font-extrabold text-slate-900">
                        {totalItems}
                    </p>
                </div>
            </div>

            {/* SERVICES */}
            <div className="mt-3 flex-1 overflow-y-auto border-t border-slate-100 pt-3">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Services
                </p>

                <div className="space-y-2.5">
                    {services.map((service) => {
                        const serviceItems = items.filter(
                            (item) => item.serviceId === service.id,
                        );

                        const serviceTotal = serviceItems.reduce(
                            (total, item) =>
                                total + item.price * item.quantity,
                            0,
                        );

                        const serviceHasUnpriced = serviceItems.some(
                            (item) => item.price <= 0,
                        );

                        return (
                            <div
                                key={service.id}
                                className="flex items-center justify-between gap-3"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-slate-700">
                                        {service.name}
                                    </p>

                                    <p className="text-[10px] text-slate-400">
                                        {serviceItems.length}{" "}
                                        {serviceItems.length === 1
                                            ? "article"
                                            : "articles"}
                                    </p>
                                </div>

                                {serviceHasUnpriced ? (
                                    <span className="shrink-0 text-[10px] font-semibold text-slate-500">
                                        Pending
                                    </span>
                                ) : (
                                    <span className="shrink-0 text-xs font-bold text-slate-900">
                                        ₹{serviceTotal.toFixed(2)}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* TOTAL */}
            <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-slate-900">
                        Estimated total
                    </span>

                    {hasUnpricedItems ? (
                        <span className="text-base font-extrabold text-slate-700">
                            Price pending
                        </span>
                    ) : (
                        <span className="text-xl font-extrabold text-brand-navy">
                            ₹{totalAmount.toFixed(2)}
                        </span>
                    )}
                </div>

                <p className="mt-2 text-[10px] leading-4 text-slate-500">
                    Final pricing will be calculated using the current laundry
                    service prices.
                </p>
            </div>

            {/* CHECKOUT */}
            <button
                type="button"
                className="mt-3 w-full rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.99]"
                onClick={() => {
                    window.location.href = "/cart/checkout";
                }}
            >
                Continue to checkout
            </button>

            {/* ADD SERVICE */}
            <Link
                href="/services"
                className="mt-3 block text-center text-xs font-semibold text-brand-blue-deep hover:underline"
            >
                ← Add another service
            </Link>
        </section>
    );
}

/* ========================================================================== */
/* ITEM ROW                                                                   */
/* ========================================================================== */

function CartItemRow({
    item,
    updateQuantity,
    removeItem,
}: {
    item: {
        serviceCatalogItemId: string;
        articleName: string;
        price: number;
        quantity: number;
    };
    updateQuantity: (
        serviceCatalogItemId: string,
        quantity: number,
    ) => void;
    removeItem: (serviceCatalogItemId: string) => void;
}) {
    return (
        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2">
            {/* ARTICLE */}
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">
                    {item.articleName}
                </p>

                <p className="text-[10px] text-slate-400">
                    {item.price > 0
                        ? `₹${item.price.toFixed(2)} / piece`
                        : "Price pending"}
                </p>
            </div>

            {/* QUANTITY */}
            <div className="flex shrink-0 items-center gap-1">
                <button
                    type="button"
                    onClick={() =>
                        updateQuantity(
                            item.serviceCatalogItemId,
                            item.quantity - 1,
                        )
                    }
                    className="flex size-6 items-center justify-center rounded-md border border-slate-200 text-xs text-slate-700 transition hover:border-brand-blue-deep hover:text-brand-blue-deep"
                >
                    −
                </button>

                <span className="w-5 text-center text-xs font-bold text-slate-800">
                    {item.quantity}
                </span>

                <button
                    type="button"
                    onClick={() =>
                        updateQuantity(
                            item.serviceCatalogItemId,
                            item.quantity + 1,
                        )
                    }
                    className="flex size-6 items-center justify-center rounded-md bg-brand-blue-deep text-xs text-white transition hover:opacity-90"
                >
                    +
                </button>
            </div>

            {/* ITEM TOTAL */}
            <div className="hidden w-14 text-right md:block">
                {item.price > 0 ? (
                    <p className="text-xs font-bold text-slate-900">
                        ₹{(item.price * item.quantity).toFixed(0)}
                    </p>
                ) : (
                    <p className="text-[10px] font-semibold text-slate-400">
                        Pending
                    </p>
                )}
            </div>

            {/* REMOVE */}
            <button
                type="button"
                onClick={() =>
                    removeItem(item.serviceCatalogItemId)
                }
                className="ml-1 text-[10px] font-medium text-red-500 hover:underline"
            >
                Remove
            </button>
        </div>
    );
}
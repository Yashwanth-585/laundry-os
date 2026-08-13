"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
    useCart,
    type CartItem,
} from "@/context/CartContext";

type CatalogItem = {
    id: string;
    catalogItemId: string;
    name: string;
    category: string;
    price: number;
};

type ServiceCatalogProps = {
    service: {
        id: string;
        name: string;
    };
    items: CatalogItem[];
};

const categoryOrder = [
    "Men",
    "Women",
    "Kids",
    "Household",
];

export default function ServiceCatalog({
    service,
    items,
}: ServiceCatalogProps) {
    const router = useRouter();

    const {
        items: cartItems,
        addItems,
    } = useCart();

    /* ---------------------------------------------------------------------- */
    /* CATEGORIES                                                            */
    /* ---------------------------------------------------------------------- */

    const availableCategories = useMemo(() => {
        const categories = [
            ...new Set(
                items.map((item) => item.category),
            ),
        ];

        return [
            ...categoryOrder.filter((category) =>
                categories.includes(category),
            ),
            ...categories.filter(
                (category) =>
                    !categoryOrder.includes(category),
            ),
        ];
    }, [items]);

    const [selectedCategory, setSelectedCategory] =
        useState(
            availableCategories[0] ?? "",
        );

    const [search, setSearch] = useState("");

    /* ---------------------------------------------------------------------- */
    /* QUANTITIES                                                             */
    /* ---------------------------------------------------------------------- */

    const [quantities, setQuantities] = useState<
        Record<string, number>
    >({});

    /*
     * Load existing quantities from the cart whenever
     * this service/catalog is opened.
     *
     * This is what makes:
     *
     * Cart → Add another service → Service
     *
     * show the previously selected quantities.
     */
    useEffect(() => {
        const existingQuantities: Record<
            string,
            number
        > = {};

        for (const cartItem of cartItems) {
            /*
             * Only restore quantities belonging to
             * the current service.
             */
            if (
                cartItem.serviceId === service.id &&
                cartItem.quantity > 0
            ) {
                existingQuantities[
                    cartItem.serviceCatalogItemId
                ] = cartItem.quantity;
            }
        }

        setQuantities(existingQuantities);
    }, [cartItems, service.id]);

    /* ---------------------------------------------------------------------- */
    /* FILTERED ITEMS                                                         */
    /* ---------------------------------------------------------------------- */

    const filteredItems = useMemo(() => {
        const query = search
            .trim()
            .toLowerCase();

        return items.filter((item) => {
            const matchesCategory =
                item.category === selectedCategory;

            const matchesSearch =
                !query ||
                item.name
                    .toLowerCase()
                    .includes(query);

            return (
                matchesCategory &&
                matchesSearch
            );
        });
    }, [
        items,
        selectedCategory,
        search,
    ]);

    /* ---------------------------------------------------------------------- */
    /* UPDATE QUANTITY                                                        */
    /* ---------------------------------------------------------------------- */

    const updateQuantity = (
        itemId: string,
        change: number,
    ) => {
        setQuantities((current) => {
            const currentQuantity =
                current[itemId] ?? 0;

            const nextQuantity = Math.max(
                0,
                currentQuantity + change,
            );

            const updated = {
                ...current,
            };

            if (nextQuantity === 0) {
                delete updated[itemId];
            } else {
                updated[itemId] =
                    nextQuantity;
            }

            return updated;
        });
    };

    /* ---------------------------------------------------------------------- */
    /* SELECTED ITEMS                                                         */
    /* ---------------------------------------------------------------------- */

    const selectedItems = items.filter(
        (item) =>
            (quantities[item.id] ?? 0) > 0,
    );

    const totalPieces =
        selectedItems.reduce(
            (total, item) =>
                total +
                (quantities[item.id] ?? 0),
            0,
        );

    const pricedItems =
        selectedItems.filter(
            (item) => item.price > 0,
        );

    const estimatedTotal =
        pricedItems.reduce(
            (total, item) =>
                total +
                item.price *
                (quantities[item.id] ?? 0),
            0,
        );

    const hasUnpricedItems =
        selectedItems.some(
            (item) => item.price <= 0,
        );

    /* ---------------------------------------------------------------------- */
    /* ADD TO ORDER                                                           */
    /* ---------------------------------------------------------------------- */

    const handleAddToOrder = () => {
        if (
            selectedItems.length === 0
        ) {
            return;
        }

        const cartItems: CartItem[] =
            selectedItems.map((item) => ({
                serviceId: service.id,
                serviceName: service.name,
                serviceCatalogItemId:
                    item.id,
                catalogItemId:
                    item.catalogItemId,
                articleName: item.name,
                category: item.category,
                price: item.price,
                quantity:
                    quantities[item.id],
            }));

        /*
         * CartContext handles merging these
         * with existing cart items.
         */
        addItems(cartItems);

        router.push("/cart");
    };

    /* ---------------------------------------------------------------------- */
    /* UI                                                                     */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* ============================================================= */}
            {/* LEFT — SERVICE CATALOG                                        */}
            {/* ============================================================= */}

            <div className="min-w-0">
                {/* SEARCH */}
                <div>
                    <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            🔍
                        </span>

                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value,
                                )
                            }
                            placeholder="Search articles..."
                            className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/10"
                        />
                    </div>
                </div>

                {/* CATEGORY SELECTOR */}
                <div className="mt-5">
                    <p className="mb-3 text-sm font-bold text-slate-900">
                        Select category
                    </p>

                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {availableCategories.map(
                            (category) => (
                                <button
                                    key={category}
                                    type="button"
                                    onClick={() => {
                                        setSelectedCategory(
                                            category,
                                        );
                                        setSearch("");
                                    }}
                                    className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition ${selectedCategory ===
                                            category
                                            ? "bg-brand-navy text-white shadow-sm"
                                            : "border border-slate-200 bg-white text-slate-600 hover:border-brand-blue-deep hover:text-brand-blue-deep"
                                        }`}
                                >
                                    {category}
                                </button>
                            ),
                        )}
                    </div>
                </div>

                {/* ITEM COUNT */}
                <div className="mt-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            {selectedCategory}
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            {
                                filteredItems.length
                            }{" "}
                            {filteredItems.length ===
                                1
                                ? "article"
                                : "articles"}
                        </p>
                    </div>
                </div>

                {/* ITEMS */}
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {filteredItems.length ===
                        0 ? (
                        <div className="p-10 text-center">
                            <p className="text-sm font-semibold text-slate-700">
                                No articles found
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Try a different
                                search term.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredItems.map(
                                (item) => {
                                    const quantity =
                                        quantities[
                                        item.id
                                        ] ?? 0;

                                    return (
                                        <div
                                            key={
                                                item.id
                                            }
                                            className="flex items-center justify-between gap-4 p-4 sm:px-5"
                                        >
                                            {/* ITEM INFORMATION */}
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-semibold text-slate-900">
                                                    {
                                                        item.name
                                                    }
                                                </h3>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    {item.price >
                                                        0
                                                        ? `₹${item.price.toFixed(
                                                            2,
                                                        )} / piece`
                                                        : "Price will be set by the laundry"}
                                                </p>
                                            </div>

                                            {/* QUANTITY */}
                                            <div className="flex shrink-0 items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.id,
                                                            -1,
                                                        )
                                                    }
                                                    disabled={
                                                        quantity ===
                                                        0
                                                    }
                                                    aria-label={`Remove one ${item.name}`}
                                                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-medium text-slate-700 transition hover:border-brand-blue-deep hover:text-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    −
                                                </button>

                                                <span className="w-7 text-center text-sm font-bold text-slate-900">
                                                    {
                                                        quantity
                                                    }
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.id,
                                                            1,
                                                        )
                                                    }
                                                    aria-label={`Add one ${item.name}`}
                                                    className="flex size-9 items-center justify-center rounded-lg bg-brand-blue-deep text-lg font-medium text-white transition hover:opacity-90"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    );
                                },
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ============================================================= */}
            {/* RIGHT — ORDER SUMMARY                                         */}
            {/* ============================================================= */}

            <aside className="lg:sticky lg:top-6 lg:self-start">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                                Your selection
                            </p>

                            <h2 className="mt-1 text-xl font-extrabold text-brand-navy">
                                Order summary
                            </h2>
                        </div>

                        {totalPieces >
                            0 && (
                                <div className="rounded-full bg-brand-navy px-3 py-1 text-xs font-bold text-white">
                                    {
                                        totalPieces
                                    }{" "}
                                    {totalPieces ===
                                        1
                                        ? "piece"
                                        : "pieces"}
                                </div>
                            )}
                    </div>

                    {selectedItems.length ===
                        0 ? (
                        <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                            <div className="text-2xl">
                                🧺
                            </div>

                            <p className="mt-2 text-sm font-semibold text-slate-700">
                                No items selected
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                Use the +
                                buttons to add
                                items to your
                                order.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* SELECTED ITEMS */}
                            <div className="mt-6 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                                {selectedItems.map(
                                    (item) => (
                                        <div
                                            key={
                                                item.id
                                            }
                                            className="rounded-xl bg-slate-50 p-3"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-slate-900">
                                                        {
                                                            item.name
                                                        }
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {
                                                            quantities[
                                                            item
                                                                .id
                                                            ]
                                                        }{" "}
                                                        ×{" "}
                                                        {item.price >
                                                            0
                                                            ? `₹${item.price.toFixed(
                                                                2,
                                                            )}`
                                                            : "Price pending"}
                                                    </p>
                                                </div>

                                                <p className="shrink-0 text-sm font-bold text-slate-900">
                                                    {item.price >
                                                        0
                                                        ? `₹${(
                                                            item.price *
                                                            quantities[
                                                            item
                                                                .id
                                                            ]
                                                        ).toFixed(
                                                            2,
                                                        )}`
                                                        : "Pending"}
                                                </p>
                                            </div>

                                            {/* QUICK QUANTITY CONTROLS */}
                                            <div className="mt-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.id,
                                                                -1,
                                                            )
                                                        }
                                                        className="flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white text-sm text-slate-700 hover:border-brand-blue-deep"
                                                    >
                                                        −
                                                    </button>

                                                    <span className="w-5 text-center text-xs font-bold">
                                                        {
                                                            quantities[
                                                            item
                                                                .id
                                                            ]
                                                        }
                                                    </span>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.id,
                                                                1,
                                                            )
                                                        }
                                                        className="flex size-7 items-center justify-center rounded-md bg-brand-blue-deep text-sm text-white hover:opacity-90"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.id,
                                                            -(
                                                                quantities[
                                                                item
                                                                    .id
                                                                ] ??
                                                                0
                                                            ),
                                                        )
                                                    }
                                                    className="text-xs font-medium text-red-500 hover:underline"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>

                            {/* TOTAL */}
                            <div className="mt-5 border-t border-slate-100 pt-5">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-600">
                                        Estimated total
                                    </span>

                                    {hasUnpricedItems ? (
                                        <span className="text-base font-extrabold text-slate-700">
                                            Price pending
                                        </span>
                                    ) : (
                                        <span className="text-xl font-extrabold text-brand-navy">
                                            ₹
                                            {estimatedTotal.toFixed(
                                                2,
                                            )}
                                        </span>
                                    )}
                                </div>

                                {hasUnpricedItems && (
                                    <p className="mt-2 text-xs leading-5 text-slate-500">
                                        Some items don't
                                        have a price yet.
                                        Final pricing will
                                        be confirmed by
                                        the laundry.
                                    </p>
                                )}
                            </div>

                            {/* ADD TO ORDER */}
                            <button
                                type="button"
                                onClick={
                                    handleAddToOrder
                                }
                                className="mt-5 w-full rounded-xl bg-brand-navy px-5 py-3.5 text-sm font-bold text-white transition hover:opacity-95 active:scale-[0.99]"
                            >
                                Add to order
                            </button>

                            <p className="mt-3 text-center text-xs text-slate-400">
                                You can review and edit
                                your order before
                                checkout.
                            </p>
                        </>
                    )}
                </div>
            </aside>
        </div>
    );
}
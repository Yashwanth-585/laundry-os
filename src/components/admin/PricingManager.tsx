"use client";

import { useMemo, useState } from "react";

type CatalogItem = {
    id: string;
    category: string;
    name: string;
    price: number | string;
    is_active: boolean;
};

type Props = {
    items: CatalogItem[];
};

export default function PricingManager({ items }: Props) {
    const [prices, setPrices] = useState<Record<string, string>>(
        Object.fromEntries(
            items.map((item) => [
                item.id,
                Number(item.price ?? 0).toFixed(2),
            ]),
        ),
    );

    const [savingId, setSavingId] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const categories = useMemo(() => {
        return [...new Set(items.map((item) => item.category))];
    }, [items]);

    async function savePrice(item: CatalogItem) {
        setMessage(null);
        setError(null);

        const rawPrice = prices[item.id];

        const price = Number(rawPrice);

        if (!Number.isFinite(price) || price < 0) {
            setError(`Invalid price for ${item.name}.`);
            return;
        }

        setSavingId(item.id);

        try {
            const response = await fetch("/api/admin/catalog-items", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: item.id,
                    price,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to update price.");
            }

            setMessage(`${item.name} price updated successfully.`);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to update price.",
            );
        } finally {
            setSavingId(null);
        }
    }

    return (
        <div>
            {/* Summary */}
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Services
                    </p>

                    <p className="mt-2 text-3xl font-extrabold text-brand-navy">
                        {items.length}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Categories
                    </p>

                    <p className="mt-2 text-3xl font-extrabold text-brand-navy">
                        {categories.length}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Active Services
                    </p>

                    <p className="mt-2 text-3xl font-extrabold text-emerald-600">
                        {items.filter((item) => item.is_active).length}
                    </p>
                </div>
            </div>

            {/* Messages */}
            {message && (
                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    {message}
                </div>
            )}

            {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            {/* Categories */}
            <div className="space-y-6">
                {categories.map((category) => {
                    const categoryItems = items.filter(
                        (item) => item.category === category,
                    );

                    return (
                        <section
                            key={category}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-900">
                                        {category}
                                    </h2>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {categoryItems.length} services
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[650px] text-left">
                                    <thead className="border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                Service
                                            </th>

                                            <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                Status
                                            </th>

                                            <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                Price
                                            </th>

                                            <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {categoryItems.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="transition hover:bg-slate-50"
                                            >
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-bold text-slate-900">
                                                        {item.name}
                                                    </p>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${item.is_active
                                                                ? "bg-emerald-50 text-emerald-700"
                                                                : "bg-slate-100 text-slate-500"
                                                            }`}
                                                    >
                                                        {item.is_active
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-500">
                                                            ₹
                                                        </span>

                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={
                                                                prices[item.id] ??
                                                                "0.00"
                                                            }
                                                            onChange={(e) =>
                                                                setPrices(
                                                                    (current) => ({
                                                                        ...current,
                                                                        [item.id]:
                                                                            e.target
                                                                                .value,
                                                                    }),
                                                                )
                                                            }
                                                            className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none transition focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/10"
                                                        />
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            savePrice(item)
                                                        }
                                                        disabled={
                                                            savingId === item.id
                                                        }
                                                        className="rounded-lg bg-brand-blue-deep px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {savingId === item.id
                                                            ? "Saving..."
                                                            : "Save"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
"use client";

import { useState, useTransition } from "react";

import { adminSetCreditPercentageAction } from "@/app/actions/credits";

export default function CreditsSettings({ initialPercentage }: { initialPercentage: number }) {
    const [value, setValue] = useState(String(initialPercentage));
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [isPending, startTransition] = useTransition();

    function save() {
        const percentage = Number(value);

        if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
            setIsError(true);
            setMessage("Enter a percentage between 0 and 100.");
            return;
        }

        startTransition(async () => {
            const result = await adminSetCreditPercentageAction(percentage);

            setIsError(!result.success);
            setMessage(
                result.success
                    ? "Credit percentage updated."
                    : result.error ?? "Unable to update.",
            );
        });
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                Laundry Coins
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-brand-navy">Credit percentage</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Customers earn this percentage of an order's total as credits, credited only
                after the order is successfully delivered. Credits expire 45 days after being
                issued.
            </p>

            <div className="mt-5 flex items-end gap-3">
                <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Percentage
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                        <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={value}
                            onChange={(event) => setValue(event.target.value)}
                            className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-brand-blue-deep"
                        />
                        <span className="text-sm font-bold text-slate-500">%</span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={save}
                    disabled={isPending}
                    className="rounded-xl bg-brand-navy px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-blue-deep disabled:opacity-50"
                >
                    {isPending ? "Saving..." : "Save"}
                </button>
            </div>

            {message && (
                <p
                    className={`mt-3 text-sm font-semibold ${
                        isError ? "text-red-600" : "text-emerald-600"
                    }`}
                >
                    {message}
                </p>
            )}
        </div>
    );
}

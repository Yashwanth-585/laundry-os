"use client";

import { useState, useTransition } from "react";

import { markCodCollectedAction } from "@/app/actions/cod-collection";

export default function CodCollectionButton({
    taskId,
    amount,
}: {
    taskId: string;
    amount: number;
}) {
    const [collected, setCollected] = useState(false);
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();

    function confirm() {
        setError("");

        startTransition(async () => {
            const result = await markCodCollectedAction(taskId);

            if (!result.success) {
                setError(result.error ?? "Unable to confirm collection.");
                return;
            }

            setCollected(true);
        });
    }

    if (collected) {
        return (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                Cash collected ✓ — you can now verify the delivery below.
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-800">
                Cash on Delivery — collect ₹{amount.toFixed(2)}
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-700">
                Confirm you've collected the cash before completing this delivery.
            </p>

            {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}

            <button
                type="button"
                onClick={confirm}
                disabled={isPending}
                className="mt-3 rounded-lg bg-brand-navy px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-blue-deep disabled:opacity-50"
            >
                {isPending ? "Confirming..." : "Confirm cash collected"}
            </button>
        </div>
    );
}

"use client";

import { useState, useTransition } from "react";

import { advanceOrderStatus } from "./actions";

const actionLabels: Record<string, string> = {
    PICKED_UP: "Move to Facility",
    AT_FACILITY: "Start Processing",
    IN_PROCESS: "Mark Ready",
};

type StaffOrderActionsProps = {
    orderId: string;
    status: string;
};

export default function StaffOrderActions({
    orderId,
    status,
}: StaffOrderActionsProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const label = actionLabels[status];

    // READY (or any status outside the facility workflow) has no
    // staff-triggered next step.
    if (!label) {
        return null;
    }

    const handleClick = () => {
        setError(null);

        startTransition(async () => {
            const result = await advanceOrderStatus(orderId, status);

            if (!result.success) {
                setError(result.error);
            }
        });
    };

    return (
        <div className="flex flex-col items-end gap-1.5">
            <button
                type="button"
                onClick={handleClick}
                disabled={isPending}
                className="rounded-lg bg-brand-navy px-4 py-2.5 text-xs font-bold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isPending ? "Updating…" : label}
            </button>

            {error ? (
                <p className="max-w-[180px] text-right text-[11px] font-medium text-red-600">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
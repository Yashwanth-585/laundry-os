"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { startPickupTaskAction } from "@/app/actions/delivery-task";

export function StartPickupButton({
    taskId,
}: {
    taskId: string;
}) {
    const router = useRouter();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleStart() {
        setIsSubmitting(true);
        setError(null);

        const result = await startPickupTaskAction(taskId);

        if (!result.success) {
            setError(result.error ?? "Unable to start pickup.");
            setIsSubmitting(false);
            return;
        }

        router.refresh();
    }

    return (
        <div>
            <button
                type="button"
                onClick={handleStart}
                disabled={isSubmitting}
                className="w-full rounded-lg bg-brand-navy px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
                {isSubmitting ? "Starting..." : "Start Pickup"}
            </button>

            {error ? (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
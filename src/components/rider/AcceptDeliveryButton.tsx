"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { acceptDeliveryTaskAction } from "@/app/actions/delivery-task";

export function AcceptDeliveryButton({
    taskId,
}: {
    taskId: string;
}) {
    const router = useRouter();

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    async function handleAccept() {
        setIsSubmitting(true);
        setError(null);

        const result =
            await acceptDeliveryTaskAction(taskId);

        if (!result.success) {
            setError(
                result.error ??
                "Unable to accept delivery.",
            );

            setIsSubmitting(false);
            return;
        }

        router.refresh();
    }

    return (
        <div>
            <button
                type="button"
                onClick={handleAccept}
                disabled={isSubmitting}
                className="w-full rounded-lg bg-brand-navy px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
                {isSubmitting
                    ? "Accepting..."
                    : "Accept Delivery"}
            </button>

            {error ? (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
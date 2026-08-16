"use client";

import { useState, useTransition } from "react";

import { toggleRiderAvailabilityAction } from "@/app/actions/delivery-task";

interface AvailabilityToggleProps {
    initialAvailability: boolean;
}

export default function AvailabilityToggle({
    initialAvailability,
}: AvailabilityToggleProps) {
    const [isAvailable, setIsAvailable] =
        useState<boolean>(initialAvailability);

    const [message, setMessage] = useState<string>("");
    const [isPending, startTransition] = useTransition();

    function handleToggle() {
        setMessage("");

        startTransition(async () => {
            const result = await toggleRiderAvailabilityAction();

            if (!result.success) {
                setMessage(result.error ?? "Unable to update availability.");
                return;
            }

            setIsAvailable(result.isAvailable ?? false);
            setMessage(
                result.message ??
                (result.isAvailable
                    ? "You are now available."
                    : "You are now unavailable."),
            );
        });
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-4">
                <div>
                    <p className="text-xs text-slate-400">
                        Availability
                    </p>

                    <p
                        className={`mt-1 text-sm font-bold ${isAvailable
                            ? "text-emerald-600"
                            : "text-slate-500"
                            }`}
                    >
                        {isAvailable ? "Available" : "Unavailable"}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleToggle}
                    disabled={isPending}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${isAvailable
                        ? "bg-emerald-500"
                        : "bg-slate-300"
                        } ${isPending
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer"
                        }`}
                    aria-label={
                        isAvailable
                            ? "Set availability to unavailable"
                            : "Set availability to available"
                    }
                >
                    <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${isAvailable
                            ? "translate-x-6"
                            : "translate-x-1"
                            }`}
                    />
                </button>
            </div>

            {message && (
                <p className="mt-2 text-xs text-slate-500">
                    {message}
                </p>
            )}
        </div>
    );
}
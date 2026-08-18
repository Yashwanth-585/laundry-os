"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { verifyDeliveryOtpAction } from "@/app/actions/delivery-task";

export function VerifyDeliveryOtp({
    taskId,
}: {
    taskId: string;
}) {
    const router = useRouter();

    const [otp, setOtp] = useState("");

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    async function handleVerify() {
        const trimmedOtp = otp.trim();

        if (!trimmedOtp) {
            setError(
                "Please enter the delivery OTP.",
            );
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const result =
            await verifyDeliveryOtpAction(
                taskId,
                trimmedOtp,
            );

        if (!result.success) {
            setError(
                result.error ??
                "Unable to verify delivery OTP.",
            );

            setIsSubmitting(false);
            return;
        }

        router.refresh();
    }

    return (
        <div className="max-w-sm">
            <label
                htmlFor="delivery-otp"
                className="text-xs font-bold uppercase tracking-wider text-slate-400"
            >
                Customer delivery OTP
            </label>

            <input
                id="delivery-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(event) =>
                    setOtp(
                        event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6),
                    )
                }
                placeholder="Enter OTP"
                disabled={isSubmitting}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-lg font-bold tracking-[0.35em] text-slate-900 outline-none transition focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/20"
            />

            <button
                type="button"
                onClick={handleVerify}
                disabled={
                    isSubmitting ||
                    otp.length === 0
                }
                className="mt-3 w-full rounded-lg bg-brand-navy px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isSubmitting
                    ? "Verifying..."
                    : "Verify Delivery OTP"}
            </button>

            {error ? (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
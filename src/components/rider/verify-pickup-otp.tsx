"use client";

import { useRef, useState, useTransition } from "react";
import { verifyPickupOtpAction } from "@/app/actions/delivery-task";

type Props = {
    taskId: string;
};

export function VerifyPickupOtp({ taskId }: Props) {
    const [otp, setOtp] = useState("");
    const [itemCount, setItemCount] = useState("");
    const [weight, setWeight] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isPending, startTransition] = useTransition();

    function handleFiles(
        event: React.ChangeEvent<HTMLInputElement>,
    ) {
        const selectedFiles = Array.from(
            event.target.files ?? [],
        );

        setFiles(selectedFiles);
    }

    function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setMessage("");
        setSuccess(false);

        const cleanOtp = otp.trim();

        if (!/^\d{6}$/.test(cleanOtp)) {
            setMessage("Enter a valid 6-digit OTP.");
            return;
        }

        const count = Number(itemCount);

        if (
            !Number.isInteger(count) ||
            count <= 0
        ) {
            setMessage(
                "Enter the actual number of items received.",
            );
            return;
        }

        const actualWeight = Number(weight);

        if (
            !Number.isFinite(actualWeight) ||
            actualWeight <= 0
        ) {
            setMessage(
                "Enter a valid actual weight.",
            );
            return;
        }

        if (files.length === 0) {
            setMessage(
                "Upload at least one photo of the collected items.",
            );
            return;
        }

        if (files.length > 5) {
            setMessage(
                "You can upload a maximum of 5 photos.",
            );
            return;
        }

        for (const file of files) {
            if (!file.type.startsWith("image/")) {
                setMessage(
                    "Only image files are allowed.",
                );
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                setMessage(
                    "Each image must be smaller than 5 MB.",
                );
                return;
            }
        }

        startTransition(async () => {
            const formData = new FormData();

            formData.append("taskId", taskId);
            formData.append("otp", cleanOtp);
            formData.append(
                "actualItemCount",
                String(count),
            );
            formData.append(
                "actualWeight",
                String(actualWeight),
            );

            for (const file of files) {
                formData.append("photos", file);
            }

            const result =
                await verifyPickupOtpAction(formData);

            if (!result.success) {
                setMessage(
                    result.error ??
                    "Unable to verify the pickup.",
                );
                return;
            }

            setSuccess(true);

            setMessage(
                result.message ??
                "Pickup verified successfully.",
            );

            window.location.href = "/rider";
        });
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-5"
        >
            {/* OTP */}
            <div>
                <label
                    htmlFor="pickup-otp"
                    className="text-xs font-bold uppercase tracking-wide text-slate-400"
                >
                    Pickup OTP
                </label>

                <input
                    id="pickup-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(event) =>
                        setOtp(
                            event.target.value
                                .replace(/\D/g, "")
                                .slice(0, 6),
                        )
                    }
                    placeholder="Enter 6-digit OTP"
                    disabled={isPending}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-bold tracking-[0.35em] text-slate-900 outline-none transition focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/10"
                />
            </div>

            {/* ITEM COUNT */}
            <div>
                <label
                    htmlFor="actual-item-count"
                    className="text-xs font-bold uppercase tracking-wide text-slate-400"
                >
                    Actual item count
                </label>

                <input
                    id="actual-item-count"
                    type="number"
                    min={1}
                    step={1}
                    value={itemCount}
                    onChange={(event) =>
                        setItemCount(event.target.value)
                    }
                    placeholder="e.g. 7"
                    disabled={isPending}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/10"
                />

                <p className="mt-1 text-xs text-slate-400">
                    Count the actual pieces collected from
                    the customer.
                </p>
            </div>

            {/* WEIGHT */}
            <div>
                <label
                    htmlFor="actual-weight"
                    className="text-xs font-bold uppercase tracking-wide text-slate-400"
                >
                    Actual weight
                </label>

                <div className="mt-2 flex">
                    <input
                        id="actual-weight"
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={weight}
                        onChange={(event) =>
                            setWeight(event.target.value)
                        }
                        placeholder="e.g. 3.50"
                        disabled={isPending}
                        className="w-full rounded-l-xl border border-r-0 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/10"
                    />

                    <span className="flex items-center rounded-r-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-500">
                        kg
                    </span>
                </div>
            </div>

            {/* PHOTOS */}
            <div>
                <label
                    htmlFor="pickup-photos"
                    className="text-xs font-bold uppercase tracking-wide text-slate-400"
                >
                    Item photos
                </label>

                <input
                    ref={fileInputRef}
                    id="pickup-photos"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleFiles}
                    disabled={isPending}
                    className="mt-2 block w-full cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-navy file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"
                />

                <p className="mt-1 text-xs text-slate-400">
                    Upload 1–5 clear photos of the collected
                    laundry.
                </p>

                {files.length > 0 && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold text-slate-700">
                            {files.length}{" "}
                            {files.length === 1
                                ? "photo"
                                : "photos"}{" "}
                            selected
                        </p>

                        <div className="mt-2 space-y-1">
                            {files.map((file) => (
                                <p
                                    key={`${file.name}-${file.size}`}
                                    className="truncate text-xs text-slate-500"
                                >
                                    {file.name}
                                </p>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* SUBMIT */}
            <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-brand-navy px-5 py-3.5 text-sm font-bold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isPending
                    ? "Verifying pickup..."
                    : "Verify OTP & Complete Pickup"}
            </button>

            {message && (
                <div
                    className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                        success
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                    }`}
                >
                    {message}
                </div>
            )}
        </form>
    );
}
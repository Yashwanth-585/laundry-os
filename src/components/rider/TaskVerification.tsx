"use client";

import { useRef, useState, useTransition } from "react";

import {
    uploadDeliveryTaskPhotosAction,
    verifyPickupOtpAction,
    verifyDeliveryOtpAction,
} from "@/app/actions/delivery-task";

type TaskVerificationProps = {
    taskId: string;
    taskType: "PICKUP" | "DROP";
};

export default function TaskVerification({
    taskId,
    taskType,
}: TaskVerificationProps) {
    const fileInputRef =
        useRef<HTMLInputElement>(null);

    const [files, setFiles] =
        useState<File[]>([]);

    const [otp, setOtp] =
        useState("");

    const [message, setMessage] =
        useState("");

    const [isError, setIsError] =
        useState(false);

    const [uploaded, setUploaded] =
        useState(false);

    const [
        isUploading,
        startUploadTransition,
    ] = useTransition();

    const [
        isVerifying,
        startVerifyTransition,
    ] = useTransition();

    const isPickup =
        taskType === "PICKUP";

    function handleFiles(
        event: React.ChangeEvent<HTMLInputElement>,
    ) {
        const selected = Array.from(
            event.target.files ?? [],
        );

        if (selected.length === 0) {
            return;
        }

        if (selected.length > 5) {
            setMessage(
                "You can select a maximum of 5 photos.",
            );
            setIsError(true);
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        const invalidType =
            selected.some(
                (file) =>
                    !allowedTypes.includes(
                        file.type,
                    ),
            );

        if (invalidType) {
            setMessage(
                "Only JPG, PNG, and WebP images are allowed.",
            );
            setIsError(true);
            return;
        }

        const tooLarge =
            selected.some(
                (file) =>
                    file.size >
                    8 * 1024 * 1024,
            );

        if (tooLarge) {
            setMessage(
                "Each photo must be smaller than 8 MB.",
            );
            setIsError(true);
            return;
        }

        setFiles(selected);
        setMessage("");
        setIsError(false);
        setUploaded(false);
    }

    function uploadPhotos() {
        if (files.length === 0) {
            setMessage(
                "Please select at least one photo.",
            );
            setIsError(true);
            return;
        }

        const formData = new FormData();

        for (const file of files) {
            formData.append(
                "photos",
                file,
            );
        }

        setMessage("");
        setIsError(false);

        startUploadTransition(async () => {
            const result =
                await uploadDeliveryTaskPhotosAction(
                    taskId,
                    formData,
                );

            if (!result.success) {
                setMessage(
                    result.error ??
                        "Unable to upload photos.",
                );
                setIsError(true);
                return;
            }

            setUploaded(true);

            setMessage(
                `${result.urls?.length ?? files.length} verification photo${
                    (result.urls?.length ?? files.length) === 1
                        ? ""
                        : "s"
                } uploaded successfully.`,
            );

            setIsError(false);
        });
    }

    function verifyOtp() {
        const cleanOtp =
            otp.trim();

        if (!uploaded) {
            setMessage(
                "Upload at least one verification photo first.",
            );
            setIsError(true);
            return;
        }

        if (!/^\d{6}$/.test(cleanOtp)) {
            setMessage(
                "Enter a valid 6-digit OTP.",
            );
            setIsError(true);
            return;
        }

        setMessage("");
        setIsError(false);

        startVerifyTransition(async () => {
            const result =
                isPickup
                    ? await verifyPickupOtpAction(
                          taskId,
                          cleanOtp,
                      )
                    : await verifyDeliveryOtpAction(
                          taskId,
                          cleanOtp,
                      );

            if (!result.success) {
                setMessage(
                    result.error ??
                        "Unable to verify the task.",
                );
                setIsError(true);
                return;
            }

            setMessage(
                result.message ??
                    "Verification completed successfully.",
            );

            setIsError(false);

            window.location.reload();
        });
    }

    return (
        <div className="space-y-6">
            {/* ======================================================
                PHOTO VERIFICATION
            ====================================================== */}

            <div>
                <p className="text-sm font-bold text-slate-900">
                    {isPickup
                        ? "Pickup verification photo"
                        : "Delivery verification photo"}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                    {isPickup
                        ? "Take a clear photo of the laundry/items at pickup before completing the handover."
                        : "Take a clear photo showing the completed delivery before completing the handover."}
                </p>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    capture="environment"
                    onChange={handleFiles}
                    className="sr-only"
                />

                <button
                    type="button"
                    onClick={() =>
                        fileInputRef.current?.click()
                    }
                    disabled={
                        isUploading ||
                        isVerifying
                    }
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-bold text-slate-700 transition hover:border-brand-blue-deep hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <span className="text-xl">
                        📷
                    </span>

                    {files.length > 0
                        ? `${files.length} photo${
                              files.length === 1
                                  ? ""
                                  : "s"
                          } selected`
                        : "Take / Select verification photos"}
                </button>

                {files.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {files.map(
                            (
                                file,
                                index,
                            ) => (
                                <div
                                    key={`${file.name}-${index}`}
                                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                                >
                                    <p className="truncate text-xs font-medium text-slate-700">
                                        {file.name}
                                    </p>

                                    <p className="ml-3 shrink-0 text-[11px] text-slate-400">
                                        {(
                                            file.size /
                                            1024 /
                                            1024
                                        ).toFixed(
                                            1,
                                        )}{" "}
                                        MB
                                    </p>
                                </div>
                            ),
                        )}
                    </div>
                )}

                <button
                    type="button"
                    onClick={uploadPhotos}
                    disabled={
                        files.length === 0 ||
                        isUploading ||
                        isVerifying ||
                        uploaded
                    }
                    className="mt-3 w-full rounded-xl bg-brand-blue-deep px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isUploading
                        ? "Uploading photos..."
                        : uploaded
                            ? "Photos uploaded ✓"
                            : "Upload verification photos"}
                </button>
            </div>

            {/* ======================================================
                OTP
            ====================================================== */}

            <div className="border-t border-slate-100 pt-5">
                <p className="text-sm font-bold text-slate-900">
                    {isPickup
                        ? "Pickup OTP"
                        : "Delivery OTP"}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                    Ask the customer for the 6-digit OTP.
                </p>

                <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(event) =>
                        setOtp(
                            event.target.value.replace(
                                /\D/g,
                                "",
                            ),
                        )
                    }
                    placeholder="Enter 6-digit OTP"
                    disabled={
                        !uploaded ||
                        isUploading ||
                        isVerifying
                    }
                    className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-extrabold tracking-[0.35em] text-slate-900 outline-none focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/10 disabled:bg-slate-50"
                />

                <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={
                        !uploaded ||
                        otp.length !== 6 ||
                        isUploading ||
                        isVerifying
                    }
                    className="mt-3 w-full rounded-xl bg-brand-navy px-5 py-3.5 text-sm font-bold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isVerifying
                        ? "Verifying..."
                        : isPickup
                            ? "Verify Pickup"
                            : "Verify Delivery"}
                </button>
            </div>

            {message && (
                <div
                    className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                        isError
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                    }`}
                >
                    {message}
                </div>
            )}
        </div>
    );
}
"use client";

import { useState, useTransition } from "react";
import { updateOrderStatusAction } from "@/app/actions/oder-status";

type OrderStatus =
    | "PLACED"
    | "PICKUP_ASSIGNED"
    | "OUT_FOR_PICKUP"
    | "PICKED_UP"
    | "AT_FACILITY"
    | "IN_PROCESS"
    | "READY"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED"
    | "ON_HOLD"
    | "RETURNED";

const transitions: Record<OrderStatus, OrderStatus[]> = {
    PLACED: ["PICKUP_ASSIGNED", "CANCELLED", "ON_HOLD"],
    PICKUP_ASSIGNED: ["OUT_FOR_PICKUP", "CANCELLED", "ON_HOLD"],
    OUT_FOR_PICKUP: ["PICKED_UP", "ON_HOLD", "RETURNED"],
    PICKED_UP: ["AT_FACILITY", "ON_HOLD", "RETURNED"],
    AT_FACILITY: ["IN_PROCESS", "ON_HOLD"],
    IN_PROCESS: ["READY", "ON_HOLD"],
    READY: ["OUT_FOR_DELIVERY", "ON_HOLD"],
    OUT_FOR_DELIVERY: ["DELIVERED", "ON_HOLD", "RETURNED"],
    DELIVERED: [],
    CANCELLED: [],
    ON_HOLD: [
        "PICKUP_ASSIGNED",
        "OUT_FOR_PICKUP",
        "PICKED_UP",
        "AT_FACILITY",
        "IN_PROCESS",
        "READY",
        "OUT_FOR_DELIVERY",
        "CANCELLED",
        "RETURNED",
    ],
    RETURNED: [],
};

function formatStatus(status: string) {
    return status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function OrderStatusControl({
    orderId,
    currentStatus,
}: {
    orderId: string;
    currentStatus: OrderStatus;
}) {
    const [selectedStatus, setSelectedStatus] =
        useState<OrderStatus | "">("");

    const [notes, setNotes] = useState("");
    const [message, setMessage] = useState("");
    const [isPending, startTransition] = useTransition();

    const availableStatuses = transitions[currentStatus] ?? [];

    function handleUpdate() {
        if (!selectedStatus) return;

        setMessage("");

        startTransition(async () => {
            const result = await updateOrderStatusAction({
                orderId,
                newStatus: selectedStatus,
                notes,
            });

            if (!result.success) {
                setMessage(result.error ?? "Unable to update order.");
                return;
            }

            setMessage(
                result.warning ??
                    "Order status updated successfully.",
            );

            setNotes("");
            setSelectedStatus("");

            window.location.reload();
        });
    }

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                Operations
            </p>

            <h2 className="mt-1 text-xl font-extrabold text-brand-navy">
                Update order status
            </h2>

            {availableStatuses.length === 0 ? (
                <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    This order has reached a final status and cannot be
                    progressed further.
                </p>
            ) : (
                <>
                    <div className="mt-5">
                        <label
                            htmlFor="order-status"
                            className="text-xs font-bold uppercase tracking-wide text-slate-400"
                        >
                            New status
                        </label>

                        <select
                            id="order-status"
                            value={selectedStatus}
                            onChange={(event) =>
                                setSelectedStatus(
                                    event.target.value as OrderStatus,
                                )
                            }
                            disabled={isPending}
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/10"
                        >
                            <option value="">
                                Select next status
                            </option>

                            {availableStatuses.map((status) => (
                                <option key={status} value={status}>
                                    {formatStatus(status)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-4">
                        <label
                            htmlFor="status-notes"
                            className="text-xs font-bold uppercase tracking-wide text-slate-400"
                        >
                            Notes
                        </label>

                        <textarea
                            id="status-notes"
                            value={notes}
                            onChange={(event) =>
                                setNotes(event.target.value)
                            }
                            disabled={isPending}
                            rows={3}
                            placeholder="Optional operational note..."
                            className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/10"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleUpdate}
                        disabled={!selectedStatus || isPending}
                        className="mt-4 w-full rounded-xl bg-brand-navy px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isPending
                            ? "Updating..."
                            : "Update Order Status"}
                    </button>
                </>
            )}

            {message && (
                <p
                    className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
                        message.includes("successfully")
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                    }`}
                >
                    {message}
                </p>
            )}
        </section>
    );
}

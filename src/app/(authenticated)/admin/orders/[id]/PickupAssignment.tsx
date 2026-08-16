"use client";

import { useState, useTransition } from "react";
import { assignPickupPartnerAction } from "@/app/actions/delivery-task";

type DeliveryPartner = {
    id: string;
    profile_id: string;
    full_name: string | null;
    phone: string | null;
};

type PickupTask = {
    id: string;
    delivery_partner_id: string | null;
    status: string;
} | null;

export default function PickupAssignment({
    orderId,
    task,
    deliveryPartners,
}: {
    orderId: string;
    task: PickupTask;
    deliveryPartners: DeliveryPartner[];
}) {
    const [selectedPartner, setSelectedPartner] = useState(
        task?.delivery_partner_id ?? "",
    );
    const [message, setMessage] = useState("");
    const [isPending, startTransition] = useTransition();

    function handleAssign() {
        if (!selectedPartner) return;

        setMessage("");

        startTransition(async () => {
            const result = await assignPickupPartnerAction({
                orderId,
                deliveryPartnerId: selectedPartner,
            });

            if (!result.success) {
                setMessage(
                    result.error ??
                    "Unable to assign delivery partner.",
                );
                return;
            }

            setMessage(
                result.warning ??
                "Pickup partner assigned successfully.",
            );

            window.location.reload();
        });
    }

    const assignedPartner = deliveryPartners.find(
        (partner) => partner.id === task?.delivery_partner_id,
    );

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                Delivery
            </p>

            <h2 className="mt-1 text-xl font-extrabold text-brand-navy">
                Pickup assignment
            </h2>

            {task?.delivery_partner_id && (
                <div className="mt-4 rounded-xl bg-blue-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                        Currently assigned
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-900">
                        {assignedPartner?.full_name ||
                            "Delivery Partner"}
                    </p>

                    {assignedPartner?.phone && (
                        <p className="mt-1 text-xs text-slate-500">
                            {assignedPartner.phone}
                        </p>
                    )}

                    <p className="mt-2 text-xs font-semibold text-blue-700">
                        Task status: {task.status}
                    </p>
                </div>
            )}

            {deliveryPartners.length === 0 ? (
                <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-700">
                    No approved and active delivery partners are
                    currently available.
                </p>
            ) : (
                <>
                    <div className="mt-5">
                        <label
                            htmlFor="pickup-partner"
                            className="text-xs font-bold uppercase tracking-wide text-slate-400"
                        >
                            {task?.delivery_partner_id
                                ? "Change delivery partner"
                                : "Delivery partner"}
                        </label>

                        <select
                            id="pickup-partner"
                            value={selectedPartner}
                            onChange={(event) =>
                                setSelectedPartner(
                                    event.target.value,
                                )
                            }
                            disabled={isPending}
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/10"
                        >
                            <option value="">
                                Select delivery partner
                            </option>

                            {deliveryPartners.map((partner) => (
                                <option
                                    key={partner.id}
                                    value={partner.id}
                                >
                                    {partner.full_name ||
                                        "Delivery Partner"}
                                    {partner.phone
                                        ? ` — ${partner.phone}`
                                        : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={handleAssign}
                        disabled={!selectedPartner || isPending}
                        className="mt-4 w-full rounded-xl bg-brand-navy px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isPending
                            ? "Assigning..."
                            : task?.delivery_partner_id
                                ? "Reassign Pickup Partner"
                                : "Assign Pickup Partner"}
                    </button>
                </>
            )}

            {message && (
                <p
                    className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${message.includes("successfully")
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
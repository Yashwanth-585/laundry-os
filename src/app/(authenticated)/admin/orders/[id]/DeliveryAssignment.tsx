"use client";

import { useState, useTransition } from "react";
import { assignDeliveryTaskAction } from "@/app/actions/delivery-task";

type DeliveryPartner = {
    id: string;
    profile_id: string;
    full_name: string | null;
    phone: string | null;
};

export default function DeliveryAssignment({
    orderId,
    task,
    deliveryPartners,
}: {
    orderId: string;
    task: {
        id: string;
        delivery_partner_id: string | null;
        status: string;
    } | null;
    deliveryPartners: DeliveryPartner[];
}) {
    const [selectedPartner, setSelectedPartner] =
        useState(task?.delivery_partner_id ?? "");

    const [message, setMessage] = useState("");

    const [isPending, startTransition] =
        useTransition();

    function handleAssign() {
        if (!selectedPartner) {
            setMessage(
                "Please select a delivery partner.",
            );
            return;
        }

        setMessage("");

        startTransition(async () => {
            const result =
                await assignDeliveryTaskAction({
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
                "Delivery partner assigned successfully.",
            );

            window.location.reload();
        });
    }

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                Final delivery
            </p>

            <h2 className="mt-1 text-xl font-extrabold text-brand-navy">
                Delivery assignment
            </h2>

            {task ? (
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Delivery task
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-900">
                        {task.status}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        Partner already assigned to this
                        delivery task.
                    </p>
                </div>
            ) : (
                <>
                    <div className="mt-5">
                        <label
                            htmlFor="delivery-partner"
                            className="text-xs font-bold uppercase tracking-wide text-slate-400"
                        >
                            Delivery partner
                        </label>

                        <select
                            id="delivery-partner"
                            value={selectedPartner}
                            onChange={(event) =>
                                setSelectedPartner(
                                    event.target.value,
                                )
                            }
                            disabled={isPending}
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/10"
                        >
                            <option value="">
                                Select delivery partner
                            </option>

                            {deliveryPartners.map(
                                (partner) => (
                                    <option
                                        key={partner.id}
                                        value={partner.id}
                                    >
                                        {partner.full_name ||
                                            "Unnamed partner"}
                                        {partner.phone
                                            ? ` — ${partner.phone}`
                                            : ""}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={handleAssign}
                        disabled={
                            isPending ||
                            !selectedPartner
                        }
                        className="mt-4 w-full rounded-xl bg-brand-navy px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isPending
                            ? "Assigning..."
                            : "Assign Delivery Partner"}
                    </button>
                </>
            )}

            {message && (
                <p
                    className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${message.toLowerCase().includes(
                        "success",
                    )
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
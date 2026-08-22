"use client";

import { useState, useTransition } from "react";

import { submitItemVerificationAction, type ItemCondition } from "@/app/actions/item-verification";

type OrderItem = {
    id: string;
    article_name: string;
    category_name: string;
    quantity: number;
};

type ExistingReport = {
    order_item_id: string;
    condition: ItemCondition;
    note: string | null;
    photo_urls: string[];
};

type Props = {
    taskId: string;
    taskType: "PICKUP" | "DROP";
    items: OrderItem[];
    initialReports: ExistingReport[];
};

const CONDITIONS: { value: ItemCondition; label: string; tone: string }[] = [
    { value: "GOOD", label: "Good", tone: "border-emerald-300 bg-emerald-50 text-emerald-700" },
    { value: "DAMAGED", label: "Damaged", tone: "border-amber-300 bg-amber-50 text-amber-700" },
    { value: "MISSING", label: "Missing", tone: "border-red-300 bg-red-50 text-red-700" },
];

export default function ItemVerification({ taskId, taskType, items, initialReports }: Props) {
    const [reports, setReports] = useState<Record<string, ExistingReport>>(() =>
        Object.fromEntries(initialReports.map((report) => [report.order_item_id, report])),
    );

    const [draftCondition, setDraftCondition] = useState<Record<string, ItemCondition>>({});
    const [draftNote, setDraftNote] = useState<Record<string, string>>({});
    const [draftFiles, setDraftFiles] = useState<Record<string, File[]>>({});
    const [message, setMessage] = useState<Record<string, string>>({});
    const [error, setError] = useState<Record<string, string>>({});
    const [pendingId, startTransition] = useTransition();
    const [submittingId, setSubmittingId] = useState<string | null>(null);

    function conditionFor(itemId: string): ItemCondition {
        return draftCondition[itemId] ?? reports[itemId]?.condition ?? "GOOD";
    }

    function handleFiles(itemId: string, fileList: FileList | null) {
        const selected = Array.from(fileList ?? []);

        if (selected.length > 5) {
            setError((prev) => ({ ...prev, [itemId]: "Maximum 5 photos per item." }));
            return;
        }

        setDraftFiles((prev) => ({ ...prev, [itemId]: selected }));
        setError((prev) => ({ ...prev, [itemId]: "" }));
    }

    function submitItem(item: OrderItem) {
        const condition = conditionFor(item.id);
        const note = draftNote[item.id] ?? reports[item.id]?.note ?? "";
        const files = draftFiles[item.id] ?? [];

        setError((prev) => ({ ...prev, [item.id]: "" }));
        setMessage((prev) => ({ ...prev, [item.id]: "" }));
        setSubmittingId(item.id);

        const formData = new FormData();
        for (const file of files) {
            formData.append("photos", file);
        }

        startTransition(async () => {
            const result = await submitItemVerificationAction(
                taskId,
                item.id,
                condition,
                note,
                formData,
            );

            setSubmittingId(null);

            if (!result.success) {
                setError((prev) => ({ ...prev, [item.id]: result.error ?? "Unable to save." }));
                return;
            }

            setReports((prev) => ({
                ...prev,
                [item.id]: {
                    order_item_id: item.id,
                    condition,
                    note: note.trim() || null,
                    photo_urls: result.photoUrls ?? prev[item.id]?.photo_urls ?? [],
                },
            }));

            setMessage((prev) => ({ ...prev, [item.id]: "Saved ✓" }));
        });
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <div>
            <p className="text-sm font-bold text-slate-900">
                {taskType === "PICKUP" ? "Verify items at pickup" : "Verify items at delivery"}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
                Mark the condition of each item. Add a photo for anything damaged or missing —
                this protects both you and the customer if there's a dispute later.
            </p>

            <div className="mt-4 space-y-4">
                {items.map((item) => {
                    const existing = reports[item.id];
                    const condition = conditionFor(item.id);
                    const isSaved = Boolean(existing) && !draftCondition[item.id] && !draftFiles[item.id];

                    return (
                        <div
                            key={item.id}
                            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold text-slate-900">
                                        {item.article_name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {item.category_name} · Qty {item.quantity}
                                    </p>
                                </div>

                                {isSaved && (
                                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                        Reported
                                    </span>
                                )}
                            </div>

                            <div className="mt-3 flex gap-2">
                                {CONDITIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() =>
                                            setDraftCondition((prev) => ({
                                                ...prev,
                                                [item.id]: option.value,
                                            }))
                                        }
                                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                                            condition === option.value
                                                ? option.tone
                                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            {condition !== "GOOD" && (
                                <>
                                    <textarea
                                        value={draftNote[item.id] ?? existing?.note ?? ""}
                                        onChange={(event) =>
                                            setDraftNote((prev) => ({
                                                ...prev,
                                                [item.id]: event.target.value,
                                            }))
                                        }
                                        placeholder="Briefly describe the issue..."
                                        rows={2}
                                        className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue-deep"
                                    />

                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        multiple
                                        capture="environment"
                                        onChange={(event) => handleFiles(item.id, event.target.files)}
                                        className="mt-2 block w-full text-xs text-slate-600"
                                    />

                                    {draftFiles[item.id]?.length ? (
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            {draftFiles[item.id].length} photo(s) selected
                                        </p>
                                    ) : null}
                                </>
                            )}

                            {existing?.photo_urls?.length ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {existing.photo_urls.map((url) => (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            key={url}
                                            src={url}
                                            alt="Item evidence"
                                            className="size-16 rounded-lg border border-slate-200 object-cover"
                                        />
                                    ))}
                                </div>
                            ) : null}

                            {error[item.id] && (
                                <p className="mt-2 text-xs font-semibold text-red-600">
                                    {error[item.id]}
                                </p>
                            )}

                            {message[item.id] && (
                                <p className="mt-2 text-xs font-semibold text-emerald-600">
                                    {message[item.id]}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={() => submitItem(item)}
                                disabled={pendingId !== null && submittingId === item.id}
                                className="mt-3 rounded-lg bg-brand-navy px-3.5 py-2 text-xs font-bold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submittingId === item.id ? "Saving..." : "Save item report"}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

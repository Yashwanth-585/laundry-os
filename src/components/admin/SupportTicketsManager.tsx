"use client";

import { useState, useTransition } from "react";

import {
    adminResolveTicketAction,
    type TicketResolutionStatus,
} from "@/app/actions/support-tickets";

type Ticket = {
    id: string;
    customer_id: string;
    order_id: string | null;
    issue_type: string;
    description: string;
    photo_urls: string[];
    status: string;
    admin_notes: string | null;
    resolution: string | null;
    created_at: string;
};

const STATUS_TONE: Record<string, string> = {
    OPEN: "bg-blue-50 text-blue-700 border-blue-200",
    UNDER_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
    RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
};

function formatStatus(status: string) {
    return status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function SupportTicketsManager({ tickets }: { tickets: Ticket[] }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
    const [resolutionDraft, setResolutionDraft] = useState<Record<string, string>>({});
    const [message, setMessage] = useState<Record<string, string>>({});
    const [isPending, startTransition] = useTransition();

    function resolve(ticket: Ticket, status: TicketResolutionStatus) {
        setMessage((prev) => ({ ...prev, [ticket.id]: "" }));

        startTransition(async () => {
            const result = await adminResolveTicketAction(
                ticket.id,
                status,
                notesDraft[ticket.id] ?? ticket.admin_notes ?? "",
                resolutionDraft[ticket.id] ?? ticket.resolution ?? "",
            );

            setMessage((prev) => ({
                ...prev,
                [ticket.id]: result.success
                    ? "Updated."
                    : result.error ?? "Unable to update.",
            }));
        });
    }

    if (tickets.length === 0) {
        return (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                No support tickets yet.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {tickets.map((ticket) => {
                const isOpen = expandedId === ticket.id;

                return (
                    <div
                        key={ticket.id}
                        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                        <button
                            type="button"
                            onClick={() => setExpandedId(isOpen ? null : ticket.id)}
                            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                        >
                            <div>
                                <p className="text-xs font-mono text-slate-400">
                                    #{ticket.id.slice(0, 8).toUpperCase()} ·{" "}
                                    {new Date(ticket.created_at).toLocaleDateString("en-IN")}
                                </p>
                                <p className="mt-1 text-sm font-bold text-slate-900">
                                    {ticket.issue_type.replaceAll("_", " ")}
                                </p>
                                <p className="mt-1 max-w-lg truncate text-xs text-slate-500">
                                    {ticket.description}
                                </p>
                            </div>

                            <span
                                className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                                    STATUS_TONE[ticket.status] ?? "border-slate-200 bg-slate-50 text-slate-600"
                                }`}
                            >
                                {formatStatus(ticket.status)}
                            </span>
                        </button>

                        {isOpen && (
                            <div className="border-t border-slate-100 px-5 py-4">
                                <p className="text-sm leading-6 text-slate-700">
                                    {ticket.description}
                                </p>

                                {ticket.order_id && (
                                    <a
                                        href={`/admin/orders/${ticket.order_id}`}
                                        className="mt-2 inline-block text-xs font-bold text-brand-blue-deep hover:underline"
                                    >
                                        View order →
                                    </a>
                                )}

                                {ticket.photo_urls.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {ticket.photo_urls.map((url) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                key={url}
                                                src={url}
                                                alt="Ticket evidence"
                                                className="size-24 rounded-lg border border-slate-200 object-cover"
                                            />
                                        ))}
                                    </div>
                                )}

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                            Internal notes
                                        </label>
                                        <textarea
                                            defaultValue={ticket.admin_notes ?? ""}
                                            onChange={(event) =>
                                                setNotesDraft((prev) => ({
                                                    ...prev,
                                                    [ticket.id]: event.target.value,
                                                }))
                                            }
                                            rows={2}
                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-blue-deep"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                            Resolution (shown to customer)
                                        </label>
                                        <textarea
                                            defaultValue={ticket.resolution ?? ""}
                                            onChange={(event) =>
                                                setResolutionDraft((prev) => ({
                                                    ...prev,
                                                    [ticket.id]: event.target.value,
                                                }))
                                            }
                                            rows={2}
                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-blue-deep"
                                        />
                                    </div>
                                </div>

                                {message[ticket.id] && (
                                    <p className="mt-2 text-xs font-semibold text-slate-500">
                                        {message[ticket.id]}
                                    </p>
                                )}

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => resolve(ticket, "UNDER_REVIEW")}
                                        className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                                    >
                                        Mark under review
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => resolve(ticket, "RESOLVED")}
                                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                                    >
                                        Mark resolved
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => resolve(ticket, "REJECTED")}
                                        className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

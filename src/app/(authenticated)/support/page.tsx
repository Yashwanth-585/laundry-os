import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import ComplaintChatbot from "@/components/support/ComplaintChatbot";
import { listMyTicketsAction } from "@/app/actions/support-tickets";

function formatStatus(status: string) {
    return status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const STATUS_TONE: Record<string, string> = {
    OPEN: "bg-blue-50 text-blue-700",
    UNDER_REVIEW: "bg-amber-50 text-amber-700",
    RESOLVED: "bg-emerald-50 text-emerald-700",
    REJECTED: "bg-red-50 text-red-700",
};

export default async function SupportPage() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    const ticketsResult = await listMyTicketsAction();
    const tickets = ticketsResult.success ? ticketsResult.tickets : [];

    return (
        <main className="min-h-screen bg-sky-100/70">
            <div className="mx-auto max-w-5xl px-4 py-8 pb-20 sm:px-6 lg:px-8">
                <header>
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                        Support
                    </p>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                        Report an issue
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        Missing or damaged items from a delivered order? Use the assistant below
                        to raise a ticket — our team will review it and take the necessary action.
                    </p>
                </header>

                <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
                    <ComplaintChatbot />

                    <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                            My tickets
                        </p>

                        <div className="mt-4 space-y-3">
                            {tickets.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    No tickets raised yet.
                                </p>
                            ) : (
                                tickets.map((ticket) => (
                                    <div
                                        key={ticket.id}
                                        className="rounded-xl border border-slate-200 p-3"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs font-mono text-slate-500">
                                                #{ticket.id.slice(0, 8).toUpperCase()}
                                            </p>

                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                                    STATUS_TONE[ticket.status] ?? "bg-slate-100 text-slate-600"
                                                }`}
                                            >
                                                {formatStatus(ticket.status)}
                                            </span>
                                        </div>

                                        <p className="mt-2 text-sm text-slate-700 line-clamp-2">
                                            {ticket.description}
                                        </p>

                                        {ticket.resolution && (
                                            <p className="mt-2 text-xs leading-5 text-slate-500">
                                                <span className="font-semibold text-slate-600">
                                                    Resolution:{" "}
                                                </span>
                                                {ticket.resolution}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}

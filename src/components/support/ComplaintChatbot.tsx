"use client";

import { useEffect, useState, useTransition } from "react";

import {
    listComplaintEligibleOrdersAction,
    createSupportTicketAction,
    type IssueType,
} from "@/app/actions/support-tickets";

type Order = {
    id: string;
    created_at: string;
    total_amount: number;
    order_items: { id: string; article_name: string }[];
};

type ChatMessage = {
    from: "bot" | "user";
    text: string;
};

type Step =
    | "LOADING"
    | "ASK_ORDER"
    | "ASK_ISSUE_TYPE"
    | "ASK_ITEM"
    | "ASK_DESCRIPTION"
    | "ASK_PHOTOS"
    | "SUBMITTING"
    | "DONE"
    | "NO_ORDERS";

const ISSUE_LABELS: Record<IssueType, string> = {
    MISSING_ITEM: "An item is missing",
    DAMAGED_ITEM: "An item is damaged",
    OTHER: "Something else",
};

/**
 * A deliberately "dumb" scripted flow — no AI calls. It only ever walks a
 * fixed sequence of questions and files a ticket for admin review. It
 * cannot take any action beyond that (no refunds, no cancellations, etc).
 */
export default function ComplaintChatbot() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { from: "bot", text: "Hi! I can help you report a missing or damaged item from a delivered order and raise a ticket for our team to review." },
    ]);

    const [step, setStep] = useState<Step>("LOADING");
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [issueType, setIssueType] = useState<IssueType | null>(null);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [description, setDescription] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState("");
    const [ticketId, setTicketId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        startTransition(async () => {
            const result = await listComplaintEligibleOrdersAction();

            if (!result.success || result.orders.length === 0) {
                setStep("NO_ORDERS");
                pushBot(
                    "It looks like you don't have any delivered orders yet. You can only raise a complaint once an order has been delivered.",
                );
                return;
            }

            setOrders(result.orders as Order[]);
            setStep("ASK_ORDER");
            pushBot("Which order is this about?");
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function pushBot(text: string) {
        setMessages((prev) => [...prev, { from: "bot", text }]);
    }

    function pushUser(text: string) {
        setMessages((prev) => [...prev, { from: "user", text }]);
    }

    function chooseOrder(order: Order) {
        setSelectedOrder(order);
        pushUser(`Order placed on ${new Date(order.created_at).toLocaleDateString("en-IN")}`);
        setStep("ASK_ISSUE_TYPE");
        pushBot("Got it. What's the issue?");
    }

    function chooseIssueType(type: IssueType) {
        setIssueType(type);
        pushUser(ISSUE_LABELS[type]);

        if (type === "OTHER") {
            setStep("ASK_DESCRIPTION");
            pushBot("Please describe the issue in a few sentences.");
            return;
        }

        if (selectedOrder && selectedOrder.order_items.length > 0) {
            setStep("ASK_ITEM");
            pushBot("Which item is this about?");
        } else {
            setStep("ASK_DESCRIPTION");
            pushBot("Please describe the issue in a few sentences.");
        }
    }

    function chooseItem(itemId: string | null, label: string) {
        setSelectedItemId(itemId);
        pushUser(label);
        setStep("ASK_DESCRIPTION");
        pushBot("Please describe the issue in a few sentences.");
    }

    function submitDescription() {
        if (description.trim().length < 10) {
            setError("Please add a bit more detail (at least 10 characters).");
            return;
        }

        setError("");
        pushUser(description.trim());
        setStep("ASK_PHOTOS");
        pushBot(
            issueType === "OTHER"
                ? "Would you like to attach any photos? (optional)"
                : "Please attach a photo of the missing or damaged item — this helps our team verify the issue faster.",
        );
    }

    function submitTicket() {
        if (!selectedOrder || !issueType) return;

        if (issueType !== "OTHER" && files.length === 0) {
            setError("At least one photo is required for this issue type.");
            return;
        }

        setError("");
        setStep("SUBMITTING");
        pushUser(files.length > 0 ? `${files.length} photo(s) attached` : "No photos");

        const formData = new FormData();
        for (const file of files) {
            formData.append("photos", file);
        }

        startTransition(async () => {
            const result = await createSupportTicketAction(
                {
                    orderId: selectedOrder.id,
                    orderItemId: selectedItemId,
                    issueType,
                    description,
                },
                formData,
            );

            if (!result.success) {
                setError(result.error ?? "Something went wrong.");
                setStep("ASK_PHOTOS");
                return;
            }

            setTicketId(result.ticketId ?? null);
            setStep("DONE");
            pushBot(
                "Thanks — I've raised a ticket for our team to review. They'll verify the details and take the necessary action. You can track its status under My Tickets.",
            );
        });
    }

    return (
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="rounded-t-2xl bg-brand-navy px-5 py-4">
                <p className="text-sm font-bold text-white">Report an issue</p>
                <p className="mt-0.5 text-xs text-slate-300">
                    Guided complaint assistant — no AI, just a quick form.
                </p>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 py-5">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-5 ${
                                message.from === "user"
                                    ? "bg-brand-blue-deep text-white"
                                    : "bg-slate-100 text-slate-800"
                            }`}
                        >
                            {message.text}
                        </div>
                    </div>
                ))}

                {isPending && step !== "SUBMITTING" && (
                    <div className="text-xs text-slate-400">Loading...</div>
                )}
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
                {step === "ASK_ORDER" && (
                    <div className="space-y-2">
                        {orders.map((order) => (
                            <button
                                key={order.id}
                                type="button"
                                onClick={() => chooseOrder(order)}
                                className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:border-brand-blue-deep hover:bg-blue-50"
                            >
                                Order #{order.id.slice(0, 8).toUpperCase()} ·{" "}
                                {new Date(order.created_at).toLocaleDateString("en-IN")} · ₹
                                {Number(order.total_amount).toFixed(2)}
                            </button>
                        ))}
                    </div>
                )}

                {step === "ASK_ISSUE_TYPE" && (
                    <div className="space-y-2">
                        {(Object.keys(ISSUE_LABELS) as IssueType[]).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => chooseIssueType(type)}
                                className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:border-brand-blue-deep hover:bg-blue-50"
                            >
                                {ISSUE_LABELS[type]}
                            </button>
                        ))}
                    </div>
                )}

                {step === "ASK_ITEM" && selectedOrder && (
                    <div className="space-y-2">
                        {selectedOrder.order_items.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => chooseItem(item.id, item.article_name)}
                                className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:border-brand-blue-deep hover:bg-blue-50"
                            >
                                {item.article_name}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => chooseItem(null, "Not sure / multiple items")}
                            className="block w-full rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-left text-sm font-semibold text-slate-500 transition hover:border-slate-400"
                        >
                            Not sure / multiple items
                        </button>
                    </div>
                )}

                {step === "ASK_DESCRIPTION" && (
                    <div className="space-y-3">
                        <textarea
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            rows={3}
                            placeholder="Describe what happened..."
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-blue-deep"
                        />
                        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
                        <button
                            type="button"
                            onClick={submitDescription}
                            className="w-full rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-blue-deep"
                        >
                            Continue
                        </button>
                    </div>
                )}

                {step === "ASK_PHOTOS" && (
                    <div className="space-y-3">
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={(event) =>
                                setFiles(Array.from(event.target.files ?? []))
                            }
                            className="block w-full text-sm text-slate-600"
                        />
                        {files.length > 0 && (
                            <p className="text-xs text-slate-500">
                                {files.length} photo(s) selected
                            </p>
                        )}
                        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
                        <button
                            type="button"
                            onClick={submitTicket}
                            disabled={isPending}
                            className="w-full rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-blue-deep disabled:opacity-50"
                        >
                            {isPending ? "Submitting..." : "Raise ticket"}
                        </button>
                    </div>
                )}

                {step === "DONE" && ticketId && (
                    <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                        Ticket #{ticketId.slice(0, 8).toUpperCase()} raised. Our admin team will
                        review it shortly.
                    </div>
                )}

                {step === "NO_ORDERS" && (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        No delivered orders to report an issue for yet.
                    </div>
                )}
            </div>
        </div>
    );
}

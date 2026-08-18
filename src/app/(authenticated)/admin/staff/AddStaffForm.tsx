"use client";

import { type FormEvent, useState, useTransition } from "react";

import { inviteStaffAction } from "./actions";

export default function AddStaffForm() {
    const [isOpen, setIsOpen] = useState(false);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        startTransition(async () => {
            const result = await inviteStaffAction({
                fullName,
                email,
            });

            if (!result.success) {
                setError(result.error);
                return;
            }

            setSuccess(result.message);
            setFullName("");
            setEmail("");
        });
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                className="flex w-full items-center justify-between px-6 py-5 text-left"
            >
                <div>
                    <h2 className="font-bold text-slate-900">
                        Add Staff
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                        Invite a new staff member to the facility.
                    </p>
                </div>

                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-blue-deep/10 text-lg font-bold text-brand-blue-deep">
                    {isOpen ? "−" : "+"}
                </span>
            </button>

            {isOpen ? (
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 border-t border-slate-100 px-6 py-5"
                >
                    <label className="block text-sm font-semibold text-slate-700">
                        Full name

                        <input
                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/20"
                            value={fullName}
                            onChange={(event) =>
                                setFullName(event.target.value)
                            }
                            required
                        />
                    </label>

                    <label className="block text-sm font-semibold text-slate-700">
                        Email address

                        <input
                            type="email"
                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/20"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            required
                        />
                    </label>

                    {error ? (
                        <p
                            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600"
                            role="alert"
                        >
                            {error}
                        </p>
                    ) : null}

                    {success ? (
                        <p
                            className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700"
                            role="status"
                        >
                            {success}
                        </p>
                    ) : null}

                    <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isPending
                            ? "Sending invitation…"
                            : "Send Invitation"}
                    </button>
                </form>
            ) : null}
        </div>
    );
}
"use client";

import { useState } from "react";

const reviews = [
    {
        name: "Ananya R.",
        rating: 5,
        review:
            "The pickup was right on time and my clothes came back neatly folded. Very convenient service.",
    },
    {
        name: "Rahul K.",
        rating: 5,
        review:
            "Really simple ordering process and the laundry quality was excellent. I will definitely use WashLand again.",
    },
    {
        name: "Priya S.",
        rating: 5,
        review:
            "I loved how easy it was to schedule a pickup. Everything was handled professionally and delivered on time.",
    },
    {
        name: "Vikram M.",
        rating: 4,
        review:
            "Good service and very convenient for regular laundry. The pickup and delivery process was smooth.",
    },
    {
        name: "Sneha P.",
        rating: 5,
        review:
            "My clothes were cleaned really well and packed neatly. The whole experience was much easier than going to a laundry myself.",
    },
];

function Stars({
    rating,
    interactive = false,
    onSelect,
}: {
    rating: number;
    interactive?: boolean;
    onSelect?: (rating: number) => void;
}) {
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= rating;

                if (interactive) {
                    return (
                        <button
                            key={star}
                            type="button"
                            onClick={() => onSelect?.(star)}
                            aria-label={`Give ${star} star${star > 1 ? "s" : ""}`}
                            className={`text-2xl leading-none transition hover:scale-110 ${active ? "text-brand-orange" : "text-slate-300"
                                }`}
                        >
                            ★
                        </button>
                    );
                }

                return (
                    <span
                        key={star}
                        className={`text-sm ${active ? "text-brand-orange" : "text-slate-300"
                            }`}
                    >
                        ★
                    </span>
                );
            })}
        </div>
    );
}

export default function ReviewSection() {
    const [showForm, setShowForm] = useState(false);
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState("");
    const [submitted, setSubmitted] = useState(false);

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        // Intentionally not saved anywhere.
        setSubmitted(true);
        setReviewText("");
    }

    function closeForm() {
        setShowForm(false);
        setSubmitted(false);
        setRating(5);
        setReviewText("");
    }

    return (
        <>
            <section className="border-t border-slate-200 bg-white py-16 sm:py-24">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-5 lg:px-6">
                    {/* Heading */}
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-dashed border-brand-blue-deep/40 bg-white py-1 pl-1.5 pr-3.5 text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                            <span className="flex size-4 items-center justify-center rounded-full bg-brand-blue-deep/10">
                                <span className="size-1.5 rounded-full bg-brand-orange" />
                            </span>
                            Customer Reviews
                        </div>

                        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                            What our customers say
                        </h2>

                        <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
                            See what customers have experienced with WashLand.
                        </p>

                        {/* Overall Rating */}
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <span className="text-3xl font-extrabold text-brand-navy">
                                4.8
                            </span>

                            <div className="text-left">
                                <Stars rating={5} />

                                <p className="mt-1 text-xs text-slate-500">
                                    Based on customer feedback
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Reviews */}
                    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {reviews.map((item) => (
                            <div
                                key={item.name}
                                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-blue-deep/20 hover:bg-white hover:shadow-md"
                            >
                                <Stars rating={item.rating} />

                                <p className="mt-4 text-sm leading-6 text-slate-600">
                                    “{item.review}”
                                </p>

                                <div className="mt-5 flex items-center gap-3 border-t border-slate-200 pt-4">
                                    <div className="flex size-9 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">
                                        {item.name.charAt(0)}
                                    </div>

                                    <div>
                                        <p className="text-sm font-bold text-slate-900">
                                            {item.name}
                                        </p>

                                        <p className="text-xs text-slate-400">
                                            Verified customer
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="mt-10 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setSubmitted(false);
                                setShowForm(true);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-brand-navy bg-white px-6 py-3 text-sm font-semibold text-brand-navy shadow-sm transition hover:bg-brand-navy hover:text-white"
                        >
                            Leave a Review
                            <span>→</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* Review Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        {!submitted ? (
                            <>
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                                            Customer Feedback
                                        </p>

                                        <h3 className="mt-1 text-xl font-extrabold text-brand-navy">
                                            Leave a Review
                                        </h3>

                                        <p className="mt-2 text-sm text-slate-500">
                                            Tell us about your WashLand experience.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={closeForm}
                                        className="flex size-8 items-center justify-center rounded-full text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                        aria-label="Close"
                                    >
                                        ×
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="mt-6">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Your Rating
                                    </label>

                                    <div className="mt-2">
                                        <Stars
                                            rating={rating}
                                            interactive
                                            onSelect={setRating}
                                        />
                                    </div>

                                    <label
                                        htmlFor="review"
                                        className="mt-6 block text-xs font-bold uppercase tracking-wider text-slate-500"
                                    >
                                        Your Review
                                    </label>

                                    <textarea
                                        id="review"
                                        value={reviewText}
                                        onChange={(event) =>
                                            setReviewText(event.target.value)
                                        }
                                        placeholder="Share your experience..."
                                        rows={5}
                                        className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-blue-deep focus:bg-white focus:ring-2 focus:ring-brand-blue-deep/10"
                                    />

                                    <button
                                        type="submit"
                                        className="mt-5 w-full rounded-lg bg-brand-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-blue-deep"
                                    >
                                        Submit Feedback
                                    </button>

                                    <p className="mt-3 text-center text-[11px] text-slate-400">
                                        Your feedback is currently for demonstration purposes.
                                    </p>
                                </form>
                            </>
                        ) : (
                            <div className="py-8 text-center">
                                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">
                                    ✓
                                </div>

                                <h3 className="mt-5 text-xl font-extrabold text-brand-navy">
                                    Thank you for your feedback!
                                </h3>

                                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                    We appreciate you taking the time to share your experience
                                    with WashLand.
                                </p>

                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="mt-6 rounded-lg bg-brand-navy px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-blue-deep"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
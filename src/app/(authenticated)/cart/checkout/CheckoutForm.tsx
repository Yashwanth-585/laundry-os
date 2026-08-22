"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useCart } from "@/context/CartContext";
import { createOrderAction } from "../actions";
import { verifyPaymentAction } from "../verify-payment-action";
import { getMyCreditsAction } from "@/app/actions/credits";

type Address = {
    id: string;
    label: string;
    recipient_name: string;
    phone: string;
    address_line1: string;
    address_line2: string | null;
    landmark: string | null;
    city: string;
    state: string;
    pincode: string;
    is_default: boolean;
};

declare global {
    interface Window {
        Razorpay: any;
    }
}

const pickupSlots = [
    {
        value: "9:00 AM - 12:00 PM",
        endHour: 12,
    },
    {
        value: "12:00 PM - 3:00 PM",
        endHour: 15,
    },
    {
        value: "3:00 PM - 6:00 PM",
        endHour: 18,
    },
    {
        value: "6:00 PM - 9:00 PM",
        endHour: 21,
    },
];

export default function CheckoutForm({
    addresses,
}: {
    addresses: Address[];
}) {
    const router = useRouter();

    const {
        items,
        totalItems,
        totalAmount,
        clearCart,
    } = useCart();

    const defaultAddress =
        addresses.find((address) => address.is_default) ??
        addresses[0];

    const [addressId, setAddressId] = useState(
        defaultAddress?.id ?? "",
    );

    const [pickupDate, setPickupDate] = useState("");
    const [pickupSlot, setPickupSlot] = useState("");
    const [notes, setNotes] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"RAZORPAY" | "COD">("RAZORPAY");
    const [creditBalance, setCreditBalance] = useState(0);
    const [applyCredits, setApplyCredits] = useState(false);

    useEffect(() => {
        getMyCreditsAction().then((result) => {
            if (result.success) {
                setCreditBalance(result.balance);
            }
        });
    }, []);

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [error, setError] = useState("");

    const today = new Date();

    /*
     * Use local date instead of UTC.
     * This matters because the pickup slots are based on
     * the customer's local time.
     */
    const minDate =
        `${today.getFullYear()}-${String(
            today.getMonth() + 1,
        ).padStart(2, "0")}-${String(
            today.getDate(),
        ).padStart(2, "0")}`;

    /*
     * Returns the slots that are still available for the
     * selected date.
     *
     * Future dates:
     *   -> all slots available
     *
     * Today:
     *   -> hide slots whose pickup window has already ended
     */
    function getAvailablePickupSlots() {
        if (!pickupDate) {
            return pickupSlots;
        }

        if (pickupDate !== minDate) {
            return pickupSlots;
        }

        const currentHour = today.getHours();

        return pickupSlots.filter(
            (slot) => currentHour < slot.endHour,
        );
    }

    const availablePickupSlots =
        getAvailablePickupSlots();

    async function loadRazorpayScript() {
        if (window.Razorpay) {
            return true;
        }

        return new Promise<boolean>((resolve) => {
            const script = document.createElement("script");

            script.src =
                "https://checkout.razorpay.com/v1/checkout.js";

            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);

            document.body.appendChild(script);
        });
    }

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError("");

        if (!items.length) {
            setError("Your cart is empty.");
            return;
        }

        if (!addressId) {
            setError("Please select a pickup address.");
            return;
        }

        if (!pickupDate) {
            setError("Please select a pickup date.");
            return;
        }

        if (!pickupSlot) {
            setError("Please select a pickup time slot.");
            return;
        }

        setIsSubmitting(true);

        try {
            /*
             * STEP 1
             * Create the order on the server and get the
             * Razorpay order details.
             */
            const result = await createOrderAction({
                addressId,
                pickupDate,
                pickupSlot,
                notes,
                paymentMethod,
                creditsToApply: applyCredits ? creditBalance : 0,
                items: items.map((item) => ({
                    serviceCatalogItemId:
                        item.serviceCatalogItemId,
                    quantity: item.quantity,
                })),
            });

            if (!result.success) {
                setError(
                    result.error ??
                    "Something went wrong. Please try again.",
                );
                setIsSubmitting(false);
                return;
            }

            /*
             * COD orders skip Razorpay entirely — the order is
             * already placed on the server.
             */
            if (!result.paymentRequired) {
                clearCart();
                router.push(`/orders/${result.orderId}`);
                router.refresh();
                return;
            }

            /*
             * STEP 2
             * Make sure Razorpay Checkout is available.
             */
            const razorpayLoaded =
                await loadRazorpayScript();

            if (!razorpayLoaded) {
                setError(
                    "Unable to load the payment gateway. Please try again.",
                );
                setIsSubmitting(false);
                return;
            }

            /*
             * STEP 3
             * Open Razorpay Checkout.
             */
            const options = {
                key: result.razorpayKeyId,

                amount: result.amount,

                currency: result.currency,

                name: "LaundryOS",

                description: "Laundry pickup order",

                order_id: result.razorpayOrderId,

                prefill: {
                    name: result.customer?.name ?? "",
                    email: result.customer?.email ?? "",
                },

                theme: {
                    color: "#00015E",
                },

                handler: async function (response: {
                    razorpay_payment_id: string;
                    razorpay_order_id: string;
                    razorpay_signature: string;
                }) {
                    try {
                        const verification =
                            await verifyPaymentAction({
                                orderId: result.orderId,
                                razorpayOrderId:
                                    response.razorpay_order_id,
                                razorpayPaymentId:
                                    response.razorpay_payment_id,
                                razorpaySignature:
                                    response.razorpay_signature,
                            });

                        console.log(
                            "PAYMENT VERIFICATION RESULT:",
                            verification,
                        );

                        if (!verification.success) {
                            setError(
                                verification.error ??
                                "Payment verification failed.",
                            );
                            setIsSubmitting(false);
                            return;
                        }

                        clearCart();

                        router.push(
                            `/orders/${verification.orderId}`,
                        );

                        router.refresh();
                    } catch (error) {
                        console.error(
                            "PAYMENT VERIFICATION ERROR:",
                            error,
                        );

                        setError(
                            "Payment verification failed. Please contact support if money was deducted.",
                        );

                        setIsSubmitting(false);
                    }
                },

                modal: {
                    ondismiss: function () {
                        setIsSubmitting(false);
                    },
                },
            };

            const razorpay = new window.Razorpay(
                options,
            );

            razorpay.on(
                "payment.failed",
                function () {
                    setError(
                        "Payment failed. Your order has not been completed.",
                    );

                    setIsSubmitting(false);
                },
            );

            razorpay.open();
        } catch (err) {
            console.error(
                "CHECKOUT ERROR:",
                err,
            );

            setError(
                "Something went wrong while processing your order. Please try again.",
            );

            setIsSubmitting(false);
        }
    }

    if (!items.length) {
        return (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="text-4xl">🧺</div>

                <h2 className="mt-4 text-xl font-extrabold text-brand-navy">
                    Your cart is empty
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                    Add some laundry items before continuing to
                    checkout.
                </p>

                <Link
                    href="/services"
                    className="mt-6 inline-flex rounded-xl bg-brand-navy px-5 py-3 text-sm font-bold text-white hover:bg-brand-blue-deep"
                >
                    Browse services
                </Link>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]"
        >
            <div className="space-y-6">
                {/* ADDRESS */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                            Step 1
                        </p>

                        <h2 className="mt-1 text-xl font-extrabold text-brand-navy">
                            Pickup address
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Where should we collect your laundry?
                        </p>
                    </div>

                    {addresses.length === 0 ? (
                        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                            <p className="text-sm font-semibold text-slate-700">
                                You don't have a saved address yet.
                            </p>

                            <Link
                                href="/addresses/new"
                                className="mt-4 inline-flex rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-bold text-white"
                            >
                                Add an address
                            </Link>
                        </div>
                    ) : (
                        <div className="mt-5 grid gap-3">
                            {addresses.map((address) => (
                                <label
                                    key={address.id}
                                    className={`cursor-pointer rounded-xl border p-4 transition ${addressId === address.id
                                            ? "border-brand-blue-deep bg-brand-blue-deep/5 ring-2 ring-brand-blue-deep/10"
                                            : "border-slate-200 hover:border-slate-300"
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <input
                                            type="radio"
                                            name="address"
                                            value={address.id}
                                            checked={
                                                addressId ===
                                                address.id
                                            }
                                            onChange={(event) =>
                                                setAddressId(
                                                    event.target
                                                        .value,
                                                )
                                            }
                                            className="mt-1 accent-brand-blue-deep"
                                        />

                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-bold text-slate-900">
                                                    {address.label}
                                                </span>

                                                {address.is_default && (
                                                    <span className="rounded-full bg-brand-blue-deep/10 px-2 py-0.5 text-[10px] font-bold text-brand-blue-deep">
                                                        DEFAULT
                                                    </span>
                                                )}
                                            </div>

                                            <p className="mt-1 text-sm font-medium text-slate-700">
                                                {address.recipient_name}{" "}
                                                ·{" "}
                                                {address.phone}
                                            </p>

                                            <p className="mt-2 text-sm leading-5 text-slate-500">
                                                {
                                                    address.address_line1
                                                }

                                                {address.address_line2
                                                    ? `, ${address.address_line2}`
                                                    : ""}

                                                {address.landmark
                                                    ? `, Near ${address.landmark}`
                                                    : ""}

                                                <br />

                                                {address.city},{" "}
                                                {address.state}{" "}
                                                -{" "}
                                                {address.pincode}
                                            </p>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </section>

                {/* PICKUP SCHEDULE */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                        Step 2
                    </p>

                    <h2 className="mt-1 text-xl font-extrabold text-brand-navy">
                        Pickup schedule
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Choose a convenient date and time.
                    </p>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="pickup-date"
                                className="text-sm font-bold text-slate-700"
                            >
                                Pickup date
                            </label>

                            <input
                                id="pickup-date"
                                type="date"
                                min={minDate}
                                value={pickupDate}
                                onChange={(event) => {
                                    setPickupDate(
                                        event.target.value,
                                    );

                                    /*
                                     * Reset the selected slot when
                                     * changing the date so we don't
                                     * keep an invalid slot selected.
                                     */
                                    setPickupSlot("");
                                }}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/10"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="pickup-slot"
                                className="text-sm font-bold text-slate-700"
                            >
                                Pickup time
                            </label>

                            <select
                                id="pickup-slot"
                                value={pickupSlot}
                                onChange={(event) =>
                                    setPickupSlot(
                                        event.target.value,
                                    )
                                }
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/10"
                            >
                                <option value="">
                                    Select a time slot
                                </option>

                                {availablePickupSlots.map(
                                    (slot) => (
                                        <option
                                            key={slot.value}
                                            value={slot.value}
                                        >
                                            {slot.value}
                                        </option>
                                    ),
                                )}
                            </select>

                            {pickupDate === minDate &&
                                availablePickupSlots.length ===
                                0 && (
                                    <p className="mt-2 text-xs font-medium text-red-600">
                                        No pickup slots are available
                                        for today. Please choose
                                        another date.
                                    </p>
                                )}
                        </div>
                    </div>
                </section>

                {/* NOTES */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                        Step 3
                    </p>

                    <h2 className="mt-1 text-xl font-extrabold text-brand-navy">
                        Special instructions
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Optional notes for our pickup team.
                    </p>

                    <textarea
                        value={notes}
                        onChange={(event) =>
                            setNotes(event.target.value)
                        }
                        rows={4}
                        maxLength={500}
                        placeholder="Example: Please call when you arrive."
                        className="mt-5 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/10"
                    />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                        Step 4
                    </p>

                    <h2 className="mt-1 text-xl font-extrabold text-brand-navy">
                        Payment
                    </h2>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <label
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                                paymentMethod === "RAZORPAY"
                                    ? "border-brand-blue-deep bg-blue-50"
                                    : "border-slate-200 hover:border-slate-300"
                            }`}
                        >
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="RAZORPAY"
                                checked={paymentMethod === "RAZORPAY"}
                                onChange={() => setPaymentMethod("RAZORPAY")}
                                className="accent-brand-blue-deep"
                            />
                            <div>
                                <p className="text-sm font-bold text-slate-900">Pay online</p>
                                <p className="text-xs text-slate-500">
                                    Cards, UPI, netbanking via Razorpay
                                </p>
                            </div>
                        </label>

                        <label
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                                paymentMethod === "COD"
                                    ? "border-brand-blue-deep bg-blue-50"
                                    : "border-slate-200 hover:border-slate-300"
                            }`}
                        >
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="COD"
                                checked={paymentMethod === "COD"}
                                onChange={() => setPaymentMethod("COD")}
                                className="accent-brand-blue-deep"
                            />
                            <div>
                                <p className="text-sm font-bold text-slate-900">
                                    Cash on Delivery
                                </p>
                                <p className="text-xs text-slate-500">
                                    Pay in cash when your order is delivered
                                </p>
                            </div>
                        </label>
                    </div>

                    {creditBalance > 0 && (
                        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-slate-300">
                            <input
                                type="checkbox"
                                checked={applyCredits}
                                onChange={(event) =>
                                    setApplyCredits(event.target.checked)
                                }
                                className="mt-0.5 accent-brand-blue-deep"
                            />
                            <div>
                                <p className="text-sm font-bold text-slate-900">
                                    Use my Laundry Coins
                                </p>
                                <p className="text-xs text-slate-500">
                                    Apply your available balance of ₹
                                    {creditBalance.toFixed(2)} towards this order.
                                </p>
                            </div>
                        </label>
                    )}
                </section>
            </div>

            {/* SUMMARY */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                        Order summary
                    </p>

                    <h2 className="mt-2 text-xl font-extrabold text-brand-navy">
                        Ready to place
                    </h2>

                    <div className="mt-6 space-y-3 border-b border-slate-100 pb-5">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">
                                Items
                            </span>

                            <span className="font-semibold text-slate-800">
                                {totalItems}{" "}
                                {totalItems === 1
                                    ? "piece"
                                    : "pieces"}
                            </span>
                        </div>

                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">
                                Subtotal
                            </span>

                            <span className="font-semibold text-slate-800">
                                ₹
                                {totalAmount.toFixed(2)}
                            </span>
                        </div>

                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">
                                Pickup & delivery
                            </span>

                            <span className="font-semibold text-slate-800">
                                ₹5.00
                            </span>
                        </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                            Estimated total
                        </span>

                        <span className="text-2xl font-extrabold text-brand-navy">
                            ₹
                            {(totalAmount + 5).toFixed(
                                2,
                            )}
                        </span>
                    </div>

                    {error && (
                        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={
                            isSubmitting ||
                            addresses.length === 0 ||
                            !pickupSlot
                        }
                        className="mt-6 w-full rounded-xl bg-brand-navy px-5 py-3.5 text-sm font-bold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting
                            ? "Opening payment..."
                            : "Proceed to payment"}
                    </button>

                    <p className="mt-3 text-center text-[11px] leading-4 text-slate-400">
                        You'll be redirected to Razorpay's secure
                        payment window.
                    </p>
                </div>
            </aside>
        </form>
    );
}
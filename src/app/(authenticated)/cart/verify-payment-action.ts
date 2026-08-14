"use server";

import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

type VerifyPaymentInput = {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
};

export async function verifyPaymentAction(
    input: VerifyPaymentInput,
) {
    const supabase = await createClient();

    /* ---------------------------------------------------------------------- */
    /* AUTH                                                                    */
    /* ---------------------------------------------------------------------- */

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            success: false,
            error: "Your session has expired. Please sign in again.",
        };
    }

    /* ---------------------------------------------------------------------- */
    /* VALIDATE INPUT                                                          */
    /* ---------------------------------------------------------------------- */

    if (
        !input.orderId ||
        !input.razorpayOrderId ||
        !input.razorpayPaymentId ||
        !input.razorpaySignature
    ) {
        return {
            success: false,
            error: "Invalid payment information.",
        };
    }

    /* ---------------------------------------------------------------------- */
    /* FETCH ORDER                                                             */
    /* ---------------------------------------------------------------------- */

    const { data: order, error: orderError } =
        await supabase
            .from("orders")
            .select(
                `
                id,
                customer_id,
                payment_status,
                razorpay_order_id
                `,
            )
            .eq("id", input.orderId)
            .eq("customer_id", user.id)
            .single();

    if (orderError || !order) {
        console.error(
            "PAYMENT ORDER LOOKUP ERROR:",
            orderError,
        );

        return {
            success: false,
            error: "Order not found.",
        };
    }

    /* ---------------------------------------------------------------------- */
    /* PREVENT DUPLICATE PAYMENT                                              */
    /* ---------------------------------------------------------------------- */

    if (order.payment_status === "PAID") {
        return {
            success: true,
            orderId: order.id,
        };
    }

    if (
        order.razorpay_order_id !==
        input.razorpayOrderId
    ) {
        return {
            success: false,
            error: "Payment order mismatch.",
        };
    }

    /* ---------------------------------------------------------------------- */
    /* VERIFY RAZORPAY SIGNATURE                                               */
    /* ---------------------------------------------------------------------- */

    const razorpayKeySecret =
        process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeySecret) {
        console.error(
            "RAZORPAY_KEY_SECRET IS MISSING",
        );

        return {
            success: false,
            error:
                "Payment service is not configured.",
        };
    }

    const generatedSignature =
        crypto
            .createHmac(
                "sha256",
                razorpayKeySecret,
            )
            .update(
                `${input.razorpayOrderId}|${input.razorpayPaymentId}`,
            )
            .digest("hex");

    const signaturesMatch =
        crypto.timingSafeEqual(
            Buffer.from(generatedSignature),
            Buffer.from(input.razorpaySignature),
        );

    if (!signaturesMatch) {
        console.error(
            "RAZORPAY SIGNATURE VERIFICATION FAILED",
            {
                orderId: input.orderId,
                razorpayOrderId:
                    input.razorpayOrderId,
            },
        );

        return {
            success: false,
            error:
                "Payment verification failed.",
        };
    }

    /* ---------------------------------------------------------------------- */
    /* MARK ORDER AS PAID                                                     */
    /* ---------------------------------------------------------------------- */

    const { data: paymentUpdated, error: updateError } =
        await supabase.rpc(
            "mark_order_payment_paid",
            {
                p_order_id: order.id,
                p_customer_id: user.id,
                p_razorpay_payment_id:
                    input.razorpayPaymentId,
                p_razorpay_signature:
                    input.razorpaySignature,
            },
        );

    if (updateError) {
        console.error(
            "ORDER PAYMENT UPDATE ERROR:",
            updateError,
        );

        return {
            success: false,
            error:
                "Payment was received, but we couldn't update your order. Please contact support.",
        };
    }

    if (!paymentUpdated) {
        return {
            success: false,
            error:
                "Payment could not be applied to this order.",
        };
    }

    /* ---------------------------------------------------------------------- */
    /* RETURN REAL SUPABASE ORDER ID                                          */
    /* ---------------------------------------------------------------------- */

    return {
        success: true,
        orderId: order.id,
    };
}
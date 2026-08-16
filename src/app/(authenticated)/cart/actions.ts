"use server";

import { createClient } from "@/lib/supabase/server";
import Razorpay from "razorpay";

export type CreateOrderInput = {
    addressId: string;
    pickupDate: string;
    pickupSlot: string;
    notes?: string;
    items: {
        serviceCatalogItemId: string;
        quantity: number;
    }[];
};

export async function createOrderAction(
    input: CreateOrderInput,
) {
    const supabase = await createClient();

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

    if (!input.addressId) {
        return {
            success: false,
            error: "Please select a pickup address.",
        };
    }

    if (!input.pickupDate || !input.pickupSlot) {
        return {
            success: false,
            error: "Please select a pickup date and time slot.",
        };
    }

    /* ---------------------------------------------------------------------- */
    /* PICKUP SLOT VALIDATION                                                 */
    /* ---------------------------------------------------------------------- */

    const validTimeSlots: Record<string, number> = {
        "9:00 AM - 12:00 PM": 9,
        "12:00 PM - 3:00 PM": 12,
        "3:00 PM - 6:00 PM": 15,
        "6:00 PM - 9:00 PM": 18,
    };

    const selectedSlotStartHour =
        validTimeSlots[input.pickupSlot];

    if (selectedSlotStartHour === undefined) {
        return {
            success: false,
            error: "Please select a valid pickup time slot.",
        };
    }

    /*
     * The application operates in India, so use IST explicitly.
     * This avoids relying on the server's timezone (for example,
     * Vercel may run in UTC).
     */

    const now = new Date();

    const indiaDateFormatter =
        new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });

    const indiaTimeFormatter =
        new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });

    const currentIndiaDate =
        indiaDateFormatter.format(now);

    const currentIndiaTime =
        indiaTimeFormatter.format(now);

    const currentIndiaHour =
        Number(currentIndiaTime.split(":")[0]);

    if (input.pickupDate < currentIndiaDate) {
        return {
            success: false,
            error:
                "Please select today or a future pickup date.",
        };
    }

    if (
        input.pickupDate === currentIndiaDate &&
        currentIndiaHour >= selectedSlotStartHour
    ) {
        return {
            success: false,
            error:
                "The selected pickup time slot has already passed. Please choose another slot.",
        };
    }

    if (!input.items?.length) {
        return {
            success: false,
            error: "Your cart is empty.",
        };
    }

    for (const item of input.items) {
        if (
            !item.serviceCatalogItemId ||
            !Number.isInteger(item.quantity) ||
            item.quantity <= 0
        ) {
            return {
                success: false,
                error:
                    "Your cart contains an invalid quantity.",
            };
        }
    }

    /* ---------------------------------------------------------------------- */
    /* ADDRESS OWNERSHIP                                                      */
    /* ---------------------------------------------------------------------- */

    const { data: address, error: addressError } =
        await supabase
            .from("addresses")
            .select("id")
            .eq("id", input.addressId)
            .eq("user_id", user.id)
            .single();

    if (addressError || !address) {
        return {
            success: false,
            error: "The selected address is invalid.",
        };
    }

    /* ---------------------------------------------------------------------- */
    /* LIVE CATALOG PRICING                                                   */
    /* ---------------------------------------------------------------------- */

    const catalogIds = [
        ...new Set(
            input.items.map(
                (item) => item.serviceCatalogItemId,
            ),
        ),
    ];

    const { data: catalogRows, error: catalogError } =
        await supabase
            .from("service_catalog_items")
            .select(
                `
                id,
                price,
                catalog_item_id,
                catalog_items (
                    id,
                    name,
                    category
                ),
                services (
                    id,
                    name
                )
                `,
            )
            .in("id", catalogIds)
            .eq("is_active", true);

    if (catalogError || !catalogRows) {
        console.error(
            "CATALOG VALIDATION ERROR:",
            catalogError,
        );

        return {
            success: false,
            error:
                "We couldn't validate your cart. Please try again.",
        };
    }

    const catalogMap = new Map(
        catalogRows.map((row) => [row.id, row]),
    );

    let subtotal = 0;

    const orderItems = [];

    for (const inputItem of input.items) {
        const catalogItem = catalogMap.get(
            inputItem.serviceCatalogItemId,
        );

        if (!catalogItem) {
            return {
                success: false,
                error:
                    "One or more items in your cart are no longer available.",
            };
        }

        const unitPrice = Number(catalogItem.price);

        if (
            !Number.isFinite(unitPrice) ||
            unitPrice < 0
        ) {
            return {
                success: false,
                error:
                    "One of the selected items has an invalid price.",
            };
        }

        const totalPrice =
            unitPrice * inputItem.quantity;

        subtotal += totalPrice;

        const catalogItemData =
            Array.isArray(catalogItem.catalog_items)
                ? catalogItem.catalog_items[0]
                : catalogItem.catalog_items;

        orderItems.push({
            service_catalog_item_id:
                catalogItem.id,
            catalog_item_id:
                catalogItem.catalog_item_id,
            article_name:
                catalogItemData?.name ?? "Laundry item",
            category_name:
                catalogItemData?.category ?? "",
            unit_price: unitPrice,
            quantity: inputItem.quantity,
            total_price: totalPrice,
        });
    }

    /* ---------------------------------------------------------------------- */
    /* TOTALS                                                                 */
    /* ---------------------------------------------------------------------- */

    const deliveryFee = subtotal > 0 ? 5 : 0;
    const taxAmount = 0;

    const totalAmount =
        subtotal + deliveryFee + taxAmount;

    if (
        !Number.isFinite(totalAmount) ||
        totalAmount <= 0
    ) {
        return {
            success: false,
            error: "The order amount is invalid.",
        };
    }

    /* ---------------------------------------------------------------------- */
    /* RAZORPAY CONFIG                                                        */
    /* ---------------------------------------------------------------------- */

    const razorpayKeyId =
        process.env.RAZORPAY_KEY_ID;

    const razorpayKeySecret =
        process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
        console.error(
            "RAZORPAY ENVIRONMENT VARIABLES ARE MISSING",
        );

        return {
            success: false,
            error:
                "Payment service is not configured. Please try again later.",
        };
    }

    let razorpayOrder;

    console.log("RAZORPAY CONFIG CHECK:", {
        keyId: razorpayKeyId,
        secretExists: Boolean(razorpayKeySecret),
        secretLength: razorpayKeySecret?.length,
    });

    try {
        const razorpay = new Razorpay({
            key_id: razorpayKeyId,
            key_secret: razorpayKeySecret,
        });

        const amountInPaise =
            Math.round(totalAmount * 100);

        razorpayOrder =
            await razorpay.orders.create({
                amount: amountInPaise,
                currency: "INR",
                receipt: `laundryos_${Date.now()}`,
                notes: {
                    customer_id: user.id,
                },
            });
    } catch (error) {
        console.error(
            "RAZORPAY ORDER CREATION ERROR:",
            error,
        );

        return {
            success: false,
            error:
                "We couldn't initialize the payment. Please try again.",
        };
    }

    /* ---------------------------------------------------------------------- */
    /* CREATE SUPABASE ORDER                                                  */
    /* ---------------------------------------------------------------------- */

    const { data: order, error: orderError } =
        await supabase
            .from("orders")
            .insert({
                customer_id: user.id,
                address_id: input.addressId,
                status: "PLACED",
                pickup_date: input.pickupDate,
                pickup_slot: input.pickupSlot,
                notes: input.notes?.trim() || null,
                subtotal,
                delivery_fee: deliveryFee,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                payment_status: "PENDING",
                razorpay_order_id:
                    razorpayOrder.id,
            })
            .select("id")
            .single();

    if (orderError || !order) {
        console.error(
            "ORDER CREATION ERROR:",
            orderError,
        );

        return {
            success: false,
            error:
                "We couldn't create your order. Please try again.",
        };
    }

    /* ---------------------------------------------------------------------- */
    /* CREATE ORDER ITEMS                                                     */
    /* ---------------------------------------------------------------------- */

    const itemsToInsert = orderItems.map(
        (item) => ({
            ...item,
            order_id: order.id,
        }),
    );

    const { error: itemsError } =
        await supabase
            .from("order_items")
            .insert(itemsToInsert);

    if (itemsError) {
        console.error(
            "ORDER ITEMS CREATION ERROR:",
            itemsError,
        );

        // Remove the incomplete order.
        await supabase
            .from("orders")
            .delete()
            .eq("id", order.id)
            .eq("customer_id", user.id);

        return {
            success: false,
            error:
                "We couldn't create the order items. Please try again.",
        };
    }

    /* ---------------------------------------------------------------------- */
    /* STATUS HISTORY                                                         */
    /* ---------------------------------------------------------------------- */

    const { error: historyError } =
        await supabase
            .from("order_status_history")
            .insert({
                order_id: order.id,
                status: "PLACED",
                changed_by: user.id,
                notes: "Order created. Payment pending.",
            });

    if (historyError) {
        console.error(
            "ORDER STATUS HISTORY ERROR:",
            historyError,
        );
    }

    /* ---------------------------------------------------------------------- */
    /* RETURN PAYMENT DETAILS                                                 */
    /* ---------------------------------------------------------------------- */

    return {
        success: true,
        paymentRequired: true,

        orderId: order.id,

        razorpayOrderId:
            razorpayOrder.id,

        razorpayKeyId,

        amount:
            Number(razorpayOrder.amount),

        currency: "INR",

        totalAmount,

        customer: {
            name:
                user.user_metadata?.full_name ??
                "",
            email:
                user.email ??
                "",
        },
    };
}
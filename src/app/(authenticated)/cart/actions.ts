"use server";

import { createClient } from "@/lib/supabase/server";

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
                error: "Your cart contains an invalid quantity.",
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
            error: "We couldn't validate your cart. Please try again.",
        };
    }

    const catalogMap = new Map(
        catalogRows.map((row) => [row.id, row]),
    );

    const processedItems = [];

    let subtotal = 0;

    for (const inputItem of input.items) {
        const catalogItem = catalogMap.get(
            inputItem.serviceCatalogItemId,
        );

        if (!catalogItem) {
            return {
                success: false,
                error: "One or more items in your cart are no longer available.",
            };
        }

        const unitPrice = Number(catalogItem.price);

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            return {
                success: false,
                error: "One of the selected items has an invalid price.",
            };
        }

        const quantity = inputItem.quantity;
        const totalPrice = unitPrice * quantity;

        const catalog =
            Array.isArray(catalogItem.catalog_items)
                ? catalogItem.catalog_items[0]
                : catalogItem.catalog_items;

        const service =
            Array.isArray(catalogItem.services)
                ? catalogItem.services[0]
                : catalogItem.services;

        processedItems.push({
            service_catalog_item_id:
                catalogItem.id,
            catalog_item_id:
                catalogItem.catalog_item_id,
            article_name:
                catalog?.name ?? "Laundry item",
            category_name:
                service?.name ??
                catalog?.category ??
                "Laundry service",
            unit_price: unitPrice,
            quantity,
            total_price: totalPrice,
        });

        subtotal += totalPrice;
    }

    /* ---------------------------------------------------------------------- */
    /* TOTALS                                                                 */
    /* ---------------------------------------------------------------------- */

    const deliveryFee = subtotal > 0 ? 5 : 0;
    const taxAmount = 0;
    const totalAmount =
        subtotal + deliveryFee + taxAmount;

    /* ---------------------------------------------------------------------- */
    /* CREATE ORDER                                                           */
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
            })
            .select("id")
            .single();

    if (orderError || !order) {
        console.error(
            "CREATE ORDER ERROR:",
            orderError,
        );

        return {
            success: false,
            error: "We couldn't place your order. Please try again.",
        };
    }

    /* ---------------------------------------------------------------------- */
    /* CREATE ORDER ITEMS                                                     */
    /* ---------------------------------------------------------------------- */

    const orderItems = processedItems.map((item) => ({
        order_id: order.id,
        ...item,
    }));

    const { error: orderItemsError } =
        await supabase
            .from("order_items")
            .insert(orderItems);

    if (orderItemsError) {
        console.error(
            "CREATE ORDER ITEMS ERROR:",
            orderItemsError,
        );

        return {
            success: false,
            error:
                "Your order could not be completed. Please contact support if you were charged.",
        };
    }

    /* ---------------------------------------------------------------------- */
    /* INITIAL STATUS HISTORY                                                 */
    /* ---------------------------------------------------------------------- */

    const { error: historyError } =
        await supabase
            .from("order_status_history")
            .insert({
                order_id: order.id,
                status: "PLACED",
                changed_by: user.id,
                notes: "Order placed by customer.",
            });

    if (historyError) {
        console.error(
            "STATUS HISTORY ERROR:",
            historyError,
        );
    }

    return {
        success: true,
        orderId: order.id,
    };
}
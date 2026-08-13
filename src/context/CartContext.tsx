"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

export type CartItem = {
    serviceId: string;
    serviceName: string;
    serviceCatalogItemId: string;
    catalogItemId: string;
    articleName: string;
    category: string;
    price: number;
    quantity: number;
};

type CartContextType = {
    items: CartItem[];
    addItems: (items: CartItem[]) => void;
    updateQuantity: (
        serviceCatalogItemId: string,
        quantity: number,
    ) => void;
    removeItem: (serviceCatalogItemId: string) => void;
    clearCart: () => void;
    totalItems: number;
    totalAmount: number;
};

const CartContext = createContext<CartContextType | undefined>(
    undefined,
);

const CART_STORAGE_KEY = "laundry_cart";

export function CartProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        try {
            const storedCart = localStorage.getItem(
                CART_STORAGE_KEY,
            );

            if (storedCart) {
                setItems(JSON.parse(storedCart));
            }
        } catch (error) {
            console.error("Failed to load cart:", error);
        } finally {
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (!loaded) return;

        try {
            localStorage.setItem(
                CART_STORAGE_KEY,
                JSON.stringify(items),
            );
        } catch (error) {
            console.error("Failed to save cart:", error);
        }
    }, [items, loaded]);

    const addItems = (newItems: CartItem[]) => {
        setItems((currentItems) => {
            const updatedItems = [...currentItems];

            for (const newItem of newItems) {
                const existingIndex = updatedItems.findIndex(
                    (item) =>
                        item.serviceCatalogItemId ===
                        newItem.serviceCatalogItemId,
                );

                if (existingIndex >= 0) {
                    updatedItems[existingIndex] = {
                        ...updatedItems[existingIndex],
                        quantity:
                            updatedItems[existingIndex].quantity +
                            newItem.quantity,
                    };
                } else {
                    updatedItems.push(newItem);
                }
            }

            return updatedItems;
        });
    };

    const updateQuantity = (
        serviceCatalogItemId: string,
        quantity: number,
    ) => {
        if (quantity <= 0) {
            setItems((currentItems) =>
                currentItems.filter(
                    (item) =>
                        item.serviceCatalogItemId !==
                        serviceCatalogItemId,
                ),
            );

            return;
        }

        setItems((currentItems) =>
            currentItems.map((item) =>
                item.serviceCatalogItemId ===
                    serviceCatalogItemId
                    ? { ...item, quantity }
                    : item,
            ),
        );
    };

    const removeItem = (serviceCatalogItemId: string) => {
        setItems((currentItems) =>
            currentItems.filter(
                (item) =>
                    item.serviceCatalogItemId !==
                    serviceCatalogItemId,
            ),
        );
    };

    const clearCart = () => {
        setItems([]);
    };

    const totalItems = useMemo(
        () =>
            items.reduce(
                (total, item) => total + item.quantity,
                0,
            ),
        [items],
    );

    const totalAmount = useMemo(
        () =>
            items.reduce(
                (total, item) =>
                    total + item.price * item.quantity,
                0,
            ),
        [items],
    );

    return (
        <CartContext.Provider
            value={{
                items,
                addItems,
                updateQuantity,
                removeItem,
                clearCart,
                totalItems,
                totalAmount,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error(
            "useCart must be used inside CartProvider",
        );
    }

    return context;
}
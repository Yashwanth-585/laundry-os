"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { makeAddressDefault } from "@/app/(authenticated)/addresses/default/actions";

type MakeDefaultButtonProps = {
    addressId: string;
};

export function MakeDefaultButton({
    addressId,
}: MakeDefaultButtonProps) {
    const router = useRouter();
    const [isUpdating, setIsUpdating] = useState(false);

    async function handleMakeDefault() {
        setIsUpdating(true);

        const result = await makeAddressDefault(addressId);

        if (result?.error) {
            window.alert(result.error);
            setIsUpdating(false);
            return;
        }

        router.refresh();
        setIsUpdating(false);
    }

    return (
        <button
            type="button"
            onClick={handleMakeDefault}
            disabled={isUpdating}
            className="rounded-lg border border-brand-blue-deep/20 bg-white px-4 py-2 text-sm font-semibold text-brand-blue-deep transition hover:bg-brand-blue-deep/5 focus:outline-none focus:ring-2 focus:ring-brand-blue-deep/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {isUpdating ? "Updating..." : "Make default"}
        </button>
    );
}
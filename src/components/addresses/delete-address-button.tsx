"use client";

import { useState } from "react";

import { deleteAddress } from "@/app/(authenticated)/addresses/delete/actions";

type DeleteAddressButtonProps = {
    addressId: string;
};

export function DeleteAddressButton({
    addressId,
}: DeleteAddressButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    async function handleDelete() {
        const confirmed = window.confirm(
            "Are you sure you want to delete this address?",
        );

        if (!confirmed) {
            return;
        }

        setIsDeleting(true);

        const result = await deleteAddress(addressId);

        if (result?.error) {
            window.alert(result.error);
            setIsDeleting(false);
        }
    }

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {isDeleting ? "Deleting..." : "Delete"}
        </button>
    );
}
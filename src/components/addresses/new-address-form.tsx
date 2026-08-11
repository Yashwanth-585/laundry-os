"use client";

import Link from "next/link";
import { startTransition, type FormEvent, useState } from "react";

import { createAddress } from "@/app/(authenticated)/addresses/new/actions";

const inputClassName =
  "mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-50 dark:focus:ring-zinc-800";

function valueFrom(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export function NewAddressForm() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const label = valueFrom(formData, "label");
    const recipientName = valueFrom(formData, "recipient_name");
    const phone = valueFrom(formData, "phone");
    const addressLine1 = valueFrom(formData, "address_line1");
    const city = valueFrom(formData, "city");
    const state = valueFrom(formData, "state");
    const pincode = valueFrom(formData, "pincode");
    const latitudeInput = valueFrom(formData, "latitude");
    const longitudeInput = valueFrom(formData, "longitude");

    if (!label || !recipientName || !phone || !addressLine1 || !city || !state) {
      setError("Please complete all required fields.");
      return;
    }

    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      setError("Enter a valid six-digit Indian PIN code.");
      return;
    }

    if (Boolean(latitudeInput) !== Boolean(longitudeInput)) {
      setError("Enter both latitude and longitude, or leave both blank.");
      return;
    }

    const latitude = latitudeInput ? Number(latitudeInput) : null;
    const longitude = longitudeInput ? Number(longitudeInput) : null;

    if (
      (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
      (longitude !== null &&
        (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
    ) {
      setError("Enter valid latitude and longitude values.");
      return;
    }

    setIsSubmitting(true);

    startTransition(async () => {
      const result = await createAddress({
        label,
        recipientName,
        phone,
        addressLine1,
        addressLine2: valueFrom(formData, "address_line2"),
        landmark: valueFrom(formData, "landmark"),
        city,
        state,
        pincode,
        latitude,
        longitude,
        isDefault: formData.get("is_default") === "on",
      });

      setError(result.error);
      setIsSubmitting(false);
    });
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Address label
          <input className={inputClassName} name="label" placeholder="Home" required />
        </label>
        <label className="block text-sm font-medium">
          Recipient name
          <input className={inputClassName} name="recipient_name" autoComplete="name" required />
        </label>
        <label className="block text-sm font-medium">
          Phone
          <input className={inputClassName} name="phone" type="tel" autoComplete="tel" required />
        </label>
      </div>

      <div className="space-y-5">
        <label className="block text-sm font-medium">
          Address line 1
          <input className={inputClassName} name="address_line1" autoComplete="address-line1" required />
        </label>
        <label className="block text-sm font-medium">
          Address line 2 <span className="font-normal text-zinc-500">(optional)</span>
          <input className={inputClassName} name="address_line2" autoComplete="address-line2" />
        </label>
        <label className="block text-sm font-medium">
          Landmark <span className="font-normal text-zinc-500">(optional)</span>
          <input className={inputClassName} name="landmark" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          City
          <input className={inputClassName} name="city" autoComplete="address-level2" required />
        </label>
        <label className="block text-sm font-medium">
          State
          <input className={inputClassName} name="state" autoComplete="address-level1" required />
        </label>
        <label className="block text-sm font-medium">
          PIN code
          <input className={inputClassName} name="pincode" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} autoComplete="postal-code" required />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Latitude <span className="font-normal text-zinc-500">(optional)</span>
          <input className={inputClassName} name="latitude" type="number" min="-90" max="90" step="any" inputMode="decimal" />
        </label>
        <label className="block text-sm font-medium">
          Longitude <span className="font-normal text-zinc-500">(optional)</span>
          <input className={inputClassName} name="longitude" type="number" min="-180" max="180" step="any" inputMode="decimal" />
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <input className="mt-0.5 size-4 accent-zinc-950 dark:accent-zinc-50" name="is_default" type="checkbox" />
        <span>
          <span className="block font-medium">Make this my default address</span>
          <span className="mt-1 block leading-5 text-zinc-600 dark:text-zinc-400">Use this address first for future pickup and delivery.</span>
        </span>
      </label>

      {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link className="rounded-lg border border-zinc-300 px-4 py-2.5 text-center text-sm font-semibold transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800" href="/addresses">
          Cancel
        </Link>
        <button className="rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving address..." : "Save address"}
        </button>
      </div>
    </form>
  );
}

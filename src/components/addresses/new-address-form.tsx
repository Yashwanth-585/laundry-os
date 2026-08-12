"use client";

import Link from "next/link";
import { startTransition, type FormEvent, useState } from "react";

import { createAddress } from "@/app/(authenticated)/addresses/new/actions";

const inputClassName =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/20";

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
    <form className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Address label
          <input className={inputClassName} name="label" placeholder="e.g. Home, Office" required />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Recipient name
          <input className={inputClassName} name="recipient_name" autoComplete="name" placeholder="Full name" required />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 sm:col-span-2">
          Phone
          <input className={inputClassName} name="phone" type="tel" autoComplete="tel" placeholder="10-digit mobile number" required />
        </label>
      </div>

      <div className="space-y-5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Address line 1
          <input className={inputClassName} name="address_line1" autoComplete="address-line1" placeholder="Flat / House No. / Building / Street" required />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Address line 2 <span className="font-normal normal-case text-slate-400">(optional)</span>
          <input className={inputClassName} name="address_line2" autoComplete="address-line2" placeholder="Apartment / Area / Locality" />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Landmark <span className="font-normal normal-case text-slate-400">(optional)</span>
          <input className={inputClassName} name="landmark" placeholder="Nearby landmark" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          City
          <input className={inputClassName} name="city" autoComplete="address-level2" required />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          State
          <input className={inputClassName} name="state" autoComplete="address-level1" required />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          PIN code
          <input className={inputClassName} name="pincode" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} autoComplete="postal-code" placeholder="6 digits" required />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Latitude <span className="font-normal normal-case text-slate-400">(optional)</span>
          <input className={inputClassName} name="latitude" type="number" min="-90" max="90" step="any" inputMode="decimal" />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Longitude <span className="font-normal normal-case text-slate-400">(optional)</span>
          <input className={inputClassName} name="longitude" type="number" min="-180" max="180" step="any" inputMode="decimal" />
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm transition hover:bg-slate-50">
        <input className="mt-0.5 size-4 rounded accent-brand-navy" name="is_default" type="checkbox" />
        <span>
          <span className="block font-semibold text-slate-900">Make this my default address</span>
          <span className="mt-0.5 block text-xs text-slate-500">Automatically select this address for pickup & delivery.</span>
        </span>
      </label>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Link
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
          href="/addresses"
        >
          Cancel
        </Link>
        <button
          className="rounded-lg bg-brand-navy px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-blue-deep focus:outline-none focus:ring-2 focus:ring-brand-blue-deep/30 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving address..." : "Save address"}
        </button>
      </div>
    </form>
  );
}

"use client";

export default function InvoicePrintButton() {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-brand-navy px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-blue-deep"
        >
            Download Invoice (PDF)
        </button>
    );
}

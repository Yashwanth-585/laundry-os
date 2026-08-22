import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { adminListTicketsAction } from "@/app/actions/support-tickets";
import SupportTicketsManager from "@/components/admin/SupportTicketsManager";

export default async function AdminSupportPage() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || profile.role !== "admin") {
        redirect("/dashboard");
    }

    const result = await adminListTicketsAction();
    const tickets = result.success ? result.tickets : [];

    return (
        <main className="min-h-screen bg-sky-100/70">
            <div className="mx-auto max-w-[1200px] px-4 py-8 pb-20 sm:px-5 lg:px-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                            Administration
                        </p>
                        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                            Support Tickets
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                            Customer-raised complaints about missing or damaged items. Review the
                            evidence and take action.
                        </p>
                    </div>

                    <a
                        href="/admin"
                        className="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-brand-blue-deep/30 hover:text-brand-blue-deep"
                    >
                        ← Back to Dashboard
                    </a>
                </header>

                <section className="mt-8">
                    <SupportTicketsManager tickets={tickets as never} />
                </section>
            </div>
        </main>
    );
}

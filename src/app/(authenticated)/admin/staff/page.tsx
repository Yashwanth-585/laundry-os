import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import AddStaffForm from "./AddStaffForm";

export default async function StaffManagementPage() {
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

    // Staff listing requires the admin client: profiles RLS only
    // allows a user to read their own row, and profiles has no
    // email column (email lives on auth.users), so we also need
    // the admin API to resolve it.
    const admin = createAdminClient();

    const { data: staffProfiles, error: staffError } = await admin
        .from("profiles")
        .select("id, full_name, phone, created_at")
        .eq("role", "vendor")
        .order("created_at", { ascending: false });

    if (staffError) {
        console.error("STAFF LIST ERROR:", staffError);
    }

    const { data: userList, error: userListError } =
        await admin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
        });

    if (userListError) {
        console.error("STAFF USER LIST ERROR:", userListError);
    }

    const authUserMap = new Map(
        (userList?.users ?? []).map((authUser) => [
            authUser.id,
            authUser,
        ]),
    );

    const staff = (staffProfiles ?? []).map((staffProfile) => {
        const authUser = authUserMap.get(staffProfile.id);

        return {
            id: staffProfile.id,
            fullName: staffProfile.full_name,
            phone: staffProfile.phone,
            email: authUser?.email ?? null,
            createdAt: staffProfile.created_at,
            isPending: !authUser?.last_sign_in_at,
        };
    });

    return (
        <main className="min-h-screen bg-sky-100/70">
            <div className="mx-auto max-w-[1500px] px-4 py-8 pb-20 sm:px-5 lg:px-6">
                {/* Header */}
                <header>
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-deep">
                        Administration
                    </p>

                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                        Staff Management
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                        Invite and manage facility staff accounts.
                    </p>
                </header>

                {/* Add staff */}
                <div className="mt-8">
                    <AddStaffForm />
                </div>

                {/* Staff list */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                        <div>
                            <h2 className="font-bold text-slate-900">
                                Facility Staff
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Everyone with access to the Staff
                                Dashboard.
                            </p>
                        </div>

                        <span className="text-xs font-semibold text-slate-400">
                            {staff.length}{" "}
                            {staff.length === 1
                                ? "account"
                                : "accounts"}
                        </span>
                    </div>

                    {staff.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {staff.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900">
                                            {member.fullName ||
                                                "Unnamed staff"}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                            {member.email}
                                            {member.phone
                                                ? ` · ${member.phone}`
                                                : ""}
                                        </p>
                                    </div>

                                    <span
                                        className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold ${member.isPending
                                            ? "border-amber-100 bg-amber-50 text-amber-700"
                                            : "border-emerald-100 bg-emerald-50 text-emerald-700"
                                            }`}
                                    >
                                        {member.isPending
                                            ? "Invited (pending)"
                                            : "Active"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="px-6 py-12 text-center text-sm text-slate-500">
                            No staff accounts yet.
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
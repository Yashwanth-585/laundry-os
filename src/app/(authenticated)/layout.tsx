import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { AuthenticatedHeader } from "@/components/layout/authenticated-header";
import { createClient } from "@/lib/supabase/server";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userEmail =
    typeof data.claims.email === "string"
      ? data.claims.email
      : undefined;

  const userId =
    typeof data.claims.sub === "string"
      ? data.claims.sub
      : null;

  if (!userId) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    redirect("/dashboard");
  }

  const role = profile.role as
    | "admin"
    | "delivery_partner"
    | "customer"
    | "vendor";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AuthenticatedHeader
        userEmail={userEmail}
        role={role}
      />

      <div className="flex-1">{children}</div>
    </div>
  );
}
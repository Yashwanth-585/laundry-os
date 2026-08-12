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

  const userEmail = typeof data.claims.email === "string" ? data.claims.email : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AuthenticatedHeader userEmail={userEmail} />
      <div className="flex-1">{children}</div>
    </div>
  );
}

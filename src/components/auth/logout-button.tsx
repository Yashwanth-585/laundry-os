"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    const { error } = await createClient().auth.signOut({ scope: "local" });

    if (!error) {
      router.replace("/");
      router.refresh();
    } else {
      setIsSigningOut(false);
    }
  }

  return (
    <button
      className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-blue-deep/20 disabled:cursor-not-allowed disabled:opacity-60"
      onClick={handleSignOut}
      disabled={isSigningOut}
      type="button"
    >
      {isSigningOut ? "Signing out..." : "Sign out"}
    </button>
  );
}

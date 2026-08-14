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
      className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-brand-blue-deep/5 hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-blue-deep/20 disabled:cursor-not-allowed disabled:opacity-60"
      onClick={handleSignOut}
      disabled={isSigningOut}
      type="button"
    >
      {isSigningOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
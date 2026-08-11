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
      router.replace("/login");
      router.refresh();
    } else {
      setIsSigningOut(false);
    }
  }

  return <button className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800" onClick={handleSignOut} disabled={isSigningOut} type="button">{isSigningOut ? "Signing out..." : "Sign out"}</button>;
}

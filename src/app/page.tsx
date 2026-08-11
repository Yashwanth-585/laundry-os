import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <span className="text-lg font-semibold tracking-tight">LaundryOS</span>
        <LogoutButton />
      </header>
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-16 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Laundry management, simplified</p>
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">Keep every laundry operation in motion.</h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">LaundryOS gives your team one calm place to organize the day ahead.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link className="rounded-lg bg-zinc-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200" href="/signup">Create account</Link>
          <Link className="rounded-lg border border-zinc-300 px-5 py-3 text-center text-sm font-semibold transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800" href="/login">Sign in</Link>
        </div>
      </section>
    </main>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type AuthFormProps = { mode: "login" | "signup" };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLogin = mode === "login";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const supabase = createClient();
    const { data, error: authError } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setIsSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (isLogin || data.session) {
      router.replace("/");
      router.refresh();
      return;
    }

    setMessage("Check your email to confirm your account, then sign in.");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="inline-block transition opacity-95 hover:opacity-100">
            <Image
              src="/brand/washland-logo.png"
              alt="WashLand"
              width={140}
              height={140}
              className="h-20 w-auto object-contain"
              priority
            />
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-brand-navy">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isLogin
              ? "Sign in to manage your laundry operations."
              : "Get started with WashLand LaundryOS."}
          </p>
        </div>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-700">
            Email address
            <input
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base outline-none transition focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/20"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base outline-none transition focus:border-brand-blue-deep focus:ring-2 focus:ring-brand-blue-deep/20"
              name="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={6}
              required
            />
          </label>

          {error ? (
            <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-700 border border-emerald-200" role="status">
              {message}
            </p>
          ) : null}

          <button
            className="w-full rounded-lg bg-brand-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-blue-deep focus:outline-none focus:ring-2 focus:ring-brand-blue-deep/30 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          {isLogin ? "New to WashLand?" : "Already have an account?"}{" "}
          <Link
            className="font-semibold text-brand-blue-deep hover:underline"
            href={isLogin ? "/signup" : "/login"}
          >
            {isLogin ? "Create an account" : "Sign in"}
          </Link>
        </p>
      </section>
    </main>
  );
}

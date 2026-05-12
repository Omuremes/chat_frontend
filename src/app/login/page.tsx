"use client";

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { clearAuthTokenCache, primeAuthTokenCache } from "@/lib/api";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { firebaseUser, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && firebaseUser) router.replace("/chat");
  }, [firebaseUser, loading, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      clearAuthTokenCache();
      const auth = getFirebaseAuth();
      if (mode === "register") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName.trim()) {
          await updateProfile(credential.user, { displayName: displayName.trim() });
        }
        const token = await credential.user.getIdToken(true);
        primeAuthTokenCache(credential.user, token);
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const token = await credential.user.getIdToken(true);
        primeAuthTokenCache(credential.user, token);
      }
      router.replace("/chat");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 dark:bg-slate-900">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Chat Website</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{mode === "login" ? "Sign in to continue." : "Create your chat account."}</p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-md bg-slate-100 p-1 dark:bg-slate-900">
          <button type="button" onClick={() => setMode("login")} className={`rounded-md py-2 text-sm ${mode === "login" ? "bg-white shadow-sm dark:bg-slate-800" : ""}`}>
            Login
          </button>
          <button type="button" onClick={() => setMode("register")} className={`rounded-md py-2 text-sm ${mode === "register" ? "bg-white shadow-sm dark:bg-slate-800" : ""}`}>
            Register
          </button>
        </div>

        {mode === "register" ? (
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium">Display name</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-teal-400 dark:border-slate-700 dark:bg-slate-900" />
          </label>
        ) : null}

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">Email</span>
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-teal-400 dark:border-slate-700 dark:bg-slate-900" />
        </label>

        <label className="mb-5 block">
          <span className="mb-1 block text-sm font-medium">Password</span>
          <input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-teal-400 dark:border-slate-700 dark:bg-slate-900" />
        </label>

        {error ? <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

        <button type="submit" disabled={submitting} className="h-11 w-full rounded-md bg-teal-600 font-medium text-white transition hover:bg-teal-500 disabled:opacity-60">
          {submitting ? "Please wait..." : mode === "login" ? "Login" : "Register"}
        </button>
      </form>
    </main>
  );
}

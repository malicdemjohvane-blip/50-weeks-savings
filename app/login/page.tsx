"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      /*
       * Our Supabase authentication uses email/password.
       * For now, username is converted to the email format
       * used when creating members.
       */
      const email = username.includes("@")
        ? username.trim()
        : `${username.trim()}@lets-save-joh.local`;

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Unable to connect to the server.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0d1c] flex items-center justify-center px-6">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="text-6xl mb-4">💰</div>

          <h1 className="text-4xl font-bold text-white">
            Let&apos;s Save Joh
          </h1>

          <p className="text-[#a8a8c0] mt-2">
            50 Weeks Savings Challenge
          </p>
        </div>

        <div className="bg-[#19192d] rounded-3xl p-8 shadow-2xl">

          <h2 className="text-2xl font-bold text-white mb-6">
            Welcome back 👋
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-[#c8c8d8] mb-2">
                Username or Email
              </label>

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="Enter your username"
                required
                className="w-full rounded-xl bg-[#25253d] border border-[#353550] px-4 py-3 text-white outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#c8c8d8] mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                required
                className="w-full rounded-xl bg-[#25253d] border border-[#353550] px-4 py-3 text-white outline-none focus:border-purple-500"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-4 py-3 font-bold text-white transition"
            >
              {loading ? "Signing in..." : "Log In"}
            </button>

          </form>

          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              ← Back to home
            </a>
          </div>

        </div>
      </div>
    </main>
  );
}

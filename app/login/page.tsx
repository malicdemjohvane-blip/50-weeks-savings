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
    <main className="min-h-screen w-full bg-[#0d0d1c] flex items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md">

        {/* Logo / Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">
            💰
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Let&apos;s Save Joh
          </h1>

          <p className="text-sm sm:text-base text-[#a8a8c0] mt-2">
            50 Weeks Savings Challenge
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full bg-[#19192d] rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl">

          <h2 className="text-xl sm:text-2xl font-bold text-white mb-5 sm:mb-6">
            Welcome back 👋
          </h2>

          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">

            {/* Username */}
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
                autoComplete="username"
                required
                className="w-full min-h-12 rounded-xl bg-[#25253d] border border-[#353550] px-4 py-3 text-base text-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>

            {/* Password */}
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
                autoComplete="current-password"
                required
                className="w-full min-h-12 rounded-xl bg-[#25253d] border border-[#353550] px-4 py-3 text-base text-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300 break-words">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-12 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 px-4 py-3 font-bold text-white transition"
            >
              {loading ? "Signing in..." : "Log In"}
            </button>

          </form>

          {/* Back Home */}
          <div className="mt-5 sm:mt-6 text-center">
            <a
              href="/"
              className="inline-block py-2 text-sm text-purple-400 hover:text-purple-300"
            >
              ← Back to home
            </a>
          </div>

        </div>
      </div>
    </main>
  );
}

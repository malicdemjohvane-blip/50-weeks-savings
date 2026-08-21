"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, role, active")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();

      setError(
        "Your account profile could not be found. Please contact the administrator."
      );

      setLoading(false);
      return;
    }

    if (!profile.active) {
      await supabase.auth.signOut();

      setError(
        "Your account is currently inactive. Please contact the administrator."
      );

      setLoading(false);
      return;
    }

    if (profile.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="logo">💰</div>

        <h1>Let&apos;s Save Joh</h1>

        <p className="subtitle">
          50 Weeks Savings Challenge
        </p>

        <div className="challenge-badge">
          <span>✨</span>
          Save. Track. Achieve.
        </div>

        <form onSubmit={handleLogin}>
          <label htmlFor="email">
            Email
          </label>

          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />

          <label htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        <div className="login-footer">
          <span>50 weeks</span>
          <span>•</span>
          <span>One savings goal</span>
          <span>•</span>
          <span>Let&apos;s go! 🚀</span>
        </div>
      </div>
    </main>
  );
}

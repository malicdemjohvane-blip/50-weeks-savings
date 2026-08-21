"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Profile = {
  id: string;
  username: string;
  role: "user" | "admin";
  active: boolean;
};

type Saving = {
  id: number;
  week: number;
  amount: number;
  saved: boolean;
};

export default function DashboardPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profileData, error: profileError } =
      await supabase
        .from("profiles")
        .select("id, username, role, active")
        .eq("id", user.id)
        .single();

    if (profileError || !profileData) {
      setMessage("Unable to load your profile.");
      setLoading(false);
      return;
    }

    setProfile(profileData);

    const { data: savingsData, error: savingsError } =
      await supabase
        .from("savings")
        .select("id, week, amount, saved")
        .eq("user_id", user.id)
        .order("week");

    if (savingsError) {
      setMessage(savingsError.message);
    } else {
      setSavings(savingsData || []);
    }

    setLoading(false);
  }

  async function saveWeek(week: number) {
    const amountText = window.prompt(
      `How much did you save for Week ${week}?`
    );

    if (!amountText) return;

    const amount = Number(amountText);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid amount greater than zero.");
      return;
    }

    const { error } = await supabase
      .from("savings")
      .update({
        amount,
        saved: true,
      })
      .eq("week", week)
      .eq("user_id", profile?.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadDashboard();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const completedWeeks = savings.filter(
    (saving) => saving.saved
  ).length;

  const totalSaved = savings
    .filter((saving) => saving.saved)
    .reduce(
      (total, saving) => total + Number(saving.amount),
      0
    );

  const progress =
    savings.length > 0
      ? Math.round((completedWeeks / 50) * 100)
      : 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d0d1c] text-white flex items-center justify-center">
        <div className="text-lg">
          Loading your savings...
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#0d0d1c] text-white flex items-center justify-center">
        <div>{message || "Profile not found."}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0d1c] text-white px-6 py-8">

      <div className="max-w-6xl mx-auto">

        {/* HEADER */}

        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>
            <p className="text-[#a8a8c0]">
              Welcome back 👋
            </p>

            <h1 className="text-3xl md:text-4xl font-bold">
              {profile.username}
            </h1>
          </div>

          <button
            onClick={logout}
            className="rounded-xl bg-[#24243a] px-5 py-3 hover:bg-[#30304b] transition"
          >
            Sign Out
          </button>

        </header>

        {/* STATS */}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

          <div className="bg-[#19192d] rounded-2xl p-6">
            <p className="text-[#a8a8c0] text-sm">
              Total Saved
            </p>

            <p className="text-3xl font-bold mt-2">
              ₱{totalSaved.toLocaleString(
                "en-PH",
                {
                  minimumFractionDigits: 2,
                }
              )}
            </p>
          </div>

          <div className="bg-[#19192d] rounded-2xl p-6">
            <p className="text-[#a8a8c0] text-sm">
              Weeks Completed
            </p>

            <p className="text-3xl font-bold mt-2">
              {completedWeeks}/50
            </p>
          </div>

          <div className="bg-[#19192d] rounded-2xl p-6">
            <p className="text-[#a8a8c0] text-sm">
              Progress
            </p>

            <p className="text-3xl font-bold mt-2">
              {progress}%
            </p>
          </div>

        </section>

        {/* PROGRESS */}

        <section className="bg-[#19192d] rounded-2xl p-6 mb-8">

          <div className="flex justify-between mb-3">
            <span className="font-semibold">
              50 Week Challenge
            </span>

            <span className="text-[#a8a8c0]">
              {completedWeeks} / 50
            </span>
          </div>

          <div className="h-4 bg-[#292940] rounded-full overflow-hidden">

            <div
              className="h-full bg-yellow-400 transition-all"
              style={{
                width: `${progress}%`,
              }}
            />

          </div>

        </section>

        {/* WEEKS */}

        <section>

          <div className="flex items-center justify-between mb-5">

            <div>
              <h2 className="text-2xl font-bold">
                Your 50 Weeks
              </h2>

              <p className="text-[#a8a8c0]">
                Save a little every week. Keep going. 🚀
              </p>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

            {savings.map((saving) => (

              <div
                key={saving.id}
                className={`rounded-2xl p-5 border ${
                  saving.saved
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-[#19192d] border-[#292940]"
                }`}
              >

                <div className="flex justify-between items-center">

                  <span className="font-bold">
                    Week {saving.week}
                  </span>

                  {saving.saved && (
                    <span>✅</span>
                  )}

                </div>

                <p className="text-2xl font-bold mt-5">
                  {saving.saved
                    ? `₱${Number(
                        saving.amount
                      ).toLocaleString(
                        "en-PH",
                        {
                          minimumFractionDigits: 2,
                        }
                      )}`
                    : "Not saved"}
                </p>

                {!saving.saved && (

                  <button
                    onClick={() =>
                      saveWeek(saving.week)
                    }
                    className="w-full mt-4 rounded-xl bg-yellow-400 text-black font-bold py-2 hover:bg-yellow-300 transition"
                  >
                    Save Week
                  </button>

                )}

              </div>

            ))}

          </div>

        </section>

      </div>

    </main>
  );
}

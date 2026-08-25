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
  approval_status: "not_saved" | "pending" | "approved" | "rejected";
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
    setMessage("");

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
        .select(
          "id, week, amount, saved, approval_status"
        )
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
    if (!profile) return;

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
        saved: false,
        approval_status: "pending",
      })
      .eq("week", week)
      .eq("user_id", profile.id);

    if (error) {
      alert(error.message);
      return;
    }

    setMessage(
      `Week ${week} submitted for admin approval.`
    );

    await loadDashboard();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const approvedSavings = savings.filter(
    (saving) =>
      saving.approval_status === "approved" &&
      saving.saved === true
  );

  const pendingSavings = savings.filter(
    (saving) =>
      saving.approval_status === "pending"
  );

  const completedWeeks = approvedSavings.length;

  const totalSaved = approvedSavings.reduce(
    (total, saving) =>
      total + Number(saving.amount || 0),
    0
  );

  const progress =
    Math.round((completedWeeks / 50) * 100);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d0d1c] text-white flex items-center justify-center">
        <p>Loading your savings...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#0d0d1c] text-white flex items-center justify-center">
        <p>{message || "Profile not found."}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0d1c] text-white px-4 py-6 sm:px-6">

      <div className="max-w-6xl mx-auto">

        {/* HEADER */}

        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">

          <div>
            <p className="text-sm text-[#a8a8c0]">
              Welcome back 👋
            </p>

            <h1 className="text-3xl font-bold">
              {profile.username}
            </h1>
          </div>

          <button
            onClick={logout}
            className="rounded-xl bg-[#24243a] px-5 py-3 hover:bg-[#30304b]"
          >
            Sign Out
          </button>

        </header>

        {/* MESSAGE */}

        {message && (
          <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-300">
            {message}
          </div>
        )}

        {/* STATS */}

        <section className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">

          <div className="bg-[#19192d] rounded-2xl p-5">
            <p className="text-sm text-[#a8a8c0]">
              Total Saved
            </p>

            <p className="text-2xl font-bold mt-2">
              ₱
              {totalSaved.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="bg-[#19192d] rounded-2xl p-5">
            <p className="text-sm text-[#a8a8c0]">
              Approved
            </p>

            <p className="text-2xl font-bold mt-2 text-green-400">
              {completedWeeks}/50
            </p>
          </div>

          <div className="bg-[#19192d] rounded-2xl p-5">
            <p className="text-sm text-[#a8a8c0]">
              Pending
            </p>

            <p className="text-2xl font-bold mt-2 text-yellow-400">
              {pendingSavings.length}
            </p>
          </div>

          <div className="bg-[#19192d] rounded-2xl p-5">
            <p className="text-sm text-[#a8a8c0]">
              Progress
            </p>

            <p className="text-2xl font-bold mt-2">
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

            <span className="text-sm text-[#a8a8c0]">
              {completedWeeks} / 50
            </span>

          </div>

          <div className="h-4 bg-[#292940] rounded-full overflow-hidden">

            <div
              className="h-full bg-green-400 transition-all"
              style={{
                width: `${progress}%`,
              }}
            />

          </div>

        </section>

        {/* WEEKS */}

        <section>

          <h2 className="text-2xl font-bold mb-2">
            Your 50 Weeks
          </h2>

          <p className="text-[#a8a8c0] mb-5">
            Save a little every week. Keep going. 🚀
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">

            {savings.map((saving) => {

              const isApproved =
                saving.approval_status === "approved" &&
                saving.saved === true;

              const isPending =
                saving.approval_status === "pending";

              const isRejected =
                saving.approval_status === "rejected";

              return (
                <div
                  key={saving.id}
                  className={`rounded-2xl p-5 border ${
                    isApproved
                      ? "bg-green-500/10 border-green-500/30"
                      : isPending
                      ? "bg-yellow-500/10 border-yellow-500/30"
                      : isRejected
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-[#19192d] border-[#292940]"
                  }`}
                >

                  <div className="flex justify-between">

                    <span className="font-bold">
                      Week {saving.week}
                    </span>

                    {isApproved && (
                      <span>🟢</span>
                    )}

                    {isPending && (
                      <span>🟡</span>
                    )}

                    {isRejected && (
                      <span>🔴</span>
                    )}

                  </div>

                  <p className="text-2xl font-bold mt-5">

                    {isApproved || isPending
                      ? `₱${Number(
                          saving.amount
                        ).toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                        })}`
                      : "Not saved"}

                  </p>

                  {/* APPROVED */}

                  {isApproved && (
                    <p className="text-green-400 text-sm font-semibold mt-2">
                      ✅ Approved
                    </p>
                  )}

                  {/* PENDING */}

                  {isPending && (
                    <p className="text-yellow-400 text-sm font-semibold mt-2">
                      ⏳ Waiting for approval
                    </p>
                  )}

                  {/* REJECTED */}

                  {isRejected && (
                    <div>
                      <p className="text-red-400 text-sm font-semibold mt-2">
                        ❌ Rejected
                      </p>

                      <button
                        onClick={() =>
                          saveWeek(saving.week)
                        }
                        className="w-full mt-4 rounded-xl bg-yellow-400 text-black font-bold py-3 hover:bg-yellow-300"
                      >
                        Resubmit
                      </button>
                    </div>
                  )}

                  {/* NOT SAVED */}

                  {saving.approval_status === "not_saved" && (
                    <button
                      onClick={() =>
                        saveWeek(saving.week)
                      }
                      className="w-full mt-4 rounded-xl bg-yellow-400 text-black font-bold py-3 hover:bg-yellow-300"
                    >
                      💰 Save Week
                    </button>
                  )}

                </div>
              );
            })}

          </div>

        </section>

      </div>

    </main>
  );
}

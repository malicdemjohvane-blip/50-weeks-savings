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
  approval_status: "not_saved" | "pending" | "approved";
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

  // ==========================================
  // SAVE WEEK
  // ==========================================

  async function saveWeek(week: number) {
    const amountText = window.prompt(
      `How much did you save for Week ${week}?`
    );

    if (!amountText) {
      return;
    }

    const amount = Number(amountText);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid amount greater than zero.");
      return;
    }

    if (!profile) {
      alert("Your profile is not loaded.");
      return;
    }

    const { error } = await supabase
      .from("savings")
      .update({
        amount: amount,
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

  // ==========================================
  // LOGOUT
  // ==========================================

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // ==========================================
  // CALCULATIONS
  // ONLY APPROVED SAVINGS COUNT
  // ==========================================

  const completedWeeks = savings.filter(
    (saving) =>
      saving.approval_status === "approved" &&
      saving.saved === true
  ).length;

  const totalSaved = savings
    .filter(
      (saving) =>
        saving.approval_status === "approved" &&
        saving.saved === true
    )
    .reduce(
      (total, saving) =>
        total + Number(saving.amount || 0),
      0
    );

  const pendingWeeks = savings.filter(
    (saving) =>
      saving.approval_status === "pending"
  ).length;

  const progress =
    savings.length > 0
      ? Math.round((completedWeeks / 50) * 100)
      : 0;

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="min-h-screen w-full bg-[#0d0d1c] text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">
            💰
          </div>

          <p className="text-base sm:text-lg text-[#a8a8c0]">
            Loading your savings...
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen w-full bg-[#0d0d1c] text-white flex items-center justify-center px-4">
        <div className="text-center">
          {message || "Profile not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#0d0d1c] text-white px-4 py-5 sm:px-6 sm:py-8">

      <div className="w-full max-w-6xl mx-auto">

        {/* ==========================================
            HEADER
        ========================================== */}

        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">

          <div className="min-w-0">

            <p className="text-sm sm:text-base text-[#a8a8c0]">
              Welcome back 👋
            </p>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold break-words">
              {profile.username}
            </h1>

          </div>

          <button
            onClick={logout}
            className="w-full sm:w-auto min-h-11 rounded-xl bg-[#24243a] px-5 py-3 text-sm sm:text-base font-medium hover:bg-[#30304b] transition"
          >
            Sign Out
          </button>

        </header>

        {/* ==========================================
            MESSAGE
        ========================================== */}

        {message && (
          <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 sm:px-5 py-4 text-sm sm:text-base text-yellow-200">
            {message}
          </div>
        )}

        {/* ==========================================
            STATS
        ========================================== */}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">

          {/* TOTAL */}

          <div className="bg-[#19192d] rounded-2xl p-5 sm:p-6">

            <p className="text-[#a8a8c0] text-sm">
              Total Saved
            </p>

            <p className="text-2xl sm:text-3xl font-bold mt-2 break-words">
              ₱
              {totalSaved.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
              })}
            </p>

          </div>

          {/* COMPLETED */}

          <div className="bg-[#19192d] rounded-2xl p-5 sm:p-6">

            <p className="text-[#a8a8c0] text-sm">
              Approved Weeks
            </p>

            <p className="text-2xl sm:text-3xl font-bold mt-2">
              {completedWeeks}/50
            </p>

          </div>

          {/* PENDING */}

          <div className="bg-[#19192d] rounded-2xl p-5 sm:p-6">

            <p className="text-[#a8a8c0] text-sm">
              Pending Approval
            </p>

            <p className="text-2xl sm:text-3xl font-bold mt-2 text-yellow-400">
              {pendingWeeks}
            </p>

          </div>

          {/* PROGRESS */}

          <div className="bg-[#19192d] rounded-2xl p-5 sm:p-6">

            <p className="text-[#a8a8c0] text-sm">
              Progress
            </p>

            <p className="text-2xl sm:text-3xl font-bold mt-2">
              {progress}%
            </p>

          </div>

        </section>

        {/* ==========================================
            PROGRESS BAR
        ========================================== */}

        <section className="bg-[#19192d] rounded-2xl p-5 sm:p-6 mb-6 sm:mb-8">

          <div className="flex items-center justify-between gap-3 mb-3">

            <span className="font-semibold">
              50 Week Challenge
            </span>

            <span className="text-sm text-[#a8a8c0]">
              {completedWeeks} / 50
            </span>

          </div>

          <div className="h-3 sm:h-4 bg-[#292940] rounded-full overflow-hidden">

            <div
              className="h-full bg-yellow-400 transition-all duration-500"
              style={{
                width: `${progress}%`,
              }}
            />

          </div>

        </section>

        {/* ==========================================
            WEEKS
        ========================================== */}

        <section>

          <div className="mb-4 sm:mb-5">

            <h2 className="text-xl sm:text-2xl font-bold">
              Your 50 Weeks
            </h2>

            <p className="text-sm sm:text-base text-[#a8a8c0] mt-1">
              Save a little every week. Keep going. 🚀
            </p>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">

            {savings.map((saving) => {

              const isApproved =
                saving.approval_status ===
                  "approved" &&
                saving.saved === true;

              const isPending =
                saving.approval_status ===
                "pending";

              return (
                <div
                  key={saving.id}
                  className={`min-w-0 rounded-2xl p-4 sm:p-5 border ${
                    isApproved
                      ? "bg-green-500/10 border-green-500/30"
                      : isPending
                      ? "bg-yellow-500/10 border-yellow-500/40"
                      : "bg-[#19192d] border-[#292940]"
                  }`}
                >

                  {/* WEEK HEADER */}

                  <div className="flex justify-between items-center gap-2">

                    <span className="font-bold">
                      Week {saving.week}
                    </span>

                    {isApproved && (
                      <span>
                        🟢
                      </span>
                    )}

                    {isPending && (
                      <span>
                        🟡
                      </span>
                    )}

                    {!isApproved && !isPending && (
                      <span>
                        🔴
                      </span>
                    )}

                  </div>

                  {/* AMOUNT */}

                  <p className="text-xl sm:text-2xl font-bold mt-4">

                    {isApproved
                      ? `₱${Number(
                          saving.amount
                        ).toLocaleString(
                          "en-PH",
                          {
                            minimumFractionDigits: 2,
                          }
                        )}`
                      : isPending
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

                  {/* STATUS */}

                  {isApproved && (
                    <p className="text-sm text-green-400 mt-2 font-semibold">
                      ✅ Approved
                    </p>
                  )}

                  {isPending && (
                    <p className="text-sm text-yellow-400 mt-2 font-semibold">
                      ⏳ Waiting for approval
                    </p>
                  )}

                  {!isApproved && !isPending && (
                    <p className="text-sm text-red-400 mt-2 font-semibold">
                      🔴 Not saved
                    </p>
                  )}

                  {/* SAVE BUTTON */}

                  {!isApproved && !isPending && (

                    <button
                      onClick={() =>
                        saveWeek(saving.week)
                      }
                      className="w-full min-h-11 mt-4 rounded-xl bg-yellow-400 text-black font-bold text-sm sm:text-base py-2.5 hover:bg-yellow-300 active:bg-yellow-500 transition"
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

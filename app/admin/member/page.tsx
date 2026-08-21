"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { createClient } from "@/lib/supabase";

type SavingsRow = {
  id: string;
  user_id: string;
  week: number;
  amount: number;
  saved: boolean;
};

type Member = {
  id: string;
  username: string;
  role: "user" | "admin";
  active: boolean;
};

function AdminMemberContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const userId = searchParams.get("id");

  const [member, setMember] = useState<Member | null>(null);
  const [savings, setSavings] = useState<SavingsRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [editingWeek, setEditingWeek] =
    useState<number | null>(null);

  const [editAmount, setEditAmount] =
    useState("");

  useEffect(() => {
    if (!userId) {
      setMessage("No member selected.");
      setLoading(false);
      return;
    }

    loadMember();
  }, [userId]);

  async function loadMember() {
    if (!userId) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      /*
       * Check that an admin is logged in.
       */

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      /*
       * Check the logged-in user's profile.
       */

      const {
        data: adminProfile,
        error: adminProfileError,
      } = await supabase
        .from("profiles")
        .select("id, username, role, active")
        .eq("id", user.id)
        .single();

      if (
        adminProfileError ||
        !adminProfile
      ) {
        setMessage(
          "Unable to verify your account."
        );
        setLoading(false);
        return;
      }

      if (adminProfile.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      /*
       * Load selected member.
       */

      const {
        data: memberData,
        error: memberError,
      } = await supabase
        .from("profiles")
        .select(
          "id, username, role, active"
        )
        .eq("id", userId)
        .single();

      if (
        memberError ||
        !memberData
      ) {
        setMessage(
          "Member could not be found."
        );
        setLoading(false);
        return;
      }

      if (memberData.role !== "user") {
        setMessage(
          "This account is not a member account."
        );

        setMember(memberData);
        setLoading(false);
        return;
      }

      /*
       * Load the member's savings.
       */

      const {
        data: savingsData,
        error: savingsError,
      } = await supabase
        .from("savings")
        .select(
          "id, user_id, week, amount, saved"
        )
        .eq("user_id", userId)
        .order("week", {
          ascending: true,
        });

      if (savingsError) {
        setMessage(
          savingsError.message
        );
        setLoading(false);
        return;
      }

      setMember(memberData);
      setSavings(savingsData || []);
      setLoading(false);
    } catch (error) {
      console.error(error);

      setMessage(
        "Something went wrong while loading the member."
      );

      setLoading(false);
    }
  }

  /*
   * Create a complete 50-week list.
   *
   * This makes sure Week 1 through Week 50
   * are displayed even if a savings row is missing.
   */

  const weeks: SavingsRow[] = Array.from(
    { length: 50 },
    (_, index) => {
      const weekNumber = index + 1;

      const existing = savings.find(
        (row) => row.week === weekNumber
      );

      if (existing) {
        return existing;
      }

      return {
        id: "",
        user_id: userId || "",
        week: weekNumber,
        amount: 0,
        saved: false,
      };
    }
  );

  const totalSaved = savings.reduce(
    (total, row) => {
      if (!row.saved) {
        return total;
      }

      return (
        total + Number(row.amount || 0)
      );
    },
    0
  );

  const completedWeeks = savings.filter(
    (row) => row.saved
  ).length;

  const remainingWeeks =
    50 - completedWeeks;

  const progress =
    (completedWeeks / 50) * 100;

  function startEditing(
    row: SavingsRow
  ) {
    setEditingWeek(row.week);

    setEditAmount(
      row.amount > 0
        ? String(row.amount)
        : ""
    );

    setMessage("");
  }

  function cancelEditing() {
    setEditingWeek(null);
    setEditAmount("");
  }

  async function saveEdit(
    row: SavingsRow
  ) {
    if (!userId) {
      return;
    }

    const amount = Number(
      editAmount
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setMessage(
        "Please enter an amount greater than ₱0."
      );

      return;
    }

    setMessage("");

    try {
      /*
       * Existing savings row.
       */

      if (row.id) {
        const {
          error,
        } = await supabase
          .from("savings")
          .update({
            amount,
            saved: true,
          })
          .eq("id", row.id)
          .eq(
            "user_id",
            userId
          );

        if (error) {
          setMessage(
            error.message
          );
          return;
        }
      }

      /*
       * Missing savings row.
       *
       * This handles the case where the
       * database does not yet contain the week.
       */

      else {
        const {
          error,
        } = await supabase
          .from("savings")
          .insert({
            user_id: userId,
            week: row.week,
            amount,
            saved: true,
          });

        if (error) {
          setMessage(
            error.message
          );
          return;
        }
      }

      setMessage(
        `Week ${row.week} updated successfully.`
      );

      cancelEditing();

      await loadMember();
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to update this week."
      );
    }
  }

  async function resetSavings() {
    if (!userId || !member) {
      return;
    }

    const confirmed =
      window.confirm(
        `Reset all savings for ${member.username}?\n\nAll 50 weeks will be marked as not saved.`
      );

    if (!confirmed) {
      return;
    }

    setMessage("");

    try {
      const {
        error,
      } = await supabase.rpc(
        "admin_reset_savings",
        {
          target_user_id:
            userId,
        }
      );

      if (error) {
        setMessage(
          error.message
        );
        return;
      }

      setEditingWeek(null);
      setEditAmount("");

      setMessage(
        "All savings have been reset successfully."
      );

      await loadMember();
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to reset savings."
      );
    }
  }

  async function signOut() {
    await supabase.auth.signOut();

    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d0d1c] text-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-5xl mb-4">
            💰
          </div>

          <p className="text-slate-400">
            Loading member...
          </p>
        </div>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="min-h-screen bg-[#0d0d1c] text-white px-6 py-8">
        <div className="max-w-3xl mx-auto">

          <button
            onClick={() =>
              router.push("/admin")
            }
            className="mb-8 text-purple-300 hover:text-purple-200"
          >
            ← Back to Admin
          </button>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
            <h1 className="text-xl font-bold">
              Member unavailable
            </h1>

            <p className="text-red-200 mt-2">
              {message ||
                "No member was selected."}
            </p>
          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0d1c] text-white px-6 py-8">

      <div className="max-w-6xl mx-auto">

        {/* TOP NAV */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <button
            onClick={() =>
              router.push("/admin")
            }
            className="text-purple-300 hover:text-purple-200 font-semibold"
          >
            ← Back to Admin
          </button>

          <button
            onClick={signOut}
            className="rounded-xl bg-red-500/15 px-4 py-3 text-red-300 hover:bg-red-500/25"
          >
            🚪 Sign Out
          </button>

        </div>

        {/* MEMBER HEADER */}

        <section className="mb-8">

          <p className="text-purple-400 font-semibold text-sm mb-2">
            MEMBER SAVINGS
          </p>

          <h1 className="text-4xl md:text-5xl font-bold">
            {member.username}
          </h1>

          <p className="text-slate-400 mt-2">
            50 Weeks Savings Challenge
          </p>

          {!member.active && (
            <div className="inline-flex mt-4 rounded-full bg-red-500/15 px-4 py-2 text-sm text-red-300">
              ⛔ INACTIVE MEMBER
            </div>
          )}

        </section>

        {/* MESSAGE */}

        {message && (
          <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900 px-5 py-4 text-slate-200">
            {message}
          </div>
        )}

        {/* STATISTICS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Total Saved
            </p>

            <p className="text-3xl font-bold mt-2">
              ₱{totalSaved.toFixed(2)}
            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Completed
            </p>

            <p className="text-3xl font-bold mt-2">
              {completedWeeks} / 50
            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Remaining
            </p>

            <p className="text-3xl font-bold mt-2">
              {remainingWeeks}
            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              Progress
            </p>

            <p className="text-3xl font-bold mt-2">
              {progress.toFixed(1)}%
            </p>

            <div className="mt-4 h-2 rounded-full bg-slate-800 overflow-hidden">

              <div
                className="h-full bg-purple-500 transition-all"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

          </div>

        </div>

        {/* SAVINGS SECTION */}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">

          <div className="p-6 border-b border-slate-800">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

              <div>

                <h2 className="text-2xl font-bold">
                  50 Week Savings
                </h2>

                <p className="text-slate-400 mt-1">
                  Manage {member.username}&apos;s weekly savings.
                </p>

              </div>

              <button
                onClick={resetSavings}
                className="rounded-xl bg-orange-500/15 px-4 py-3 text-orange-300 hover:bg-orange-500/25"
              >
                🔄 Reset All
              </button>

            </div>

          </div>

          {/* DESKTOP TABLE */}

          <div className="hidden md:block overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b border-slate-800 text-left text-sm text-slate-400">

                  <th className="px-6 py-4">
                    Week
                  </th>

                  <th className="px-6 py-4">
                    Amount
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                  <th className="px-6 py-4">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {weeks.map((row) => {

                  const isEditing =
                    editingWeek ===
                    row.week;

                  return (
                    <tr
                      key={row.week}
                      className="border-b border-slate-800 last:border-b-0"
                    >

                      <td className="px-6 py-5 font-semibold">
                        Week {row.week}
                      </td>

                      <td className="px-6 py-5">

                        {isEditing ? (

                          <div className="flex items-center gap-2">

                            <span className="text-slate-400">
                              ₱
                            </span>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editAmount}
                              onChange={(event) =>
                                setEditAmount(
                                  event.target.value
                                )
                              }
                              className="w-32 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-purple-500"
                              autoFocus
                            />

                          </div>

                        ) : (

                          <span className="font-semibold">
                            ₱
                            {Number(
                              row.amount || 0
                            ).toFixed(2)}
                          </span>

                        )}

                      </td>

                      <td className="px-6 py-5">

                        {row.saved ? (

                          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">
                            ✅ SAVED
                          </span>

                        ) : (

                          <span className="rounded-full bg-slate-700/50 px-3 py-1 text-sm text-slate-400">
                            NOT SAVED
                          </span>

                        )}

                      </td>

                      <td className="px-6 py-5">

                        {isEditing ? (

                          <div className="flex gap-2">

                            <button
                              onClick={() =>
                                saveEdit(row)
                              }
                              className="rounded-lg bg-emerald-500/20 px-3 py-2 text-emerald-300 hover:bg-emerald-500/30"
                            >
                              💾 Save
                            </button>

                            <button
                              onClick={
                                cancelEditing
                              }
                              className="rounded-lg bg-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-600"
                            >
                              Cancel
                            </button>

                          </div>

                        ) : (

                          <button
                            onClick={() =>
                              startEditing(row)
                            }
                            className="rounded-lg bg-purple-500/20 px-3 py-2 text-purple-300 hover:bg-purple-500/30"
                          >
                            ✏️ Edit
                          </button>

                        )}

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>

          {/* MOBILE */}

          <div className="md:hidden divide-y divide-slate-800">

            {weeks.map((row) => {

              const isEditing =
                editingWeek ===
                row.week;

              return (
                <div
                  key={row.week}
                  className="p-5"
                >

                  <div className="flex items-center justify-between">

                    <h3 className="font-bold">
                      Week {row.week}
                    </h3>

                    {row.saved ? (

                      <span className="text-sm text-emerald-300">
                        ✅ SAVED
                      </span>

                    ) : (

                      <span className="text-sm text-slate-500">
                        NOT SAVED
                      </span>

                    )}

                  </div>

                  <div className="mt-4">

                    {isEditing ? (

                      <div>

                        <label className="block text-sm text-slate-400 mb-2">
                          Amount
                        </label>

                        <div className="flex gap-2">

                          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800 px-3">
                            ₱
                          </div>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editAmount}
                            onChange={(event) =>
                              setEditAmount(
                                event.target.value
                              )
                            }
                            className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-purple-500"
                          />

                        </div>

                      </div>

                    ) : (

                      <p className="text-2xl font-bold">
                        ₱
                        {Number(
                          row.amount || 0
                        ).toFixed(2)}
                      </p>

                    )}

                  </div>

                  <div className="mt-4">

                    {isEditing ? (

                      <div className="flex gap-2">

                        <button
                          onClick={() =>
                            saveEdit(row)
                          }
                          className="flex-1 rounded-lg bg-emerald-500/20 px-3 py-3 text-emerald-300"
                        >
                          💾 Save
                        </button>

                        <button
                          onClick={
                            cancelEditing
                          }
                          className="flex-1 rounded-lg bg-slate-700 px-3 py-3 text-slate-300"
                        >
                          Cancel
                        </button>

                      </div>

                    ) : (

                      <button
                        onClick={() =>
                          startEditing(row)
                        }
                        className="w-full rounded-lg bg-purple-500/20 px-3 py-3 text-purple-300"
                      >
                        ✏️ Edit
                      </button>

                    )}

                  </div>

                </div>
              );
            })}

          </div>

        </section>

      </div>

    </main>
  );
}

/*
 * IMPORTANT:
 *
 * useSearchParams() is used inside AdminMemberContent.
 *
 * Wrapping the component in Suspense prevents the
 * Next.js production prerender error for /admin/member.
 */

export default function AdminMemberPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0d0d1c] text-white flex items-center justify-center px-6">

          <div className="text-center">

            <div className="text-5xl mb-4">
              💰
            </div>

            <p className="text-slate-400">
              Loading member...
            </p>

          </div>

        </main>
      }
    >
      <AdminMemberContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type UserSummary = {
  id: string;
  username: string;
  role: "user" | "admin";
  active: boolean;
  total_saved: number;
  completed_weeks: number;
  remaining_weeks: number;
  progress: number;
};

type Statistics = {
  total_saved: number;
  active_users: number;
  total_completed_weeks: number;
  total_users: number;
};

type PendingSaving = {
  id: number;
  user_id: string;
  week: number;
  amount: number;
  saved: boolean;
  approval_status: string;
  username: string;
};

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [pendingSavings, setPendingSavings] = useState<PendingSaving[]>(
    []
  );

  const [statistics, setStatistics] = useState<Statistics>({
    total_saved: 0,
    active_users: 0,
    total_completed_weeks: 0,
    total_users: 0,
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("id, username, role, active")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
      setMessage("Unable to load your profile.");
      setLoading(false);
      return;
    }

    if (profile.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    // -----------------------------------------
    // LOAD MEMBER SUMMARY
    // -----------------------------------------

    const { data: summaryData, error: summaryError } =
      await supabase.rpc("get_users_summary");

    if (summaryError) {
      setMessage(summaryError.message);
    } else {
      setUsers(summaryData || []);
    }

    // -----------------------------------------
    // LOAD STATISTICS
    // -----------------------------------------

    const {
      data: statisticsData,
      error: statisticsError,
    } = await supabase.rpc("get_admin_statistics");

    if (!statisticsError && statisticsData?.length) {
      setStatistics(statisticsData[0]);
    }

    // -----------------------------------------
    // LOAD PENDING SAVINGS
    // -----------------------------------------

    const { data: pendingData, error: pendingError } =
      await supabase
        .from("savings")
        .select(
          `
          id,
          user_id,
          week,
          amount,
          saved,
          approval_status,
          profiles!savings_user_id_fkey (
            username
          )
        `
        )
        .eq("approval_status", "pending")
        .order("updated_at", {
          ascending: false,
        });

    if (pendingError) {
      console.error("Pending savings error:", pendingError);
      setMessage(pendingError.message);
    } else {
      const formattedPending: PendingSaving[] =
        (pendingData || []).map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          week: item.week,
          amount: Number(item.amount || 0),
          saved: item.saved,
          approval_status: item.approval_status,
          username:
            item.profiles?.username || "Unknown Member",
        }));

      setPendingSavings(formattedPending);
    }

    setLoading(false);
  }

  // -----------------------------------------
  // APPROVE SAVING
  // -----------------------------------------

  async function approveSaving(
    savingId: number,
    username: string,
    week: number
  ) {
    const confirmed = window.confirm(
      `Approve ${username}'s Week ${week} savings?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("savings")
      .update({
        approval_status: "approved",
        saved: true,
      })
      .eq("id", savingId);

    if (error) {
      setMessage(`Approval failed: ${error.message}`);
      return;
    }

    setMessage(
      `${username}'s Week ${week} savings has been approved.`
    );

    await loadAdminData();
  }

  // -----------------------------------------
  // REJECT SAVING
  // -----------------------------------------

  async function rejectSaving(
    savingId: number,
    username: string,
    week: number
  ) {
    const confirmed = window.confirm(
      `Reject ${username}'s Week ${week} savings?\n\nThe amount will return to ₱0.00.`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("savings")
      .update({
        amount: 0,
        saved: false,
        approval_status: "not_saved",
      })
      .eq("id", savingId);

    if (error) {
      setMessage(`Rejection failed: ${error.message}`);
      return;
    }

    setMessage(
      `${username}'s Week ${week} savings was rejected.`
    );

    await loadAdminData();
  }

  // -----------------------------------------
  // RESET SAVINGS
  // -----------------------------------------

  async function resetSavings(
    userId: string,
    username: string
  ) {
    const confirmed = window.confirm(
      `Reset all savings for ${username}?\n\nAll 50 weeks will be returned to ₱0.00.`
    );

    if (!confirmed) return;

    const { error } = await supabase.rpc(
      "admin_reset_savings",
      {
        target_user_id: userId,
      }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`${username}'s savings have been reset.`);

    await loadAdminData();
  }

  // -----------------------------------------
  // DEACTIVATE
  // -----------------------------------------

  async function deactivateUser(
    userId: string,
    username: string
  ) {
    const confirmed = window.confirm(
      `Deactivate ${username}?\n\nThey will no longer be able to use the savings dashboard.`
    );

    if (!confirmed) return;

    const { error } = await supabase.rpc(
      "admin_deactivate_user",
      {
        target_user_id: userId,
      }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`${username} has been deactivated.`);

    await loadAdminData();
  }

  // -----------------------------------------
  // ACTIVATE
  // -----------------------------------------

  async function activateUser(
    userId: string,
    username: string
  ) {
    const confirmed = window.confirm(
      `Activate ${username}?`
    );

    if (!confirmed) return;

    const { error } = await supabase.rpc(
      "admin_activate_user",
      {
        target_user_id: userId,
      }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`${username} has been activated.`);

    await loadAdminData();
  }

  // -----------------------------------------
  // DELETE
  // -----------------------------------------

  async function deleteUser(
    userId: string,
    username: string
  ) {
    const confirmed = window.confirm(
      `DELETE ${username}?\n\nThis will permanently delete the member profile and savings records.\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    const { error } = await supabase.rpc(
      "admin_delete_member_profile",
      {
        target_user_id: userId,
      }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`${username} has been deleted.`);

    await loadAdminData();
  }

  // -----------------------------------------
  // SIGN OUT
  // -----------------------------------------

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // -----------------------------------------
  // LOADING
  // -----------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">💰</div>
          <p className="text-slate-400">
            Loading admin dashboard...
          </p>
        </div>
      </main>
    );
  }

  const memberUsers = users.filter(
    (member) => member.role === "user"
  );

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-slate-950 text-white px-4 py-5 sm:px-6 sm:py-8">

      <div className="w-full max-w-7xl mx-auto">

        {/* HEADER */}

        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-8">

          <div>
            <p className="text-sm text-purple-400 font-bold">
              ADMIN
            </p>

            <h1 className="text-3xl sm:text-4xl font-black mt-1">
              Savings Dashboard
            </h1>

            <p className="text-slate-400 mt-2">
              Manage Let&apos;s Save Joh
            </p>
          </div>

          <button
            onClick={signOut}
            className="w-full sm:w-auto rounded-xl bg-red-500/15 px-5 py-3 text-red-300 font-semibold hover:bg-red-500/25"
          >
            🚪 Sign Out
          </button>

        </header>

        {/* MESSAGE */}

        {message && (
          <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm text-slate-200">
            {message}
          </div>
        )}

        {/* PENDING APPROVALS */}

        <section className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/5 overflow-hidden">

          <div className="p-5 sm:p-6 border-b border-red-500/20">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

              <div>
                <p className="text-sm font-bold text-red-400">
                  🔴 APPROVAL CENTER
                </p>

                <h2 className="text-2xl font-black mt-1">
                  Pending Savings
                </h2>

                <p className="text-sm text-slate-400 mt-1">
                  Review savings submitted by members.
                </p>
              </div>

              <div className="self-start rounded-full bg-red-500 px-4 py-2 text-sm font-black text-white">
                {pendingSavings.length} PENDING
              </div>

            </div>

          </div>

          {pendingSavings.length === 0 ? (

            <div className="p-8 text-center">

              <div className="text-5xl mb-3">
                🎉
              </div>

              <p className="font-semibold">
                No pending savings
              </p>

              <p className="text-sm text-slate-500 mt-1">
                You&apos;re all caught up!
              </p>

            </div>

          ) : (

            <div className="divide-y divide-slate-800">

              {pendingSavings.map((saving) => (

                <div
                  key={saving.id}
                  className="p-5 sm:p-6"
                >

                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="text-lg font-bold">
                          {saving.username}
                        </h3>

                        <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-300">
                          PENDING
                        </span>

                      </div>

                      <div className="mt-2 text-sm text-slate-400">
                        Week {saving.week}
                      </div>

                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                      <div className="text-left sm:text-right">

                        <p className="text-xs text-slate-500">
                          AMOUNT SUBMITTED
                        </p>

                        <p className="text-2xl font-black text-yellow-400">
                          ₱
                          {saving.amount.toLocaleString(
                            "en-PH",
                            {
                              minimumFractionDigits: 2,
                            }
                          )}
                        </p>

                      </div>

                      <div className="grid grid-cols-2 gap-2">

                        <button
                          onClick={() =>
                            approveSaving(
                              saving.id,
                              saving.username,
                              saving.week
                            )
                          }
                          className="min-h-11 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-black hover:bg-emerald-400"
                        >
                          ✅ Approve
                        </button>

                        <button
                          onClick={() =>
                            rejectSaving(
                              saving.id,
                              saving.username,
                              saving.week
                            )
                          }
                          className="min-h-11 rounded-xl bg-red-500/20 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/30"
                        >
                          ❌ Reject
                        </button>

                      </div>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          )}

        </section>

        {/* STATISTICS */}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-xs text-slate-400">
              TOTAL SAVED
            </p>

            <p className="mt-2 text-3xl font-black">
              ₱
              {Number(
                statistics.total_saved || 0
              ).toLocaleString("en-PH", {
                minimumFractionDigits: 2,
              })}
            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-xs text-slate-400">
              ACTIVE MEMBERS
            </p>

            <p className="mt-2 text-3xl font-black">
              {statistics.active_users || 0}
            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-xs text-slate-400">
              WEEKS COMPLETED
            </p>

            <p className="mt-2 text-3xl font-black">
              {statistics.total_completed_weeks || 0}
            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <p className="text-xs text-slate-400">
              TOTAL MEMBERS
            </p>

            <p className="mt-2 text-3xl font-black">
              {statistics.total_users || 0}
            </p>

          </div>

        </section>

        {/* CONTROLS */}

        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mb-5">

          <button
            onClick={() => router.push("/admin/report")}
            className="w-full sm:w-auto rounded-xl bg-purple-500 px-5 py-3 font-bold hover:bg-purple-400"
          >
            📊 Savings Report
          </button>

          <button
            onClick={loadAdminData}
            className="w-full sm:w-auto rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700"
          >
            🔄 Refresh
          </button>

        </div>

        {/* MEMBER SAVINGS */}

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">

          <div className="p-5 sm:p-6 border-b border-slate-800">

            <p className="text-sm text-purple-400 font-bold">
              💰 SAVINGS SUMMARY
            </p>

            <h2 className="text-2xl font-black mt-1">
              Member Savings
            </h2>

          </div>

          <div className="divide-y divide-slate-800">

            {memberUsers
              .sort(
                (a, b) =>
                  Number(b.total_saved || 0) -
                  Number(a.total_saved || 0)
              )
              .map((member) => (

                <div
                  key={member.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 sm:px-6 py-5 hover:bg-slate-800/40"
                >

                  <div>

                    <p className="font-bold">
                      {member.username}
                    </p>

                    <p className="text-sm text-slate-400 mt-1">
                      {member.completed_weeks} / 50 weeks completed
                    </p>

                  </div>

                  <div className="sm:text-right">

                    <p className="text-xl font-black text-emerald-400">
                      ₱
                      {Number(
                        member.total_saved || 0
                      ).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                      })}
                    </p>

                    <p className="text-xs text-slate-500">
                      {Number(
                        member.progress || 0
                      ).toFixed(1)}
                      % complete
                    </p>

                  </div>

                </div>

              ))}

          </div>

        </section>

        {/* MEMBERS */}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">

          <div className="p-5 sm:p-6 border-b border-slate-800">

            <h2 className="text-2xl font-black">
              👥 Members
            </h2>

            <p className="text-sm text-slate-400 mt-1">
              Manage member accounts and savings progress.
            </p>

          </div>

          {/* DESKTOP */}

          <div className="hidden lg:block overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b border-slate-800 text-left text-sm text-slate-400">

                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Total Saved</th>
                  <th className="px-6 py-4">Completed</th>
                  <th className="px-6 py-4">Progress</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>

                </tr>

              </thead>

              <tbody>

                {users.map((member) => (

                  <tr
                    key={member.id}
                    className="border-b border-slate-800 hover:bg-slate-800/40"
                  >

                    <td className="px-6 py-5 font-bold">
                      {member.username}
                    </td>

                    <td className="px-6 py-5">

                      <span className="rounded-full bg-blue-500/15 px-3 py-1 text-sm text-blue-300">
                        {member.role.toUpperCase()}
                      </span>

                    </td>

                    <td className="px-6 py-5 font-bold">
                      ₱
                      {Number(
                        member.total_saved || 0
                      ).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                      })}
                    </td>

                    <td className="px-6 py-5">
                      {member.completed_weeks} / 50
                    </td>

                    <td className="px-6 py-5">

                      <div className="flex items-center gap-3">

                        <div className="w-20 h-2 rounded-full bg-slate-800 overflow-hidden">

                          <div
                            className="h-full bg-purple-500"
                            style={{
                              width: `${Math.min(
                                Number(member.progress || 0),
                                100
                              )}%`,
                            }}
                          />

                        </div>

                        <span className="text-sm text-slate-400">
                          {Number(
                            member.progress || 0
                          ).toFixed(1)}
                          %
                        </span>

                      </div>

                    </td>

                    <td className="px-6 py-5">

                      {member.active ? (
                        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-500/15 px-3 py-1 text-sm text-red-300">
                          INACTIVE
                        </span>
                      )}

                    </td>

                    <td className="px-6 py-5">

                      {member.role === "user" && (

                        <div className="flex flex-wrap gap-2">

                          <button
                            onClick={() =>
                              router.push(
                                `/admin/member?id=${member.id}`
                              )
                            }
                            className="px-3 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                          >
                            👁 View
                          </button>

                          <button
                            onClick={() =>
                              resetSavings(
                                member.id,
                                member.username
                              )
                            }
                            className="px-3 py-2 rounded-lg bg-orange-500/20 text-orange-300 hover:bg-orange-500/30"
                          >
                            🔄 Reset
                          </button>

                          {member.active ? (

                            <button
                              onClick={() =>
                                deactivateUser(
                                  member.id,
                                  member.username
                                )
                              }
                              className="px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
                            >
                              ⏸ Deactivate
                            </button>

                          ) : (

                            <button
                              onClick={() =>
                                activateUser(
                                  member.id,
                                  member.username
                                )
                              }
                              className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                            >
                              ▶ Activate
                            </button>

                          )}

                          <button
                            onClick={() =>
                              deleteUser(
                                member.id,
                                member.username
                              )
                            }
                            className="px-3 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30"
                          >
                            🗑 Delete
                          </button>

                        </div>

                      )}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

          {/* MOBILE */}

          <div className="lg:hidden divide-y divide-slate-800">

            {users.map((member) => (

              <div
                key={member.id}
                className="p-5"
              >

                <div className="flex items-start justify-between gap-3">

                  <div>

                    <h3 className="font-bold text-lg">
                      {member.username}
                    </h3>

                    <p className="text-xs text-slate-400 mt-1">
                      {member.role.toUpperCase()}
                    </p>

                  </div>

                  {member.active ? (
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-300">
                      INACTIVE
                    </span>
                  )}

                </div>

                <div className="grid grid-cols-2 gap-3 mt-5">

                  <div className="rounded-xl bg-slate-950/50 p-3">
                    <p className="text-xs text-slate-500">
                      TOTAL SAVED
                    </p>
                    <p className="font-bold mt-1">
                      ₱
                      {Number(
                        member.total_saved || 0
                      ).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-950/50 p-3">
                    <p className="text-xs text-slate-500">
                      COMPLETED
                    </p>
                    <p className="font-bold mt-1">
                      {member.completed_weeks} / 50
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-950/50 p-3">
                    <p className="text-xs text-slate-500">
                      PROGRESS
                    </p>
                    <p className="font-bold mt-1">
                      {Number(
                        member.progress || 0
                      ).toFixed(1)}
                      %
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-950/50 p-3">
                    <p className="text-xs text-slate-500">
                      REMAINING
                    </p>
                    <p className="font-bold mt-1">
                      {member.remaining_weeks} weeks
                    </p>
                  </div>

                </div>

                {member.role === "user" && (

                  <div className="grid grid-cols-2 gap-2 mt-5">

                    <button
                      onClick={() =>
                        router.push(
                          `/admin/member?id=${member.id}`
                        )
                      }
                      className="min-h-11 rounded-lg bg-purple-500/20 text-purple-300 font-medium"
                    >
                      👁 View
                    </button>

                    <button
                      onClick={() =>
                        resetSavings(
                          member.id,
                          member.username
                        )
                      }
                      className="min-h-11 rounded-lg bg-orange-500/20 text-orange-300 font-medium"
                    >
                      🔄 Reset
                    </button>

                    {member.active ? (

                      <button
                        onClick={() =>
                          deactivateUser(
                            member.id,
                            member.username
                          )
                        }
                        className="min-h-11 rounded-lg bg-yellow-500/20 text-yellow-300 font-medium"
                      >
                        ⏸ Deactivate
                      </button>

                    ) : (

                      <button
                        onClick={() =>
                          activateUser(
                            member.id,
                            member.username
                          )
                        }
                        className="min-h-11 rounded-lg bg-emerald-500/20 text-emerald-300 font-medium"
                      >
                        ▶ Activate
                      </button>

                    )}

                    <button
                      onClick={() =>
                        deleteUser(
                          member.id,
                          member.username
                        )
                      }
                      className="min-h-11 rounded-lg bg-red-500/20 text-red-300 font-medium"
                    >
                      🗑 Delete
                    </button>

                  </div>

                )}

              </div>

            ))}

          </div>

        </section>

      </div>

    </main>
  );
}

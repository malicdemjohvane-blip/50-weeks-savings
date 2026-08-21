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

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();

  const [users, setUsers] = useState<UserSummary[]>([]);
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

    const { data: profile, error: profileError } = await supabase
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

    const { data: summaryData, error: summaryError } =
      await supabase.rpc("get_users_summary");

    if (summaryError) {
      setMessage(summaryError.message);
    } else {
      setUsers(summaryData || []);
    }

    const { data: statisticsData, error: statisticsError } =
      await supabase.rpc("get_admin_statistics");

    if (!statisticsError && statisticsData?.length) {
      setStatistics(statisticsData[0]);
    }

    setLoading(false);
  }

  async function resetSavings(userId: string, username: string) {
    const confirmed = window.confirm(
      `Reset all savings for ${username}?\n\nAll 50 weeks will be returned to ₱0.00.`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase.rpc("admin_reset_savings", {
      target_user_id: userId,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`${username}'s savings have been reset.`);

    await loadAdminData();
  }

  async function deactivateUser(userId: string, username: string) {
    const confirmed = window.confirm(
      `Deactivate ${username}?\n\nThey will no longer be able to use the savings dashboard.`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase.rpc("admin_deactivate_user", {
      target_user_id: userId,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`${username} has been deactivated.`);

    await loadAdminData();
  }

  async function activateUser(userId: string, username: string) {
    const confirmed = window.confirm(
      `Activate ${username}?`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase.rpc("admin_activate_user", {
      target_user_id: userId,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`${username} has been activated.`);

    await loadAdminData();
  }

  async function deleteUser(userId: string, username: string) {
    const confirmed = window.confirm(
      `DELETE ${username}?\n\nThis will permanently delete the member profile and their savings records.\n\nThis cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

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

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💰</div>
          <p className="text-slate-400">
            Loading admin dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>
            <p className="text-sm text-purple-400 font-semibold mb-2">
              ADMIN
            </p>

            <h1 className="text-4xl font-bold">
              Savings Dashboard
            </h1>

            <p className="text-slate-400 mt-2">
              Manage your 50 Weeks Savings Challenge
            </p>
          </div>

          <button
            onClick={signOut}
            className="rounded-xl bg-red-500/15 px-4 py-3 text-red-300 hover:bg-red-500/25"
          >
            🚪 Sign Out
          </button>

        </div>

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
              TOTAL SAVED
            </p>

            <p className="mt-2 text-3xl font-bold">
              ₱{Number(statistics.total_saved || 0).toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              ACTIVE MEMBERS
            </p>

            <p className="mt-2 text-3xl font-bold">
              {statistics.active_users || 0}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              WEEKS COMPLETED
            </p>

            <p className="mt-2 text-3xl font-bold">
              {statistics.total_completed_weeks || 0}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              TOTAL MEMBERS
            </p>

            <p className="mt-2 text-3xl font-bold">
              {statistics.total_users || 0}
            </p>
          </div>

        </div>

        {/* REFRESH */}

        <div className="flex justify-end mb-5">

          <button
            onClick={loadAdminData}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
          >
            🔄 Refresh
          </button>

        </div>

{/* SAVINGS SUMMARY */}

<section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
  <div className="p-6 border-b border-slate-800">
    <p className="text-sm text-purple-400 font-semibold mb-2">
      💰 SAVINGS SUMMARY
    </p>

    <h2 className="text-2xl font-bold">
      Member Savings
    </h2>

    <p className="text-slate-400 mt-1">
      Quick overview of how much each member has saved.
    </p>
  </div>

  <div className="divide-y divide-slate-800">
    {users
      .filter((member) => member.role === "user")
      .sort(
        (a, b) =>
          Number(b.total_saved || 0) -
          Number(a.total_saved || 0)
      )
      .map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between gap-4 px-6 py-5 hover:bg-slate-800/40"
        >
          <div>
            <p className="font-semibold text-white">
              {member.username}
            </p>

            <p className="text-sm text-slate-400 mt-1">
              {member.completed_weeks} / 50 weeks completed
            </p>
          </div>

          <div className="text-right">
            <p className="text-lg font-bold text-emerald-400">
              ₱{Number(member.total_saved || 0).toFixed(2)}
            </p>

            <p className="text-xs text-slate-500">
              {Number(member.progress || 0).toFixed(1)}% complete
            </p>
          </div>
        </div>
      ))}

    {users.filter((member) => member.role === "user").length === 0 && (
      <div className="p-6 text-center text-slate-400">
        No member savings found.
      </div>
    )}
  </div>
</section>

        {/* MEMBERS */}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">

          <div className="p-6 border-b border-slate-800">

            <h2 className="text-2xl font-bold">
              👥 Members
            </h2>

            <p className="text-slate-400 mt-1">
              Manage member accounts and savings progress
            </p>

          </div>

          {/* DESKTOP TABLE */}

          <div className="hidden lg:block overflow-x-auto">

            <table className="w-full">

              <thead>
                <tr className="border-b border-slate-800 text-left text-sm text-slate-400">

                  <th className="px-6 py-4">
                    Username
                  </th>

                  <th className="px-6 py-4">
                    Role
                  </th>

                  <th className="px-6 py-4">
                    Total Saved
                  </th>

                  <th className="px-6 py-4">
                    Completed
                  </th>

                  <th className="px-6 py-4">
                    Progress
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                  <th className="px-6 py-4">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody>

                {users.map((member) => (

                  <tr
                    key={member.id}
                    className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800/40"
                  >

                    <td className="px-6 py-5 font-semibold">
                      {member.username}
                    </td>

                    <td className="px-6 py-5">

                      {member.role === "admin" ? (
                        <span className="rounded-full bg-purple-500/15 px-3 py-1 text-sm text-purple-300">
                          ADMIN
                        </span>
                      ) : (
                        <span className="rounded-full bg-blue-500/15 px-3 py-1 text-sm text-blue-300">
                          USER
                        </span>
                      )}

                    </td>

                    <td className="px-6 py-5 font-semibold">
                      ₱{Number(member.total_saved || 0).toFixed(2)}
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
                          {Number(member.progress || 0).toFixed(1)}%
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

                      <div className="flex flex-wrap gap-2">

                        {/* VIEW */}

                        {member.role === "user" && (

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

                        )}

                        {/* RESET */}

                        {member.role === "user" && (

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

                        )}

                        {/* ACTIVATE / DEACTIVATE */}

                        {member.role === "user" && (

                          member.active ? (

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

                          )

                        )}

                        {/* DELETE */}

                        {member.role === "user" && (

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

                        )}

                      </div>

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

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <h3 className="font-bold text-lg">
                      {member.username}
                    </h3>

                    <p className="text-sm text-slate-400 mt-1">
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

                <div className="grid grid-cols-2 gap-4 mt-5">

                  <div>
                    <p className="text-xs text-slate-500">
                      TOTAL SAVED
                    </p>

                    <p className="font-semibold mt-1">
                      ₱{Number(member.total_saved || 0).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      COMPLETED
                    </p>

                    <p className="font-semibold mt-1">
                      {member.completed_weeks} / 50
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      PROGRESS
                    </p>

                    <p className="font-semibold mt-1">
                      {Number(member.progress || 0).toFixed(1)}%
                    </p>
                  </div>

                </div>

                {member.role === "user" && (

                  <div className="flex flex-wrap gap-2 mt-5">

                    <button
                      onClick={() =>
                        router.push(
                          `/admin/member?id=${member.id}`
                        )
                      }
                      className="px-3 py-2 rounded-lg bg-purple-500/20 text-purple-300"
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
                      className="px-3 py-2 rounded-lg bg-orange-500/20 text-orange-300"
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
                        className="px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-300"
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
                        className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300"
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
                      className="px-3 py-2 rounded-lg bg-red-500/20 text-red-300"
                    >
                      🗑 Delete
                    </button>

                  </div>

                )}

              </div>

            ))}

          </div>

          {users.length === 0 && (

            <div className="p-10 text-center">

              <div className="text-4xl mb-3">
                👥
              </div>

              <p className="text-slate-400">
                No members found.
              </p>

            </div>

          )}

        </section>

      </div>
    </main>
  );
}

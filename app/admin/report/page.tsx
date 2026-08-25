"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type Member = {
  id: string;
  username: string;
  total_saved: number | null;
  completed_weeks: number | null;
  progress: number | null;
  role: string;
  is_active?: boolean;
};

export default function AdminReportPage() {
  const supabase = useMemo(() => createClient(), []);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    try {
      setLoading(true);
      setError("");

      const { data, error } =
        await supabase.rpc("get_users_summary");

      if (error) {
        throw error;
      }

      const users = (data || []).filter(
        (member: Member) => member.role === "user"
      );

      setMembers(users);
    } catch (err) {
      console.error("Report error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load savings report."
      );
    } finally {
      setLoading(false);
    }
  }

  const totalSavings = members.reduce(
    (total, member) =>
      total + Number(member.total_saved || 0),
    0
  );

  const totalWeeks = members.reduce(
    (total, member) =>
      total + Number(member.completed_weeks || 0),
    0
  );

  const activeMembers = members.filter(
    (member) => member.is_active !== false
  ).length;

  const averageProgress =
    members.length > 0
      ? members.reduce(
          (total, member) =>
            total + Number(member.progress || 0),
          0
        ) / members.length
      : 0;

  const reportDate = new Date().toLocaleDateString(
    "en-PH",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  function printReport() {
    window.print();
  }

  return (
    <>
      <main className="min-h-screen bg-slate-950 text-white px-3 py-4 sm:px-5 sm:py-6 md:px-8 md:py-8 print:bg-white print:text-black print:p-0">

        {/* ================================================== */}
        {/* SCREEN CONTROLS */}
        {/* ================================================== */}

        <div className="w-full max-w-7xl mx-auto mb-5 sm:mb-6 print:hidden">

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">

            <button
              onClick={() => window.history.back()}
              className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-900 px-4 sm:px-5 py-3 text-sm sm:text-base font-semibold hover:bg-slate-800 transition"
            >
              ← Back
            </button>

            <button
              onClick={printReport}
              className="w-full sm:w-auto rounded-xl bg-emerald-500 px-4 sm:px-5 py-3 text-sm sm:text-base font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              🖨️ Print / Save PDF
            </button>

            <button
              onClick={loadReport}
              className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-900 px-4 sm:px-5 py-3 text-sm sm:text-base font-semibold hover:bg-slate-800 transition"
            >
              🔄 Refresh
            </button>

          </div>

        </div>

        {/* ================================================== */}
        {/* REPORT */}
        {/* ================================================== */}

        <section className="w-full max-w-7xl mx-auto bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-6 md:p-8 lg:p-10 print:max-w-none print:border-0 print:rounded-none print:bg-white print:p-0">

          {/* ================================================== */}
          {/* HEADER */}
          {/* ================================================== */}

          <header className="border-b border-slate-700 pb-5 sm:pb-6 print:border-black">

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">

              <div className="min-w-0">

                <p className="text-xs sm:text-sm font-bold tracking-widest text-emerald-400 print:text-black">
                  50 WEEKS SAVINGS
                </p>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mt-2 break-words">
                  Member Savings Report
                </h1>

                <p className="text-sm sm:text-base text-slate-400 mt-2 print:text-gray-600">
                  Complete savings summary for all members.
                </p>

              </div>

              <div className="text-left lg:text-right text-sm shrink-0">

                <p className="text-slate-500 print:text-gray-500">
                  Report Date
                </p>

                <p className="font-bold mt-1">
                  {reportDate}
                </p>

              </div>

            </div>

          </header>

          {/* ================================================== */}
          {/* SUMMARY CARDS */}
          {/* ================================================== */}

          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-6 sm:my-8">

            <div className="rounded-xl bg-slate-800 p-4 sm:p-5 print:bg-gray-100 print:border print:border-gray-300">

              <p className="text-xs sm:text-sm text-slate-400 print:text-gray-600">
                Total Members
              </p>

              <p className="text-2xl sm:text-3xl font-black mt-1">
                {members.length}
              </p>

            </div>

            <div className="rounded-xl bg-slate-800 p-4 sm:p-5 print:bg-gray-100 print:border print:border-gray-300">

              <p className="text-xs sm:text-sm text-slate-400 print:text-gray-600">
                Active Members
              </p>

              <p className="text-2xl sm:text-3xl font-black mt-1">
                {activeMembers}
              </p>

            </div>

            <div className="rounded-xl bg-slate-800 p-4 sm:p-5 print:bg-gray-100 print:border print:border-gray-300">

              <p className="text-xs sm:text-sm text-slate-400 print:text-gray-600">
                Total Savings
              </p>

              <p className="text-xl sm:text-2xl font-black mt-1 break-words">
                ₱{totalSavings.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>

            </div>

            <div className="rounded-xl bg-slate-800 p-4 sm:p-5 print:bg-gray-100 print:border print:border-gray-300">

              <p className="text-xs sm:text-sm text-slate-400 print:text-gray-600">
                Avg. Progress
              </p>

              <p className="text-2xl sm:text-3xl font-black mt-1">
                {averageProgress.toFixed(1)}%
              </p>

            </div>

          </div>

          {/* ================================================== */}
          {/* MOBILE MEMBER CARDS */}
          {/* ================================================== */}

          <div className="block md:hidden">

            {loading ? (

              <div className="py-12 text-center text-slate-400">
                Loading report...
              </div>

            ) : error ? (

              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">

                <p className="font-bold">
                  Unable to load report
                </p>

                <p className="mt-2 text-sm break-words">
                  {error}
                </p>

              </div>

            ) : members.length === 0 ? (

              <div className="py-10 text-center text-slate-400">
                No members found.
              </div>

            ) : (

              <div className="space-y-3">

                {members.map((member, index) => (

                  <div
                    key={member.id}
                    className="rounded-2xl border border-slate-800 bg-slate-800/60 p-4 sm:p-5"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <p className="text-xs text-slate-500 mb-1">
                          MEMBER #{index + 1}
                        </p>

                        <h3 className="font-bold text-base sm:text-lg break-words">
                          {member.username}
                        </h3>

                      </div>

                      <span className="shrink-0 rounded-full bg-purple-500/15 px-2.5 py-1 text-xs text-purple-300">
                        {Number(member.progress || 0).toFixed(1)}%
                      </span>

                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">

                      <div className="rounded-xl bg-slate-900/70 p-3">

                        <p className="text-xs text-slate-500">
                          TOTAL SAVINGS
                        </p>

                        <p className="font-bold text-emerald-400 mt-1 break-words">
                          ₱{Number(
                            member.total_saved || 0
                          ).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>

                      </div>

                      <div className="rounded-xl bg-slate-900/70 p-3">

                        <p className="text-xs text-slate-500">
                          WEEKS COMPLETED
                        </p>

                        <p className="font-bold mt-1">
                          {Number(
                            member.completed_weeks || 0
                          )}{" "}
                          / 50
                        </p>

                      </div>

                    </div>

                    <div className="mt-4">

                      <div className="flex items-center justify-between text-xs mb-2">

                        <span className="text-slate-500">
                          Progress
                        </span>

                        <span className="text-slate-300 font-semibold">
                          {Number(
                            member.progress || 0
                          ).toFixed(1)}
                          %
                        </span>

                      </div>

                      <div className="h-2 rounded-full bg-slate-900 overflow-hidden">

                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{
                            width: `${Math.min(
                              Number(member.progress || 0),
                              100
                            )}%`,
                          }}
                        />

                      </div>

                    </div>

                  </div>

                ))}

                {/* MOBILE GRAND TOTAL */}

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">

                  <p className="text-xs text-emerald-400 font-bold">
                    GRAND TOTAL
                  </p>

                  <div className="grid grid-cols-2 gap-4 mt-3">

                    <div>

                      <p className="text-xs text-slate-500">
                        TOTAL SAVINGS
                      </p>

                      <p className="font-black text-lg mt-1">
                        ₱{totalSavings.toLocaleString(
                          "en-PH",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </p>

                    </div>

                    <div>

                      <p className="text-xs text-slate-500">
                        TOTAL WEEKS
                      </p>

                      <p className="font-black text-lg mt-1">
                        {totalWeeks}
                      </p>

                    </div>

                  </div>

                  <div className="mt-3">

                    <p className="text-xs text-slate-500">
                      AVERAGE PROGRESS
                    </p>

                    <p className="font-black text-lg mt-1">
                      {averageProgress.toFixed(1)}%
                    </p>

                  </div>

                </div>

              </div>

            )}

          </div>

          {/* ================================================== */}
          {/* DESKTOP / TABLET TABLE */}
          {/* ================================================== */}

          <div className="hidden md:block overflow-x-auto">

            {loading ? (

              <div className="py-12 text-center text-slate-400 print:text-gray-600">
                Loading report...
              </div>

            ) : error ? (

              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-300 print:border-red-500 print:text-red-700">

                <p className="font-bold">
                  Unable to load report
                </p>

                <p className="mt-2 text-sm break-words">
                  {error}
                </p>

              </div>

            ) : (

              <table className="w-full border-collapse text-xs sm:text-sm">

                <thead>

                  <tr className="border-b-2 border-slate-600 print:border-black">

                    <th className="px-2 sm:px-3 py-3 text-left font-bold">
                      #
                    </th>

                    <th className="px-2 sm:px-3 py-3 text-left font-bold">
                      Member Name
                    </th>

                    <th className="px-2 sm:px-3 py-3 text-right font-bold whitespace-nowrap">
                      Total Savings
                    </th>

                    <th className="px-2 sm:px-3 py-3 text-center font-bold whitespace-nowrap">
                      Weeks Completed
                    </th>

                    <th className="px-2 sm:px-3 py-3 text-right font-bold">
                      Progress
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {members.length === 0 ? (

                    <tr>

                      <td
                        colSpan={5}
                        className="px-3 py-10 text-center text-slate-400 print:text-gray-600"
                      >
                        No members found.
                      </td>

                    </tr>

                  ) : (

                    members.map((member, index) => (

                      <tr
                        key={member.id}
                        className="border-b border-slate-800 print:border-gray-300"
                      >

                        <td className="px-2 sm:px-3 py-4">
                          {index + 1}
                        </td>

                        <td className="px-2 sm:px-3 py-4 font-semibold break-words">
                          {member.username}
                        </td>

                        <td className="px-2 sm:px-3 py-4 text-right font-bold whitespace-nowrap">
                          ₱{Number(
                            member.total_saved || 0
                          ).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        <td className="px-2 sm:px-3 py-4 text-center whitespace-nowrap">
                          {Number(
                            member.completed_weeks || 0
                          )}{" "}
                          / 50
                        </td>

                        <td className="px-2 sm:px-3 py-4 text-right font-semibold whitespace-nowrap">
                          {Number(
                            member.progress || 0
                          ).toFixed(1)}
                          %
                        </td>

                      </tr>

                    ))

                  )}

                </tbody>

                {members.length > 0 && (

                  <tfoot>

                    <tr className="border-t-2 border-slate-600 print:border-black">

                      <td
                        colSpan={2}
                        className="px-2 sm:px-3 py-4 font-black"
                      >
                        GRAND TOTAL
                      </td>

                      <td className="px-2 sm:px-3 py-4 text-right font-black whitespace-nowrap">
                        ₱{totalSavings.toLocaleString(
                          "en-PH",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </td>

                      <td className="px-2 sm:px-3 py-4 text-center font-black">
                        {totalWeeks}
                      </td>

                      <td className="px-2 sm:px-3 py-4 text-right font-black">
                        {averageProgress.toFixed(1)}%
                      </td>

                    </tr>

                  </tfoot>

                )}

              </table>

            )}

          </div>

          {/* ================================================== */}
          {/* FOOTER */}
          {/* ================================================== */}

          <footer className="mt-6 sm:mt-8 pt-5 border-t border-slate-800 print:border-gray-400">

            <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-xs text-slate-500 print:text-gray-600">

              <p>
                50 Weeks Savings — Member Savings Report
              </p>

              <p>
                Generated on {reportDate}
              </p>

            </div>

          </footer>

        </section>

      </main>

      {/* ================================================== */}
      {/* PRINT STYLES */}
      {/* ================================================== */}

      <style jsx global>{`

        @media print {

          @page {
            size: A4;
            margin: 12mm;
          }

          html,
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
          }

        }

      `}</style>
    </>
  );
}

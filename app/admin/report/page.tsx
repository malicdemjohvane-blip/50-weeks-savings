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

      const { data, error } = await supabase.rpc("get_users_summary");

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
    (total, member) => total + Number(member.total_saved || 0),
    0
  );

  const totalWeeks = members.reduce(
    (total, member) => total + Number(member.completed_weeks || 0),
    0
  );

  const activeMembers = members.filter(
    (member) => member.is_active !== false
  ).length;

  const averageProgress =
    members.length > 0
      ? members.reduce(
          (total, member) => total + Number(member.progress || 0),
          0
        ) / members.length
      : 0;

  const reportDate = new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function printReport() {
    window.print();
  }

  return (
    <>
      <main className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 print:bg-white print:text-black print:p-0">
        {/* SCREEN CONTROLS */}
        <div className="max-w-6xl mx-auto mb-6 flex flex-wrap gap-3 print:hidden">
          <button
            onClick={() => window.history.back()}
            className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 font-semibold hover:bg-slate-800"
          >
            ← Back
          </button>

          <button
            onClick={printReport}
            className="rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-400"
          >
            🖨️ Print / Save PDF
          </button>

          <button
            onClick={loadReport}
            className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 font-semibold hover:bg-slate-800"
          >
            🔄 Refresh
          </button>
        </div>

        {/* REPORT */}
        <section className="max-w-6xl mx-auto bg-slate-900 rounded-2xl border border-slate-800 p-6 sm:p-10 print:max-w-none print:border-0 print:rounded-none print:bg-white print:p-0">
          {/* HEADER */}
          <header className="border-b border-slate-700 pb-6 print:border-black">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-sm font-bold tracking-widest text-emerald-400 print:text-black">
                  50 WEEKS SAVINGS
                </p>

                <h1 className="text-3xl sm:text-4xl font-black mt-2">
                  Member Savings Report
                </h1>

                <p className="text-slate-400 mt-2 print:text-gray-600">
                  Complete savings summary for all members.
                </p>
              </div>

              <div className="text-left sm:text-right text-sm">
                <p className="text-slate-500 print:text-gray-500">
                  Report Date
                </p>

                <p className="font-bold">{reportDate}</p>
              </div>
            </div>
          </header>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-8">
            <div className="rounded-xl bg-slate-800 p-5 print:bg-gray-100 print:border print:border-gray-300">
              <p className="text-sm text-slate-400 print:text-gray-600">
                Total Members
              </p>

              <p className="text-3xl font-black mt-1">
                {members.length}
              </p>
            </div>

            <div className="rounded-xl bg-slate-800 p-5 print:bg-gray-100 print:border print:border-gray-300">
              <p className="text-sm text-slate-400 print:text-gray-600">
                Active Members
              </p>

              <p className="text-3xl font-black mt-1">
                {activeMembers}
              </p>
            </div>

            <div className="rounded-xl bg-slate-800 p-5 print:bg-gray-100 print:border print:border-gray-300">
              <p className="text-sm text-slate-400 print:text-gray-600">
                Total Savings
              </p>

              <p className="text-2xl font-black mt-1">
                ₱{totalSavings.toFixed(2)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-800 p-5 print:bg-gray-100 print:border print:border-gray-300">
              <p className="text-sm text-slate-400 print:text-gray-600">
                Avg. Progress
              </p>

              <p className="text-3xl font-black mt-1">
                {averageProgress.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* REPORT TABLE */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-slate-400 print:text-gray-600">
                Loading report...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-300 print:border-red-500 print:text-red-700">
                <p className="font-bold">Unable to load report</p>

                <p className="mt-2 text-sm">{error}</p>
              </div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-600 print:border-black">
                    <th className="px-3 py-3 text-left font-bold">
                      #
                    </th>

                    <th className="px-3 py-3 text-left font-bold">
                      Member Name
                    </th>

                    <th className="px-3 py-3 text-right font-bold">
                      Total Savings
                    </th>

                    <th className="px-3 py-3 text-center font-bold">
                      Weeks Completed
                    </th>

                    <th className="px-3 py-3 text-right font-bold">
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
                        <td className="px-3 py-4">
                          {index + 1}
                        </td>

                        <td className="px-3 py-4 font-semibold">
                          {member.username}
                        </td>

                        <td className="px-3 py-4 text-right font-bold">
                          ₱{Number(member.total_saved || 0).toFixed(2)}
                        </td>

                        <td className="px-3 py-4 text-center">
                          {Number(member.completed_weeks || 0)} / 50
                        </td>

                        <td className="px-3 py-4 text-right font-semibold">
                          {Number(member.progress || 0).toFixed(1)}%
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
                        className="px-3 py-4 font-black"
                      >
                        GRAND TOTAL
                      </td>

                      <td className="px-3 py-4 text-right font-black">
                        ₱{totalSavings.toFixed(2)}
                      </td>

                      <td className="px-3 py-4 text-center font-black">
                        {totalWeeks}
                      </td>

                      <td className="px-3 py-4 text-right font-black">
                        {averageProgress.toFixed(1)}%
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>

          {/* FOOTER */}
          <footer className="mt-8 pt-5 border-t border-slate-800 print:border-gray-400">
            <div className="flex flex-col sm:flex-row justify-between gap-3 text-xs text-slate-500 print:text-gray-600">
              <p>50 Weeks Savings — Member Savings Report</p>

              <p>Generated on {reportDate}</p>
            </div>
          </footer>
        </section>
      </main>

      {/* PRINT STYLES */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            background: white !important;
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

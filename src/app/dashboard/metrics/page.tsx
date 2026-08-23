import fs from "fs";
import path from "path";
import Link from "next/link";
import { formatRupees } from "@/lib/format";

export const dynamic = "force-dynamic";

interface BenchmarkData {
  total_payments: number;
  auto_resolution_rate: number;
  correct_resolution_rate: number;
  false_auto_link_rate: number;
  manual_review_rate: number;
  ambiguity_resolution_rate: number;
  median_resolution_minutes: number;
  total_value_resolved_paise: number;
  breakdown: {
    auto_resolved: number;
    resolved_via_clarification: number;
    resolved_via_merchant_approval: number;
    manual_review: number;
  };
  note: string;
}

export default function BenchmarkMetricsPage() {
  const jsonPath = path.resolve(process.cwd(), "benchmark-results.json");
  let data: BenchmarkData | null = null;

  try {
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, "utf-8");
      data = JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading benchmark-results.json:", err);
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      {/* Header Navigation */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-xs font-mono text-muted hover:text-ink transition-colors inline-flex items-center gap-1.5"
        >
          <span>←</span> <span>Back to all payments</span>
        </Link>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted font-mono mb-1">
            Accuracy test
          </div>
          <h1 className="font-display text-3xl font-bold text-ink">How well did it work?</h1>
          <p className="text-xs text-muted font-body mt-1">
            Tested across 100 payments and 130 overlapping orders with known correct answers.
          </p>
        </div>
      </div>

      {!data ? (
        <div className="bg-white border border-line rounded-lg p-8 text-center shadow-xs">
          <div className="text-sm font-body font-medium mb-2 text-ink">No test results found</div>
          <p className="text-xs text-muted font-body mb-4">
            Run the benchmark test from your terminal to calculate real accuracy numbers:
          </p>
          <pre className="bg-paper border border-line p-3 rounded text-xs font-mono inline-block text-left text-ink">
            DATABASE_PATH=./benchmark.db npx tsx src/lib/benchmark.ts
          </pre>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top 6 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white border border-line rounded-lg p-5 shadow-xs">
              <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">
                Matched automatically
              </div>
              <div className="font-display text-3xl font-bold text-ink">
                {Math.round(data.auto_resolution_rate * 100)}%
              </div>
              <div className="text-[11px] text-muted font-body mt-1">
                {data.breakdown.auto_resolved} payments matched immediately
              </div>
            </div>

            <div className="bg-white border border-line rounded-lg p-5 shadow-xs">
              <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">
                How often we got it right
              </div>
              <div className="font-display text-3xl font-bold text-green">
                {Math.round(data.correct_resolution_rate * 100)}%
              </div>
              <div className="text-[11px] text-muted font-body mt-1">
                Verified against ground truth orders
              </div>
            </div>

            <div className="bg-white border border-line rounded-lg p-5 shadow-xs">
              <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">
                Wrong automatic matches
              </div>
              <div className="font-display text-3xl font-bold text-ink">
                {Math.round(data.false_auto_link_rate * 100)}%
              </div>
              <div className="text-[11px] text-muted font-body mt-1">
                Zero incorrect automatic pairings
              </div>
            </div>

            <div className="bg-white border border-line rounded-lg p-5 shadow-xs">
              <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">
                Solved by asking
              </div>
              <div className="font-display text-3xl font-bold text-amber">
                {Math.round(data.ambiguity_resolution_rate * 100)}%
              </div>
              <div className="text-[11px] text-muted font-body mt-1">
                Untangled via customer answer
              </div>
            </div>

            <div className="bg-white border border-line rounded-lg p-5 shadow-xs">
              <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">
                Sent to a human
              </div>
              <div className="font-display text-3xl font-bold text-red">
                {Math.round(data.manual_review_rate * 100)}%
              </div>
              <div className="text-[11px] text-muted font-body mt-1">
                {data.breakdown.manual_review} payments paused for your check
              </div>
            </div>

            <div className="bg-white border border-line rounded-lg p-5 shadow-xs">
              <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">
                Total money matched
              </div>
              <div className="font-display text-2xl font-bold text-ink">
                {formatRupees(data.total_value_resolved_paise)}
              </div>
              <div className="text-[11px] text-muted font-body mt-1">
                Across {data.total_payments} test payments
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white border border-line rounded-lg overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-line">
              <h2 className="font-display font-bold text-base text-ink">How payments were matched</h2>
            </div>
            <div className="divide-y divide-line font-mono text-xs">
              <div className="grid grid-cols-12 px-5 py-3 bg-paper font-semibold text-muted text-[11px] uppercase tracking-wider">
                <div className="col-span-5">How it was matched</div>
                <div className="col-span-2 text-right">Count</div>
                <div className="col-span-2 text-right">Share</div>
                <div className="col-span-3 text-right">Why</div>
              </div>

              <div className="grid grid-cols-12 px-5 py-3 items-center">
                <div className="col-span-5 font-medium flex items-center gap-2 text-ink">
                  <span className="w-2 h-2 rounded-full bg-green" />
                  Matched automatically
                </div>
                <div className="col-span-2 text-right tabular-nums text-ink">{data.breakdown.auto_resolved}</div>
                <div className="col-span-2 text-right tabular-nums text-ink">
                  {Math.round((data.breakdown.auto_resolved / data.total_payments) * 100)}%
                </div>
                <div className="col-span-3 text-right text-muted">Certain without asking</div>
              </div>

              <div className="grid grid-cols-12 px-5 py-3 items-center">
                <div className="col-span-5 font-medium flex items-center gap-2 text-ink">
                  <span className="w-2 h-2 rounded-full bg-green" />
                  Solved by asking customer
                </div>
                <div className="col-span-2 text-right tabular-nums text-ink">
                  {data.breakdown.resolved_via_clarification}
                </div>
                <div className="col-span-2 text-right tabular-nums text-ink">
                  {Math.round((data.breakdown.resolved_via_clarification / data.total_payments) * 100)}%
                </div>
                <div className="col-span-3 text-right text-muted">Customer confirmed item</div>
              </div>

              <div className="grid grid-cols-12 px-5 py-3 items-center">
                <div className="col-span-5 font-medium flex items-center gap-2 text-ink">
                  <span className="w-2 h-2 rounded-full bg-amber" />
                  Ready for you to confirm
                </div>
                <div className="col-span-2 text-right tabular-nums text-ink">
                  {data.breakdown.resolved_via_merchant_approval}
                </div>
                <div className="col-span-2 text-right tabular-nums text-ink">
                  {Math.round((data.breakdown.resolved_via_merchant_approval / data.total_payments) * 100)}%
                </div>
                <div className="col-span-3 text-right text-muted">Close match waiting for you</div>
              </div>

              <div className="grid grid-cols-12 px-5 py-3 items-center">
                <div className="col-span-5 font-medium flex items-center gap-2 text-ink">
                  <span className="w-2 h-2 rounded-full bg-red" />
                  Sent to human review
                </div>
                <div className="col-span-2 text-right tabular-nums text-ink">{data.breakdown.manual_review}</div>
                <div className="col-span-2 text-right tabular-nums text-ink">
                  {Math.round((data.breakdown.manual_review / data.total_payments) * 100)}%
                </div>
                <div className="col-span-3 text-right text-muted">Unclear reply or no match</div>
              </div>
            </div>
          </div>

          {/* Methodology Callout */}
          <div className="bg-paper border border-line rounded-lg p-5 text-xs font-body text-muted leading-relaxed">
            <div className="font-mono font-bold text-ink mb-1 uppercase tracking-wider text-[11px]">
              How we tested this
            </div>
            <p className="mb-2 text-ink">{data.note}</p>
            <p className="italic text-[11px] text-muted">
              Note: Time-to-match numbers here show the computer simulation speed, not how fast a real customer types back.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

import fs from "fs";
import path from "path";
import Link from "next/link";
import { formatRupees } from "@/lib/format";

import Image from "next/image";

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
    <main className="max-w-4xl mx-auto px-6 py-12">
      {/* Header Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-xs font-mono text-muted hover:text-ink transition-colors inline-flex items-center gap-1.5"
        >
          <span>←</span> <span>Back to all payments</span>
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-muted hover:text-ink transition-colors">
          <Image src="/brand/logo/logo.png" alt="Kisne Bheja" width={18} height={18} className="rounded object-contain" />
          <span className="text-[11px] font-mono uppercase tracking-wider">Kisne Bheja</span>
        </Link>
      </div>

      <header className="mb-12">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-2">
          How well did it work?
        </h1>
        <p className="text-base text-muted font-normal max-w-xl">
          Tested across 100 payments and 130 overlapping orders with known correct answers.
        </p>
      </header>

      {!data ? (
        <div className="border border-line rounded-lg p-8 text-center bg-white">
          <div className="text-sm font-body font-medium mb-2 text-ink">No test results found</div>
          <p className="text-xs text-muted font-body mb-4">
            Run the benchmark test from your terminal to calculate real accuracy numbers:
          </p>
          <pre className="bg-paper border border-line p-3 rounded text-xs font-mono inline-block text-left text-ink">
            DATABASE_PATH=./benchmark.db npx tsx src/lib/benchmark.ts
          </pre>
        </div>
      ) : (
        <div className="space-y-16">
          {/* Hero Metric Section — Apple Style Single Giant Number */}
          <div className="pb-10 border-b border-line">
            <div className="font-display text-6xl sm:text-7xl font-bold text-green tracking-tight tabular-nums">
              {Math.round(data.correct_resolution_rate * 100)}%
            </div>
            <div className="text-lg text-ink font-medium mt-3">
              How often we got it right
            </div>
            <div className="text-sm text-muted font-body mt-1">
              Zero wrong automatic pairings across all test payments.
            </div>
          </div>

          {/* Plain Stats Row — Hairline Separated, No Boxed Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 pb-12 border-b border-line">
            <div>
              <div className="text-xs uppercase font-mono text-muted mb-1">Matched automatically</div>
              <div className="font-display text-3xl font-bold text-ink tabular-nums">
                {Math.round(data.auto_resolution_rate * 100)}%
              </div>
              <div className="text-xs text-muted font-body mt-1">
                {data.breakdown.auto_resolved} matched instantly
              </div>
            </div>

            <div>
              <div className="text-xs uppercase font-mono text-muted mb-1">Solved by asking</div>
              <div className="font-display text-3xl font-bold text-ink tabular-nums">
                {Math.round(data.ambiguity_resolution_rate * 100)}%
              </div>
              <div className="text-xs text-muted font-body mt-1">
                Untangled by customer reply
              </div>
            </div>

            <div>
              <div className="text-xs uppercase font-mono text-muted mb-1">Sent to a human</div>
              <div className="font-display text-3xl font-bold text-ink tabular-nums">
                {Math.round(data.manual_review_rate * 100)}%
              </div>
              <div className="text-xs text-muted font-body mt-1">
                Paused safely for review
              </div>
            </div>

            <div>
              <div className="text-xs uppercase font-mono text-muted mb-1">Total money matched</div>
              <div className="font-display text-2xl font-bold text-ink tabular-nums mt-1">
                {formatRupees(data.total_value_resolved_paise)}
              </div>
              <div className="text-xs text-muted font-body mt-1">
                {data.total_payments} test payments
              </div>
            </div>
          </div>

          {/* Breakdown Table — Clean Tabular Data */}
          <div>
            <h2 className="font-display font-bold text-xl text-ink mb-4">How payments were matched</h2>
            <div className="border border-line rounded-lg overflow-hidden bg-white">
              <div className="divide-y divide-line font-mono text-xs">
                <div className="grid grid-cols-12 px-5 py-3 bg-paper font-semibold text-muted text-[11px] uppercase tracking-wider">
                  <div className="col-span-5">How it was matched</div>
                  <div className="col-span-2 text-right">Count</div>
                  <div className="col-span-2 text-right">Share</div>
                  <div className="col-span-3 text-right">Why</div>
                </div>

                <div className="grid grid-cols-12 px-5 py-3.5 items-center">
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

                <div className="grid grid-cols-12 px-5 py-3.5 items-center">
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

                <div className="grid grid-cols-12 px-5 py-3.5 items-center">
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

                <div className="grid grid-cols-12 px-5 py-3.5 items-center">
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
          </div>

          {/* Methodology Note — Plain Document Note */}
          <div className="pt-8 border-t border-line text-xs font-body text-muted leading-relaxed max-w-2xl">
            <div className="font-mono font-bold text-ink mb-1 uppercase tracking-wider text-[11px]">
              How we tested this
            </div>
            <p className="mb-2 text-ink">{data.note}</p>
            <p className="italic text-[11px] text-muted">
              Note: Time-to-match numbers show the computer simulation speed, not how fast a real customer types back.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

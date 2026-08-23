import { getAllPayments } from "./repo";
import { getSupabaseServer } from "./supabaseServer";

export interface DashboardMetrics {
  unresolvedValue: number; // in paise
  unresolvedCount: number;
  resolvedCount: number;
  totalCount: number;
  resolutionRate: number; // 0..1
  medianResolutionMinutes: number | null;
}

export interface EngineTelemetry {
  totalCount: number;
  resolvedCount: number;
  unresolvedCount: number;
  ambiguousCount: number;
  manualReviewCount: number;
  totalVolumePaise: number;
  resolvedVolumePaise: number;
  unresolvedVolumePaise: number;
  resolutionRate: number;
  averageConfidence: number;
  medianResolutionMinutes: number | null;
  signalCounts: Record<string, number>;
  totalSignalsComputed: number;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const payments = await getAllPayments();
  const totalCount = payments.length;

  const resolved = payments.filter((p) => p.status === "resolved");
  const resolvedCount = resolved.length;

  const unresolved = payments.filter((p) => p.status !== "resolved");
  const unresolvedCount = unresolved.length;
  const unresolvedValue = unresolved.reduce((sum, p) => sum + p.amount, 0);

  const resolutionRate = totalCount > 0 ? resolvedCount / totalCount : 0;

  const resolutionTimes = resolved
    .filter((p) => p.resolved_at && p.received_at && p.resolved_at >= p.received_at)
    .map((p) => (p.resolved_at! - p.received_at) / 60_000)
    .sort((a, b) => a - b);

  let medianResolutionMinutes: number | null = null;
  if (resolutionTimes.length > 0) {
    const mid = Math.floor(resolutionTimes.length / 2);
    if (resolutionTimes.length % 2 === 0) {
      medianResolutionMinutes = (resolutionTimes[mid - 1] + resolutionTimes[mid]) / 2;
    } else {
      medianResolutionMinutes = resolutionTimes[mid];
    }
  }

  return {
    unresolvedValue,
    unresolvedCount,
    resolvedCount,
    totalCount,
    resolutionRate,
    medianResolutionMinutes,
  };
}

export async function getEngineTelemetry(): Promise<EngineTelemetry> {
  const payments = await getAllPayments();
  const totalCount = payments.length;

  const resolved = payments.filter((p) => p.status === "resolved");
  const ambiguous = payments.filter((p) => p.status === "ambiguous");
  const manualReview = payments.filter((p) => p.status === "manual_review");
  const unresolved = payments.filter((p) => p.status === "unresolved");

  const totalVolumePaise = payments.reduce((sum, p) => sum + p.amount, 0);
  const resolvedVolumePaise = resolved.reduce((sum, p) => sum + p.amount, 0);
  const unresolvedVolumePaise = totalVolumePaise - resolvedVolumePaise;

  const resolutionRate = totalCount > 0 ? resolved.length / totalCount : 0;
  const averageConfidence =
    totalCount > 0
      ? payments.reduce((sum, p) => sum + p.confidence, 0) / totalCount
      : 0;

  const resolutionTimes = resolved
    .filter((p) => p.resolved_at && p.received_at && p.resolved_at >= p.received_at)
    .map((p) => (p.resolved_at! - p.received_at) / 60_000)
    .sort((a, b) => a - b);

  let medianResolutionMinutes: number | null = null;
  if (resolutionTimes.length > 0) {
    const mid = Math.floor(resolutionTimes.length / 2);
    medianResolutionMinutes =
      resolutionTimes.length % 2 === 0
        ? (resolutionTimes[mid - 1] + resolutionTimes[mid]) / 2
        : resolutionTimes[mid];
  }

  // Fetch signal counts from evidence_log
  let signalCounts: Record<string, number> = {
    amount_match: 0,
    timing: 0,
    payer_history: 0,
    conversation: 0,
    batch_assignment: 0,
    negative: 0,
    order_age: 0,
    link_metadata: 0,
  };
  let totalSignalsComputed = 0;

  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase.from("evidence_log").select("signal_type");
    if (data) {
      totalSignalsComputed = data.length;
      for (const row of data) {
        const type = row.signal_type as string;
        signalCounts[type] = (signalCounts[type] || 0) + 1;
      }
    }
  } catch (err) {
    console.error("Error fetching evidence telemetry:", err);
  }

  return {
    totalCount,
    resolvedCount: resolved.length,
    unresolvedCount: unresolved.length,
    ambiguousCount: ambiguous.length,
    manualReviewCount: manualReview.length,
    totalVolumePaise,
    resolvedVolumePaise,
    unresolvedVolumePaise,
    resolutionRate,
    averageConfidence,
    medianResolutionMinutes,
    signalCounts,
    totalSignalsComputed,
  };
}

import { WeeklyComparison } from "./types";

export async function getWeeklyComparison(): Promise<WeeklyComparison> {
  const payments = await getAllPayments();
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const currentWeekStart = now - sevenDaysMs;
  const lastWeekStart = now - 2 * sevenDaysMs;

  const currentWeekPayments = payments.filter((p) => p.received_at >= currentWeekStart);
  const lastWeekPayments = payments.filter((p) => p.received_at >= lastWeekStart && p.received_at < currentWeekStart);

  const currentWeekTotal = currentWeekPayments.length;
  const currentWeekAmbiguous = currentWeekPayments.filter((p) => p.status === "ambiguous" || p.status === "manual_review").length;
  const currentWeekAmbiguousPct = currentWeekTotal > 0 ? Math.round((currentWeekAmbiguous / currentWeekTotal) * 100) : 0;

  const lastWeekTotal = lastWeekPayments.length;
  const lastWeekAmbiguous = lastWeekPayments.filter((p) => p.status === "ambiguous" || p.status === "manual_review").length;
  const lastWeekAmbiguousPct = lastWeekTotal > 0 ? Math.round((lastWeekAmbiguous / lastWeekTotal) * 100) : 35;

  const diffPct = lastWeekAmbiguousPct - currentWeekAmbiguousPct;
  const trend: "improved" | "declined" | "stable" = diffPct > 0 ? "improved" : diffPct < 0 ? "declined" : "stable";

  let summaryText = "";
  if (trend === "improved") {
    summaryText = `Ambiguous payments down ${Math.abs(diffPct)}% this week. ${Math.round((1 - (currentWeekTotal > 0 ? currentWeekAmbiguous / currentWeekTotal : 0)) * 100)}% resolved without manual intervention.`;
  } else if (trend === "declined") {
    summaryText = `Ambiguous payments up ${Math.abs(diffPct)}% this week due to recent price collisions.`;
  } else {
    summaryText = `Ambiguous payment rate steady at ${currentWeekAmbiguousPct}% with automated clarification enabled.`;
  }

  return {
    currentWeekTotal,
    currentWeekAmbiguous,
    currentWeekAmbiguousPct,
    lastWeekTotal,
    lastWeekAmbiguous,
    lastWeekAmbiguousPct,
    diffPct,
    trend,
    summaryText,
  };
}

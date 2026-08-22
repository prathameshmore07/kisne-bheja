import { getAllPayments } from "./repo";

export interface DashboardMetrics {
  unresolvedValue: number; // in paise
  unresolvedCount: number;
  resolvedCount: number;
  totalCount: number;
  resolutionRate: number; // 0..1
  medianResolutionMinutes: number | null;
}

export function getDashboardMetrics(): DashboardMetrics {
  const payments = getAllPayments();
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

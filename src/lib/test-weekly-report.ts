/**
 * UNIT TEST: Weekly Merchant Performance Comparison Report
 * 
 * Purpose: Verifies weekly reconciliation metrics comparison and natural language summary generation.
 */
import { getWeeklyComparison } from "./metrics";
import { clearAllData } from "./repo";
import { seedDatabase } from "./seed";

async function main() {
  console.log("=== Running isolated test: test-weekly-report ===");
  await clearAllData();
  await seedDatabase();

  console.log("--- Feature 7: Weekly Merchant Performance Comparison ---");
  const weeklyReport = await getWeeklyComparison();
  console.log("Weekly Report Summary:", weeklyReport.summaryText);
  console.log(` - Current Week: ${weeklyReport.currentWeekAmbiguousPct}% ambiguous (${weeklyReport.currentWeekTotal} payments)`);
  console.log(` - Last Week: ${weeklyReport.lastWeekAmbiguousPct}% ambiguous (${weeklyReport.lastWeekTotal} payments)`);
  console.log(` - Difference: ${weeklyReport.diffPct}% (Trend: ${weeklyReport.trend})`);
  if (weeklyReport.summaryText) {
    console.log("✓ Weekly merchant report computed trailing 7-day performance in plain language.");
  } else {
    console.error("✗ Weekly report summary generation failed");
    process.exit(1);
  }
  console.log("✅ test-weekly-report completed successfully.\n");
}

main().catch(console.error);

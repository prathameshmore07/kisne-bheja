"use client";

import { useState } from "react";

export interface ExportPaymentRow {
  id: string;
  amount: number; // in paise
  status: string;
  confidence: number;
  productName?: string;
  isBatchResolved?: boolean;
  received_at: number;
  resolved_at?: number | null;
}

export default function CsvExportButton({ payments }: { payments: ExportPaymentRow[] }) {
  const [downloading, setDownloading] = useState(false);

  function handleExport() {
    setDownloading(true);
    try {
      const headers = [
        "Payment ID",
        "Amount (INR)",
        "Status",
        "Confidence (%)",
        "Matched Order",
        "Joint Batch Resolved",
        "Fulfillment Status",
        "Received At (UTC)",
        "Resolved At (UTC)",
      ];

      const rows = payments.map((p) => [
        `"${p.id}"`,
        (p.amount / 100).toFixed(2),
        `"${p.status}"`,
        Math.round(p.confidence * 100),
        `"${p.productName || "—"}"`,
        p.isBatchResolved ? "Yes" : "No",
        p.status === "resolved" ? "Confirmed to customer" : "Pending",
        `"${new Date(p.received_at).toISOString()}"`,
        p.resolved_at ? `"${new Date(p.resolved_at).toISOString()}"` : "—",
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `kisne-bheja-ledger-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export CSV:", err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={downloading || payments.length === 0}
      className="text-xs font-mono px-3 py-1.5 rounded border border-line bg-paper text-ink hover:border-ink hover:text-ink transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
      title="Download reconciled payments ledger as CSV"
    >
      <span>↓</span>
      <span>{downloading ? "Exporting..." : "Export CSV"}</span>
    </button>
  );
}

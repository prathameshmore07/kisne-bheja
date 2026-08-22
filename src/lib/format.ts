export function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function statusColor(status: string): string {
  switch (status) {
    case "resolved": return "var(--green)";
    case "manual_review": return "var(--red)";
    case "ambiguous": return "var(--amber)";
    default: return "var(--muted)";
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "resolved": return "Resolved";
    case "manual_review": return "Needs review";
    case "ambiguous": return "Ambiguous";
    default: return "Unresolved";
  }
}

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
    case "resolved": return "Payment matched";
    case "manual_review": return "Needs your review";
    case "ambiguous": return "We're not sure yet";
    default: return "We're not sure yet";
  }
}

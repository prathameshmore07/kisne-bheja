import Link from "next/link";

export default function NotFound() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-24 text-center">
      <div className="font-display text-3xl font-bold mb-2 text-ink">404 — Not Found</div>
      <p className="text-sm text-muted font-body mb-6">This payment or page does not exist.</p>
      <Link href="/dashboard" className="text-xs font-mono underline text-ink hover:opacity-80">
        ← Back to dashboard
      </Link>
    </main>
  );
}

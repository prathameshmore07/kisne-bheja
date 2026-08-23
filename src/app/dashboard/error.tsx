"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="border border-red rounded-md p-6 bg-white shadow-xs">
        <div className="font-display text-xl font-bold mb-2 text-ink">Something went wrong</div>
        <p className="text-sm text-muted font-body mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="text-xs font-mono px-3.5 py-1.5 rounded bg-ink text-paper hover:opacity-90 cursor-pointer"
        >
          Try again
        </button>
      </div>
    </main>
  );
}

export default function DashboardLoading() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="animate-pulse space-y-6">
        <div className="h-6 w-40 bg-line rounded" />
        <div className="h-20 bg-line rounded" />
        <div className="h-64 bg-line rounded" />
      </div>
    </main>
  );
}

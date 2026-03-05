import { getDashboardData } from "@/lib/data";

export default async function CashflowPage() {
  const data = await getDashboardData();

  return (
    <div className="panel p-6">
      <h1 className="text-2xl font-semibold">Cash Flow</h1>
      <p className="mt-2 text-muted">Cash flow analysis coming soon.</p>
      <pre className="mt-4 overflow-auto rounded bg-surface p-4 text-xs">
        {JSON.stringify(data.financialSummary, null, 2)}
      </pre>
    </div>
  );
}

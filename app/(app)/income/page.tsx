import { Topbar } from "@/components/layout/topbar";
import { IncomeManager } from "@/components/income/income-manager";

export default function IncomePage() {
  return (
    <>
      <Topbar title="Income" subtitle="Manage salary and recurring income streams" />
      <IncomeManager />
    </>
  );
}

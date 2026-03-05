import { getDailyTrackingData } from "@/lib/data";
import { CashflowView } from "./cashflow-view";

export default async function CashflowPage() {
  const data = await getDailyTrackingData();

  const monthStart = new Date(data.date);
  monthStart.setDate(1);
  const monthLabel = monthStart.toLocaleDateString("en-PH", { month: "long", year: "numeric" });

  return <CashflowView data={data} monthLabel={monthLabel} />;
}

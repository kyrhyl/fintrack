import { connectToDatabase } from "@/lib/mongodb";
import { RecurringExpense } from "@/models/RecurringExpense";
import { Transaction } from "@/models/Transaction";

type GenerateResult = {
  created: number;
  skipped: number;
  updated: number;
  errors: string[];
};

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export async function generateRecurringExpenses(): Promise<GenerateResult> {
  await connectToDatabase();

  const result: GenerateResult = {
    created: 0,
    skipped: 0,
    updated: 0,
    errors: [],
  };

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const dueItems = await RecurringExpense.find({
    isActive: true,
    autoCreateTransaction: true,
    nextDueDate: { $lte: today },
  }).lean();

  for (const item of dueItems) {
    try {
      const existingTransaction = await Transaction.findOne({
        recurringExpenseId: item._id,
        transactionDate: {
          $gte: new Date(item.nextDueDate.getFullYear(), item.nextDueDate.getMonth(), 1),
          $lt: new Date(item.nextDueDate.getFullYear(), item.nextDueDate.getMonth() + 1, 1),
        },
      }).lean();

      if (existingTransaction) {
        result.skipped += 1;
        continue;
      }

      await Transaction.create({
        title: item.name,
        kind: "expense",
        category: item.category,
        amount: item.amount,
        transactionDate: item.nextDueDate,
        notes: "Auto-generated from recurring expense",
        recurringExpenseId: item._id,
      });

      const recurrenceMonths: Record<string, number> = {
        monthly: 1,
        quarterly: 3,
        yearly: 12,
      };
      const monthsToAdd = recurrenceMonths[item.recurrenceRule] || 1;
      const newDueDate = addMonths(item.nextDueDate, monthsToAdd);

      await RecurringExpense.findByIdAndUpdate(item._id, {
        nextDueDate: newDueDate,
      });

      result.created += 1;
      result.updated += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      result.errors.push(`Failed to process ${item.name}: ${message}`);
    }
  }

  return result;
}

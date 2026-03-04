import type { DebtsData } from "@/types/finance";

type LoanItem = DebtsData["loans"][number];

export function isSalaryDeductibleLoan(loan: LoanItem) {
  const text = `${loan.name} ${loan.category || ""}`.toLowerCase();
  return text.includes("gsis") || text.includes("salary") || text.includes("payroll") || text.includes("deduct");
}

export function isCreditCardLoan(loan: LoanItem) {
  const text = `${loan.name} ${loan.category || ""}`.toLowerCase();
  return loan.category === "credit_card" || text.includes("credit") || text.includes("card") || text.includes("balance conversion");
}

export function isInstallmentLoan(loan: LoanItem) {
  return !isSalaryDeductibleLoan(loan) && !isCreditCardLoan(loan);
}

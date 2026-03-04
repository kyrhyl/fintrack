import { toMonthKey } from "@/lib/month";

type PaymentEntry = {
  monthKey: string;
  paid: boolean;
  paidAt?: Date;
};

type LiabilityScheduleInput = {
  principal?: number;
  monthlyPayment?: number;
  monthlyAmortization?: number;
  termMonths?: number;
  startDate?: Date;
  dateIncurred?: Date;
  paymentHistory?: PaymentEntry[];
};

export type LiabilityComputed = {
  dateIncurred: Date;
  monthlyAmortization: number;
  termMonths: number;
  totalDebt: number;
  dueInstallments: number;
  paidInstallments: number;
  outstandingBalance: number;
  currentMonthPaid: boolean;
  overdueInstallments: number;
};

function toMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, count: number) {
  const value = new Date(date);
  value.setUTCMonth(value.getUTCMonth() + count);
  return value;
}

function monthDiff(start: Date, end: Date) {
  const years = end.getUTCFullYear() - start.getUTCFullYear();
  const months = end.getUTCMonth() - start.getUTCMonth();
  return years * 12 + months;
}

function toNonNegativeNumber(value: unknown) {
  const num = Number(value || 0);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function toPositiveInt(value: unknown) {
  const num = Number(value || 0);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
}

function normalizePayments(entries: PaymentEntry[] | undefined) {
  const byMonth = new Map<string, boolean>();

  for (const entry of entries || []) {
    if (!entry || typeof entry.monthKey !== "string") {
      continue;
    }
    byMonth.set(entry.monthKey, Boolean(entry.paid));
  }

  return byMonth;
}

export function computeLiabilityValues(input: LiabilityScheduleInput, now = new Date()): LiabilityComputed {
  const monthlyAmortization = toNonNegativeNumber(
    toNonNegativeNumber(input.monthlyAmortization) > 0 ? input.monthlyAmortization : input.monthlyPayment,
  );
  const inferredTermFromPrincipal =
    monthlyAmortization > 0 ? Math.ceil(toNonNegativeNumber(input.principal) / monthlyAmortization) : 0;
  const termMonths = toPositiveInt(input.termMonths) || inferredTermFromPrincipal;
  const start = input.dateIncurred || input.startDate || now;
  const dateIncurred = toMonthStart(new Date(start));

  const totalDebt = Number((monthlyAmortization * termMonths).toFixed(2));
  const elapsed = Math.max(0, monthDiff(dateIncurred, toMonthStart(now)) + 1);
  const dueInstallments = Math.min(termMonths, elapsed);

  const paidMap = normalizePayments(input.paymentHistory);
  let paidInstallments = 0;
  for (let index = 0; index < dueInstallments; index += 1) {
    const key = toMonthKey(addMonths(dateIncurred, index));
    if (paidMap.get(key) === true) {
      paidInstallments += 1;
    }
  }

  const paidTotal = Number((paidInstallments * monthlyAmortization).toFixed(2));
  const outstandingBalance = Number(Math.max(0, totalDebt - paidTotal).toFixed(2));
  const currentMonthPaid = paidMap.get(toMonthKey(toMonthStart(now))) === true;

  return {
    dateIncurred,
    monthlyAmortization,
    termMonths,
    totalDebt,
    dueInstallments,
    paidInstallments,
    outstandingBalance,
    currentMonthPaid,
    overdueInstallments: Math.max(0, dueInstallments - paidInstallments),
  };
}

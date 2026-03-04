export function formatPHP(value: number): string {
  const isNegative = value < 0;
  const formatted = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  return `${isNegative ? "-" : ""}₱${formatted}`;
}

// NTD is handled as whole-dollar integers end to end, so plain integer
// arithmetic is exact and no decimal library is needed.

export const MAX_AMOUNT = 10_000_000

const amountFormatter = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 })

/** Bare number for table cells whose header already says 元, e.g. "3,500". */
export function formatAmount(amount: number): string {
  return amountFormatter.format(amount)
}

/** Same style the family writes by hand, e.g. "3,500元". */
export function formatMoney(amount: number): string {
  return `${formatAmount(amount)}元`
}

/** Signed table value with a true minus sign, e.g. "+5,000" / "−3,500". */
export function formatSignedAmount(amount: number): string {
  if (amount === 0) return '0'
  return `${amount > 0 ? '+' : '−'}${formatAmount(Math.abs(amount))}`
}

export function isValidAmount(amount: number): boolean {
  return Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_AMOUNT
}

/** Parses user input such as "5,000" into an integer amount; returns null when invalid. */
export function parseAmount(text: string): number | null {
  const digits = text.replace(/[,\s]/g, '')
  if (!/^\d+$/.test(digits)) return null
  const amount = Number(digits)
  return isValidAmount(amount) ? amount : null
}

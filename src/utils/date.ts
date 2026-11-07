import type { DateKey, MonthKey } from '@/types/ledger'

const FAMILY_TIME_ZONE = 'Asia/Taipei'
const MONTHS_PER_YEAR = 12

// en-CA formats as YYYY-MM-DD, which is exactly the DB `date` format.
const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: FAMILY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Today's calendar date for the family (Taipei), independent of the device time zone. */
export function todayKey(now: Date = new Date()): DateKey {
  return dateKeyFormatter.format(now)
}

export function currentMonth(now: Date = new Date()): MonthKey {
  return todayKey(now).slice(0, 7)
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

function splitMonth(month: MonthKey): [number, number] {
  if (!isMonthKey(month)) throw new RangeError(`Invalid month key: ${month}`)
  const [year, monthNumber] = month.split('-').map(Number)
  return [year, monthNumber]
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [year, monthNumber] = splitMonth(month)
  const index = year * MONTHS_PER_YEAR + (monthNumber - 1) + delta
  const nextYear = Math.floor(index / MONTHS_PER_YEAR)
  const nextMonth = (index % MONTHS_PER_YEAR) + 1
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`
}

/** Half-open range [start, endExclusive) of dates in the month, for DB queries. */
export function monthDateRange(month: MonthKey): { start: DateKey; endExclusive: DateKey } {
  return { start: `${month}-01`, endExclusive: `${shiftMonth(month, 1)}-01` }
}

export function formatMonthLabel(month: MonthKey): string {
  const [year, monthNumber] = splitMonth(month)
  return `${year}年${monthNumber}月`
}

export function formatShortMonth(month: MonthKey): string {
  return `${splitMonth(month)[1]}月`
}

/** Style the family writes by hand, e.g. "11月1號". */
export function formatShareDate(date: DateKey): string {
  const [, monthNumber, day] = date.split('-').map(Number)
  return `${monthNumber}月${day}號`
}

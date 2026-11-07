import type { Contribution, DateKey, Expense, LedgerData, Member, MonthKey } from '@/types/ledger'
import { formatShortMonth, monthDateRange, monthOf } from './date'
import {
  compareChronologically,
  computeBalanceBefore,
  computeFundBalance,
  duesStatus,
  settleAdvances,
  type DuesStatusItem,
  type Repayment,
  type Settlement,
} from './ledgerCalc'
import { formatMoney } from './money'

const UNKNOWN_MEMBER = '（已移除的成員）'

export interface EntryText {
  title: string
  detail: string
}

export interface PassbookRow extends EntryText {
  kind: 'income' | 'expense'
  id: string
  date: DateKey
  /** Always positive; `kind` gives the direction. */
  amount: number
  /** Book balance right after this record. */
  balanceAfter: number
  /** An expense whose advance has not been fully paid back yet. */
  hasOutstandingAdvance: boolean
  /** "10月公費" when dues count toward a month other than the one received in, else null. */
  duesMonthTag: string | null
}

export interface MemberAdvanceSummary {
  memberName: string
  advanced: number
  repaid: number
  outstanding: number
}

export interface MonthTotals {
  income: number
  expense: number
}

function memberName(members: readonly Member[], id: string | null): string {
  return members.find((m) => m.id === id)?.name ?? UNKNOWN_MEMBER
}

/** "公費支付" / "媽媽代墊" / "公費支付1,000元、媽媽代墊2,500元". */
export function paymentLabel(e: Pick<Expense, 'amount' | 'advancedBy' | 'advancedAmount'>, members: readonly Member[]): string {
  if (e.advancedBy === null) return '公費支付'
  const name = memberName(members, e.advancedBy)
  if (e.advancedAmount >= e.amount) return `${name}代墊`
  return `公費支付${formatMoney(e.amount - e.advancedAmount)}、${name}代墊${formatMoney(e.advancedAmount)}`
}

/** "歸還媽媽代墊3,500元、歸還爸爸代墊1,200元". */
export function repaymentText(repayments: readonly Repayment[], members: readonly Member[]): string {
  return repayments.map((r) => `歸還${memberName(members, r.memberId)}代墊${formatMoney(r.amount)}`).join('、')
}

/** The dues month when it differs from the month the money arrived (early or late payment). */
function otherDuesMonth(c: Pick<Contribution, 'forMonth' | 'receivedDate'>): MonthKey | null {
  return c.forMonth !== null && c.forMonth !== monthOf(c.receivedDate) ? c.forMonth : null
}

function duesMonthTag(c: Pick<Contribution, 'forMonth' | 'receivedDate'>): string | null {
  const month = otherDuesMonth(c)
  return month ? `${formatShortMonth(month)}公費` : null
}

/** Repayments are listed on the income that funded them. */
export function describeContribution(
  c: Pick<Contribution, 'memberId' | 'forMonth' | 'description' | 'receivedDate'>,
  members: readonly Member[],
  repayments: readonly Repayment[] = [],
): EntryText {
  const repaid = repaymentText(repayments, members)
  if (c.memberId === null || c.forMonth === null) {
    return { title: c.description, detail: repaid }
  }
  // "X月的" only when paid for a different month than received, so rows stay short.
  const duesMonth = otherDuesMonth(c)
  const otherMonth = duesMonth ? `${formatShortMonth(duesMonth)}的` : ''
  return {
    title: `${memberName(members, c.memberId)}繳費`,
    detail: [otherMonth, c.description, repaid].filter(Boolean).join('・'),
  }
}

export function describeExpense(
  e: Pick<Expense, 'amount' | 'advancedBy' | 'advancedAmount' | 'description'>,
  members: readonly Member[],
): EntryText {
  return { title: e.description, detail: e.advancedBy === null ? '' : paymentLabel(e, members) }
}

/**
 * One month of the passbook, oldest first like a paper ledger,
 * each row carrying the running book balance.
 */
export function buildPassbook(
  openingBalance: number,
  contributions: readonly Contribution[],
  expenses: readonly Expense[],
  members: readonly Member[],
  settlement: Settlement,
): PassbookRow[] {
  const outstandingIds = new Set(settlement.advances.filter((a) => a.outstanding > 0).map((a) => a.expense.id))
  const records = [
    ...contributions.map((c) => ({
      kind: 'income' as const,
      id: c.id,
      date: c.receivedDate,
      createdAt: c.createdAt,
      amount: c.amount,
      hasOutstandingAdvance: false,
      duesMonthTag: duesMonthTag(c),
      ...describeContribution(c, members, settlement.repayments.filter((r) => r.contributionId === c.id)),
    })),
    ...expenses.map((e) => ({
      kind: 'expense' as const,
      id: e.id,
      date: e.spentDate,
      createdAt: e.createdAt,
      amount: e.amount,
      hasOutstandingAdvance: outstandingIds.has(e.id),
      duesMonthTag: null,
      ...describeExpense(e, members),
    })),
  ].sort(compareChronologically)

  let running = openingBalance
  return records.map(({ createdAt: _createdAt, ...record }) => {
    running += record.kind === 'income' ? record.amount : -record.amount
    return { ...record, balanceAfter: running }
  })
}

/** Unpaid advances totalled per member, in the order they were first advanced. */
export function outstandingAdvancesByMember(settlement: Settlement, members: readonly Member[]): MemberAdvanceSummary[] {
  const byMember = new Map<string, MemberAdvanceSummary>()
  for (const advance of settlement.advances) {
    if (advance.outstanding === 0) continue
    const summary = byMember.get(advance.memberId) ?? {
      memberName: memberName(members, advance.memberId),
      advanced: 0,
      repaid: 0,
      outstanding: 0,
    }
    summary.advanced += advance.expense.advancedAmount
    summary.repaid += advance.repaid
    summary.outstanding += advance.outstanding
    byMember.set(advance.memberId, summary)
  }
  return [...byMember.values()]
}

export function monthTotals(rows: readonly Pick<PassbookRow, 'kind' | 'amount'>[]): MonthTotals {
  return rows.reduce(
    (totals, row) =>
      row.kind === 'income'
        ? { ...totals, income: totals.income + row.amount }
        : { ...totals, expense: totals.expense + row.amount },
    { income: 0, expense: 0 },
  )
}

export interface MonthView {
  bookBalance: number
  openingBalance: number
  rows: PassbookRow[]
  totals: MonthTotals
  dues: DuesStatusItem[]
  advances: MemberAdvanceSummary[]
}

/** Everything the home page shows for one month, derived from the full ledger. */
export function buildMonthView(data: LedgerData, month: MonthKey): MonthView {
  const { members, contributions, expenses } = data
  const inMonth = (date: DateKey) => date.slice(0, 7) === month
  const settlement = settleAdvances(contributions, expenses)
  const openingBalance = computeBalanceBefore(contributions, expenses, monthDateRange(month).start)
  const rows = buildPassbook(
    openingBalance,
    contributions.filter((c) => inMonth(c.receivedDate)),
    expenses.filter((e) => inMonth(e.spentDate)),
    members,
    settlement,
  )
  return {
    bookBalance: computeFundBalance(contributions, expenses),
    openingBalance,
    rows,
    totals: monthTotals(rows),
    dues: duesStatus(members, contributions, month),
    advances: outstandingAdvancesByMember(settlement, members),
  }
}

/** Distinct places, newest first, for the quick-pick buttons. */
export function recentPlaces(expenses: readonly Expense[], limit: number): string[] {
  const newestFirst = [...expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return [...new Set(newestFirst.map((e) => e.description.trim()).filter(Boolean))].slice(0, limit)
}

export interface FieldChange {
  label: string
  before: string
  after: string
}

/** "金額：3,000元 → 5,000元" lines for the fields that actually changed. */
export function changeLines(fields: readonly FieldChange[]): string[] {
  return fields.filter((f) => f.before !== f.after).map((f) => `${f.label}：${f.before} → ${f.after}`)
}

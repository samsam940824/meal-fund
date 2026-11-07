import type { Contribution, DateKey, Expense, Member, MonthKey } from '@/types/ledger'

function sumAmounts(items: ReadonlyArray<{ amount: number }>): number {
  return items.reduce((total, item) => total + item.amount, 0)
}

/** Ledger order: by date, then by entry time for records on the same day. */
export function compareChronologically(
  a: { date: DateKey; createdAt: string },
  b: { date: DateKey; createdAt: string },
): number {
  return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
}

/**
 * Book balance: spending counts the moment it happens, even when a member advanced it,
 * matching how the family keeps its paper ledger. Equals cash on hand minus unpaid advances.
 */
export function computeFundBalance(contributions: readonly Contribution[], expenses: readonly Expense[]): number {
  return sumAmounts(contributions) - sumAmounts(expenses)
}

/** Book balance from records dated strictly before `date`, i.e. the month's opening balance. */
export function computeBalanceBefore(
  contributions: readonly Contribution[],
  expenses: readonly Expense[],
  date: DateKey,
): number {
  return (
    sumAmounts(contributions.filter((c) => c.receivedDate < date)) -
    sumAmounts(expenses.filter((e) => e.spentDate < date))
  )
}

export interface Repayment {
  expenseId: string
  contributionId: string
  memberId: string
  amount: number
}

export interface AdvanceBalance {
  expense: Expense
  memberId: string
  repaid: number
  outstanding: number
}

export interface Settlement {
  /** Money the fund physically holds after every record. */
  cash: number
  /** Every expense that had an advance, oldest first. */
  advances: AdvanceBalance[]
  repayments: Repayment[]
}

/**
 * Replays all records in ledger order. The fund's cash pays each meal's non-advanced part;
 * every income then pays back outstanding advances, oldest first, as far as the cash allows.
 * Derived on every load, so editing or deleting a record automatically re-settles everything.
 */
export function settleAdvances(contributions: readonly Contribution[], expenses: readonly Expense[]): Settlement {
  const events = [
    ...contributions.map((c) => ({ date: c.receivedDate, createdAt: c.createdAt, contribution: c, expense: null })),
    ...expenses.map((e) => ({ date: e.spentDate, createdAt: e.createdAt, contribution: null, expense: e })),
  ].sort(compareChronologically)

  let cash = 0
  const advances: AdvanceBalance[] = []
  const repayments: Repayment[] = []
  for (const { contribution, expense } of events) {
    if (expense) {
      cash -= expense.amount - expense.advancedAmount
      if (expense.advancedBy !== null && expense.advancedAmount > 0) {
        advances.push({ expense, memberId: expense.advancedBy, repaid: 0, outstanding: expense.advancedAmount })
      }
      continue
    }
    if (!contribution) continue
    cash += contribution.amount
    for (const advance of advances) {
      if (cash <= 0) break
      if (advance.outstanding === 0) continue
      const amount = Math.min(advance.outstanding, cash)
      advance.repaid += amount
      advance.outstanding -= amount
      cash -= amount
      repayments.push({ expenseId: advance.expense.id, contributionId: contribution.id, memberId: advance.memberId, amount })
    }
  }
  return { cash, advances, repayments }
}

export interface DuesStatusItem {
  member: Member
  paid: number
  due: number
  /** paid − due: positive = paid extra, negative = still owed; null when the member has no fixed amount. */
  difference: number | null
}

/** Who has paid this month's dues, for active members only. */
export function duesStatus(
  members: readonly Member[],
  contributions: readonly Contribution[],
  month: MonthKey,
): DuesStatusItem[] {
  return members
    .filter((member) => member.active)
    .map((member) => {
      const paid = sumAmounts(
        contributions.filter((c) => c.memberId === member.id && c.forMonth === month),
      )
      const due = member.monthlyDue
      return { member, paid, due, difference: due > 0 ? paid - due : null }
    })
}


/** Month key in `YYYY-MM` form, e.g. `2026-11`. */
export type MonthKey = string

/** Calendar date in `YYYY-MM-DD` form (Asia/Taipei local date). */
export type DateKey = string

export interface Member {
  id: string
  name: string
  /** Expected contribution per month, whole NTD; 0 = no fixed amount. */
  monthlyDue: number
  active: boolean
}

export interface Contribution {
  id: string
  /** `null` = not a member's dues, e.g. money the fund already had when the family started using the app. */
  memberId: string | null
  amount: number
  receivedDate: DateKey
  /** Which month's dues this pays for; `null` when `memberId` is null. */
  forMonth: MonthKey | null
  description: string
  /** ISO timestamp (UTC); orders records on the same day. */
  createdAt: string
}

export interface Expense {
  id: string
  amount: number
  spentDate: DateKey
  description: string
  /** Member who covered part or all of the bill; `null` = paid entirely from the fund. */
  advancedBy: string | null
  /** How much `advancedBy` covered (0 when null). The fund paid `amount - advancedAmount`. */
  advancedAmount: number
  createdAt: string
}

export type MemberInput = Pick<Member, 'name' | 'monthlyDue'>
export type NewContribution = Omit<Contribution, 'id' | 'createdAt'>
export type NewExpense = Omit<Expense, 'id' | 'createdAt'>

/** Every record; all balances and repayments are derived from this in `utils/`. */
export interface LedgerData {
  members: Member[]
  contributions: Contribution[]
  expenses: Expense[]
}

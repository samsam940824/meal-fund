import type { Contribution, Expense, Member } from '@/types/ledger'

export const members: Member[] = [
  { id: 'm-dad', name: '爸爸', monthlyDue: 5000, active: true },
  { id: 'm-mom', name: '媽媽', monthlyDue: 5000, active: true },
  { id: 'm-bro', name: '大哥', monthlyDue: 3000, active: true },
  { id: 'm-old', name: '舊成員', monthlyDue: 3000, active: false },
  { id: 'm-grandpa', name: '阿公', monthlyDue: 0, active: true },
]

export const contribution = (overrides: Partial<Contribution>): Contribution => ({
  id: 'c',
  memberId: 'm-dad',
  amount: 1000,
  receivedDate: '2026-11-01',
  forMonth: '2026-11',
  description: '',
  createdAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
})

export const expense = (overrides: Partial<Expense>): Expense => ({
  id: 'e',
  amount: 100,
  spentDate: '2026-11-02',
  description: '巷口 熱炒',
  advancedBy: null,
  advancedAmount: 0,
  createdAt: '2026-11-02T00:00:00.000Z',
  ...overrides,
})

/** Expense fully advanced by `memberId`. */
export const advance = (memberId: string, overrides: Partial<Expense>): Expense => {
  const base = expense(overrides)
  return { ...base, advancedBy: memberId, advancedAmount: overrides.advancedAmount ?? base.amount }
}

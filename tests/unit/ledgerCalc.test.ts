import { describe, expect, it } from 'vitest'
import { computeBalanceBefore, computeFundBalance, duesStatus, settleAdvances } from '@/utils/ledgerCalc'
import { advance, contribution, expense, members } from './fixtures'

describe('computeFundBalance', () => {
  it('is zero with no records', () => {
    expect(computeFundBalance([], [])).toBe(0)
  })

  it('deducts spending immediately, even when a member advanced it', () => {
    expect(computeFundBalance([contribution({ amount: 4000 })], [advance('m-mom', { amount: 3500 })])).toBe(500)
  })

  it('allows a negative balance when spending exceeds income', () => {
    expect(computeFundBalance([], [expense({ amount: 300 })])).toBe(-300)
  })
})

describe('computeBalanceBefore', () => {
  it('only counts records dated strictly before the given date', () => {
    const result = computeBalanceBefore(
      [contribution({ amount: 4000, receivedDate: '2026-10-20' }), contribution({ amount: 5000, receivedDate: '2026-11-01' })],
      [expense({ amount: 1200, spentDate: '2026-10-31' }), expense({ amount: 900, spentDate: '2026-11-01' })],
      '2026-11-01',
    )
    expect(result).toBe(2800)
  })
})

describe('duesStatus', () => {
  it('sums what each active member paid for the month and the difference from what is due', () => {
    const items = duesStatus(
      members,
      [
        contribution({ memberId: 'm-dad', amount: 5000 }),
        contribution({ memberId: 'm-mom', amount: 2000 }),
        contribution({ memberId: 'm-mom', amount: 1000 }),
        contribution({ memberId: 'm-bro', amount: 3000, forMonth: '2026-10' }),
        contribution({ memberId: null, forMonth: null, amount: 9999, description: '原本的錢' }),
      ],
      '2026-11',
    )
    const byName = Object.fromEntries(items.map((i) => [i.member.name, i]))
    expect(Object.keys(byName)).toEqual(['爸爸', '媽媽', '大哥', '阿公'])
    expect(byName['爸爸']).toMatchObject({ paid: 5000, difference: 0 })
    expect(byName['媽媽']).toMatchObject({ paid: 3000, difference: -2000 })
    expect(byName['大哥']).toMatchObject({ paid: 0, difference: -3000 })
    expect(byName['阿公']).toMatchObject({ paid: 0, difference: null, due: 0 })
  })

  it('has no difference when the member has no fixed amount', () => {
    const grandpa = members.find((m) => m.id === 'm-grandpa')!
    const [item] = duesStatus([grandpa], [contribution({ memberId: 'm-grandpa', amount: 600 })], '2026-11')
    expect(item).toMatchObject({ paid: 600, difference: null })
  })

  it('reports overpayment as a positive difference', () => {
    const [item] = duesStatus([members[0]], [contribution({ memberId: 'm-dad', amount: 8000 })], '2026-11')
    expect(item).toMatchObject({ difference: 3000, paid: 8000 })
  })
})

describe('settleAdvances', () => {
  it("pays back the family's 11/1 advance from the 11/10 income, leaving 500 cash", () => {
    const result = settleAdvances(
      [contribution({ id: 'c1', amount: 4000, receivedDate: '2026-11-10' })],
      [advance('m-mom', { id: 'e1', amount: 3500, spentDate: '2026-11-01' })],
    )
    expect(result.repayments).toEqual([{ expenseId: 'e1', contributionId: 'c1', memberId: 'm-mom', amount: 3500 }])
    expect(result.advances[0]).toMatchObject({ repaid: 3500, outstanding: 0 })
    expect(result.cash).toBe(500)
  })

  it('repays partially when the income is not enough, and finishes with the next income', () => {
    const result = settleAdvances(
      [
        contribution({ id: 'c1', amount: 2000, receivedDate: '2026-11-05' }),
        contribution({ id: 'c2', amount: 3000, receivedDate: '2026-11-08' }),
      ],
      [advance('m-mom', { id: 'e1', amount: 3500, spentDate: '2026-11-01' })],
    )
    expect(result.repayments.map((r) => [r.contributionId, r.amount])).toEqual([
      ['c1', 2000],
      ['c2', 1500],
    ])
    expect(result.cash).toBe(1500)
  })

  it('pays back the oldest advance first', () => {
    const result = settleAdvances(
      [contribution({ id: 'c1', amount: 1000, receivedDate: '2026-11-10' })],
      [
        advance('m-dad', { id: 'late', amount: 800, spentDate: '2026-11-03' }),
        advance('m-mom', { id: 'early', amount: 700, spentDate: '2026-11-02' }),
      ],
    )
    expect(result.repayments.map((r) => [r.expenseId, r.amount])).toEqual([
      ['early', 700],
      ['late', 300],
    ])
  })

  it('only lets income dated after an advance pay it back', () => {
    const result = settleAdvances(
      [contribution({ id: 'c1', amount: 5000, receivedDate: '2026-11-01' })],
      [advance('m-mom', { id: 'e1', amount: 3500, spentDate: '2026-11-02' })],
    )
    expect(result.repayments).toEqual([])
    expect(result.advances[0].outstanding).toBe(3500)
  })

  it('takes the fund part of a split bill from cash and keeps cash minus unpaid advances equal to the book balance', () => {
    const contributions = [contribution({ id: 'c1', amount: 1000, receivedDate: '2026-11-01' })]
    const expenses = [advance('m-mom', { id: 'e1', amount: 3500, advancedAmount: 2500, spentDate: '2026-11-02' })]
    const result = settleAdvances(contributions, expenses)
    expect(result.cash).toBe(0)
    expect(result.advances[0].outstanding).toBe(2500)
    expect(result.cash - result.advances[0].outstanding).toBe(computeFundBalance(contributions, expenses))
  })
})

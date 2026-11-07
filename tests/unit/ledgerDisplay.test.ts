import { describe, expect, it } from 'vitest'
import { settleAdvances } from '@/utils/ledgerCalc'
import {
  buildMonthView,
  buildPassbook,
  changeLines,
  describeContribution,
  describeExpense,
  monthTotals,
  outstandingAdvancesByMember,
  paymentLabel,
  recentPlaces,
} from '@/utils/ledgerDisplay'
import { advance, contribution, expense, members } from './fixtures'

describe('buildPassbook', () => {
  it("reproduces the family's paper ledger: advance on 11/1, dues on 11/10, 500 left", () => {
    const contributions = [
      contribution({ id: 'c1', memberId: null, forMonth: null, amount: 4000, receivedDate: '2026-11-10', description: '收公費' }),
    ]
    const expenses = [advance('m-mom', { id: 'e1', amount: 3500, spentDate: '2026-11-01', description: '竹圍 海鮮' })]
    const rows = buildPassbook(0, contributions, expenses, members, settleAdvances(contributions, expenses))
    expect(rows.map((r) => [r.date, r.title, r.amount, r.balanceAfter, r.hasOutstandingAdvance, r.detail])).toEqual([
      ['2026-11-01', '竹圍 海鮮', 3500, -3500, false, '媽媽代墊'],
      ['2026-11-10', '收公費', 4000, 500, false, '歸還媽媽代墊3,500元'],
    ])
  })

  it('flags an advance until it is fully paid back', () => {
    const expenses = [advance('m-dad', { id: 'e1', amount: 1200 })]
    const [row] = buildPassbook(0, [], expenses, members, settleAdvances([], expenses))
    expect(row.hasOutstandingAdvance).toBe(true)
  })

  it('starts from the opening balance and orders same-day records by entry time', () => {
    const contributions = [contribution({ id: 'late', amount: 200, receivedDate: '2026-11-05', createdAt: '2026-11-05T09:00:00Z' })]
    const expenses = [expense({ id: 'early', amount: 300, spentDate: '2026-11-05', createdAt: '2026-11-05T08:00:00Z' })]
    const rows = buildPassbook(1000, contributions, expenses, members, settleAdvances(contributions, expenses))
    expect(rows.map((r) => [r.id, r.balanceAfter])).toEqual([
      ['early', 700],
      ['late', 900],
    ])
  })
})

describe('describeContribution / describeExpense / paymentLabel', () => {
  it('keeps dues short unless paid for a different month', () => {
    const dues = { memberId: 'm-dad', forMonth: '2026-11', description: '', receivedDate: '2026-11-03' }
    expect(describeContribution(dues, members)).toEqual({ title: '爸爸繳費', detail: '' })
    expect(describeContribution({ ...dues, receivedDate: '2026-12-01', description: '補交' }, members).detail).toBe('11月的・補交')
  })

  it('uses the free-text description for other income', () => {
    expect(
      describeContribution({ memberId: null, forMonth: null, description: '期初餘額', receivedDate: '2026-11-01' }, members),
    ).toEqual({ title: '期初餘額', detail: '' })
  })

  it('describes how a meal was paid', () => {
    const meal = { description: '竹圍 海鮮', amount: 3500 }
    expect(paymentLabel({ ...meal, advancedBy: null, advancedAmount: 0 }, members)).toBe('公費支付')
    expect(paymentLabel({ ...meal, advancedBy: 'm-mom', advancedAmount: 3500 }, members)).toBe('媽媽代墊')
    expect(paymentLabel({ ...meal, advancedBy: 'm-mom', advancedAmount: 2500 }, members)).toBe('公費支付1,000元、媽媽代墊2,500元')
    expect(describeExpense({ ...meal, advancedBy: null, advancedAmount: 0 }, members).detail).toBe('')
  })
})

describe('outstandingAdvancesByMember', () => {
  it('totals what each member advanced, got back and is still owed', () => {
    const contributions = [contribution({ id: 'c1', amount: 1000, receivedDate: '2026-11-10' })]
    const expenses = [
      advance('m-mom', { id: 'e1', amount: 3500, spentDate: '2026-11-01' }),
      advance('m-mom', { id: 'e2', amount: 500, spentDate: '2026-11-02' }),
      advance('m-dad', { id: 'e3', amount: 1200, spentDate: '2026-11-03' }),
    ]
    expect(outstandingAdvancesByMember(settleAdvances(contributions, expenses), members)).toEqual([
      { memberName: '媽媽', advanced: 4000, repaid: 1000, outstanding: 3000 },
      { memberName: '爸爸', advanced: 1200, repaid: 0, outstanding: 1200 },
    ])
  })
})

describe('buildMonthView', () => {
  it('derives the month from the whole ledger', () => {
    const view = buildMonthView(
      {
        members,
        contributions: [
          contribution({ id: 'c0', memberId: null, forMonth: null, amount: 2800, receivedDate: '2026-10-20', description: '期初餘額' }),
          contribution({ id: 'c1', memberId: 'm-dad', amount: 5000, receivedDate: '2026-11-03' }),
        ],
        expenses: [advance('m-mom', { id: 'e1', amount: 3500, spentDate: '2026-11-01' })],
      },
      '2026-11',
    )
    expect(view).toMatchObject({ openingBalance: 2800, bookBalance: 4300, totals: { income: 5000, expense: 3500 }, advances: [] })
    expect(view.rows.map((r) => r.id)).toEqual(['e1', 'c1'])
  })
})

describe('recentPlaces', () => {
  it('drops duplicates and blanks, keeping newest first, up to the limit', () => {
    const at = (description: string, createdAt: string) => expense({ description, createdAt })
    expect(
      recentPlaces(
        [at('熱炒', '1'), at('欣葉', '2'), at('竹圍 海鮮', '3'), at(' 鼎泰豐 ', '4'), at('竹圍 海鮮', '5')],
        3,
      ),
    ).toEqual(['竹圍 海鮮', '鼎泰豐', '欣葉'])
  })
})

describe('changeLines', () => {
  it('lists only the fields that changed', () => {
    expect(
      changeLines([
        { label: '金額', before: '3,000元', after: '5,000元' },
        { label: '日期', before: '11月3號', after: '11月3號' },
      ]),
    ).toEqual(['金額：3,000元 → 5,000元'])
  })
})

describe('monthTotals', () => {
  it('adds up income and spending separately', () => {
    expect(
      monthTotals([
        { kind: 'income', amount: 5000 },
        { kind: 'expense', amount: 3500 },
        { kind: 'expense', amount: 1200 },
      ]),
    ).toEqual({ income: 5000, expense: 4700 })
  })
})

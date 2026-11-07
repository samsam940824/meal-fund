import { describe, expect, it } from 'vitest'
import { buildShareText, lineShareUrl } from '@/utils/lineShare'

describe('buildShareText', () => {
  it("follows the family's handwritten style", () => {
    const text = buildShareText(
      { kind: 'expense', date: '2026-11-01', amount: 3500, title: '竹圍 海鮮', detail: '媽媽代墊' },
      500,
    )
    expect(text).toBe('公帳 11月1號 竹圍 海鮮 支出3,500元（媽媽代墊）\n餘額 500元')
  })

  it('says the fund is short when the balance is negative', () => {
    const text = buildShareText({ kind: 'expense', date: '2026-11-01', amount: 3500, title: '竹圍 海鮮', detail: '' }, -3500)
    expect(text).toBe('公帳 11月1號 竹圍 海鮮 支出3,500元\n餘額不足 3,500元')
  })

  it('omits the balance line when the balance is unknown', () => {
    const text = buildShareText({ kind: 'income', date: '2026-11-10', amount: 5000, title: '爸爸繳費', detail: '' }, null)
    expect(text).toBe('公帳 11月10號 爸爸繳費 入帳5,000元')
  })
})

describe('lineShareUrl', () => {
  it('encodes the text for the LINE share link', () => {
    expect(lineShareUrl('公帳 500元\n好')).toBe(
      'https://line.me/R/share?text=%E5%85%AC%E5%B8%B3%20500%E5%85%83%0A%E5%A5%BD',
    )
  })
})

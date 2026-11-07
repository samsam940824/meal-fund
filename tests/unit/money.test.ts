import { describe, expect, it } from 'vitest'
import { formatMoney, formatSignedAmount, MAX_AMOUNT, parseAmount } from '@/utils/money'

describe('parseAmount', () => {
  it.each([
    ['5000', 5000],
    ['5,000', 5000],
    [' 1 200 ', 1200],
    [String(MAX_AMOUNT), MAX_AMOUNT],
  ])('parses %s', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })

  it.each(['', '0', '-5', '12.5', 'abc', String(MAX_AMOUNT + 1)])('rejects %s', (input) => {
    expect(parseAmount(input)).toBeNull()
  })
})

describe('formatMoney', () => {
  it('adds thousands separators', () => {
    expect(formatMoney(12350)).toBe('12,350元')
  })
})

describe('formatSignedAmount', () => {
  it.each([
    [5000, '+5,000'],
    [-3500, '−3,500'],
    [0, '0'],
  ])('formats %d', (amount, expected) => {
    expect(formatSignedAmount(amount)).toBe(expected)
  })
})

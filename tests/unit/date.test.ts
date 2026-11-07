import { describe, expect, it } from 'vitest'
import { currentMonth, monthDateRange, shiftMonth, todayKey } from '@/utils/date'

describe('todayKey', () => {
  it('uses Taipei time even when UTC is still the previous day', () => {
    // 2026-11-04 17:30 UTC = 2026-11-05 01:30 Taipei
    expect(todayKey(new Date('2026-11-04T17:30:00Z'))).toBe('2026-11-05')
  })

  it('rolls the month over at Taipei midnight', () => {
    expect(currentMonth(new Date('2026-11-30T16:00:00Z'))).toBe('2026-12')
  })
})

describe('shiftMonth', () => {
  it.each([
    ['2026-11', 1, '2026-12'],
    ['2026-12', 1, '2027-01'],
    ['2026-01', -1, '2025-12'],
    ['2026-03', -14, '2025-01'],
  ])('%s %+d → %s', (month, delta, expected) => {
    expect(shiftMonth(month, delta)).toBe(expected)
  })

  it('rejects malformed months', () => {
    expect(() => shiftMonth('2026-13', 1)).toThrow(RangeError)
  })
})

describe('monthDateRange', () => {
  it('returns a half-open range ending at next month', () => {
    expect(monthDateRange('2026-12')).toEqual({ start: '2026-12-01', endExclusive: '2027-01-01' })
  })
})

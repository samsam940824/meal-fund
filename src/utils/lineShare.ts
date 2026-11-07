import type { DateKey } from '@/types/ledger'
import { formatShareDate } from './date'
import type { EntryText } from './ledgerDisplay'
import { formatMoney } from './money'

const LINE_SHARE_BASE_URL = 'https://line.me/R/share'

export interface ShareEntry extends EntryText {
  kind: 'income' | 'expense'
  date: DateKey
  amount: number
}

export function balanceText(balance: number): string {
  return balance < 0 ? `餘額不足 ${formatMoney(-balance)}` : `餘額 ${formatMoney(balance)}`
}

/**
 * Message in the family's own paper-ledger style, e.g.
 * "公帳 11月1號 竹圍 海鮮 支出3,500元（媽媽代墊）\n餘額 500元".
 * The balance line is omitted when it could not be loaded.
 */
export function buildShareText(entry: ShareEntry, balance: number | null): string {
  const action = entry.kind === 'income' ? '入帳' : '支出'
  const detail = entry.detail ? `（${entry.detail}）` : ''
  const line = `公帳 ${formatShareDate(entry.date)} ${entry.title} ${action}${formatMoney(entry.amount)}${detail}`
  return balance === null ? line : `${line}\n${balanceText(balance)}`
}

/** Opens LINE with the text pre-filled; the user then picks the family group and sends. */
export function lineShareUrl(text: string): string {
  return `${LINE_SHARE_BASE_URL}?text=${encodeURIComponent(text)}`
}

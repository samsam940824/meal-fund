<script setup lang="ts">
import type { PassbookRow } from '@/utils/ledgerDisplay'
import { formatAmount, formatSignedAmount } from '@/utils/money'

defineProps<{ openingBalance: number; rows: PassbookRow[]; monthLabel: string }>()
defineEmits<{ select: [row: PassbookRow] }>()

function shortDate(date: string): string {
  const [, month, day] = date.split('-').map(Number)
  return `${month}/${day}`
}

/** Balances only get a sign when negative, like a bank passbook. */
function balanceText(balance: number): string {
  return balance < 0 ? formatSignedAmount(balance) : formatAmount(balance)
}
</script>

<template>
  <section class="card" aria-labelledby="passbook-title">
    <div class="table-head">
      <h2 id="passbook-title" class="section-title">{{ monthLabel }}收支明細</h2>
      <span class="table-unit">單位：元</span>
    </div>
    <table class="ledger-table">
      <colgroup>
        <col class="col-date" />
        <col />
        <col class="col-num" />
        <col class="col-num" />
      </colgroup>
      <thead>
        <tr><th>日期</th><th>摘要</th><th class="num">金額</th><th class="num">餘額</th></tr>
      </thead>
      <tbody>
        <tr class="opening">
          <td></td>
          <td>上月結餘</td>
          <td></td>
          <td :class="['num', { 'money-out': openingBalance < 0 }]">{{ balanceText(openingBalance) }}</td>
        </tr>
        <tr
          v-for="row in rows"
          :key="`${row.kind}-${row.id}`"
          class="entry"
          tabindex="0"
          role="button"
          @click="$emit('select', row)"
          @keydown.enter="$emit('select', row)"
        >
          <td class="date">{{ shortDate(row.date) }}</td>
          <td class="title">
            {{ row.title }}<span v-if="row.hasOutstandingAdvance" class="tag">代墊</span><span v-if="row.duesMonthTag" class="tag">{{ row.duesMonthTag }}</span>
          </td>
          <td :class="['num', 'amount', row.kind === 'income' ? 'money-in' : 'money-out']">
            {{ formatSignedAmount(row.kind === 'income' ? row.amount : -row.amount) }}
          </td>
          <td :class="['num', { 'money-out': row.balanceAfter < 0 }]">{{ balanceText(row.balanceAfter) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="rows.length === 0" class="note">本月尚無紀錄</p>
    <p v-else class="note">點選任一筆可修改、分享或刪除</p>
  </section>
</template>

<style scoped>
.col-date { width: 2.7em; }
.col-num { width: 4.3em; }
.opening td { color: var(--color-muted); }
.entry { cursor: pointer; }
.entry:active { background: var(--color-selected); }
.date { color: var(--color-muted); }
.title { font-weight: 500; overflow-wrap: anywhere; }
.note { color: var(--color-muted); font-size: 0.8rem; text-align: center; margin: 12px 0 0; }
</style>

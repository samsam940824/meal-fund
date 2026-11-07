<script setup lang="ts">
import type { MonthTotals } from '@/utils/ledgerDisplay'
import { formatAmount, formatSignedAmount } from '@/utils/money'

defineProps<{ bookBalance: number; totals: MonthTotals }>()
</script>

<template>
  <section class="balance" aria-label="公帳餘額">
    <div class="line main">
      <span class="label">
        餘額<span v-if="bookBalance < 0" class="short">不足</span>
      </span>
      <strong :class="['amount', { negative: bookBalance < 0 }]">
        {{ bookBalance < 0 ? formatSignedAmount(bookBalance) : formatAmount(bookBalance) }}<span class="unit">元</span>
      </strong>
    </div>
    <div class="stats">
      <div class="line">
        <span class="label">入帳</span>
        <strong class="money-in">{{ formatAmount(totals.income) }}</strong>
      </div>
      <div class="line">
        <span class="label">支出</span>
        <strong class="money-out">{{ formatAmount(totals.expense) }}</strong>
      </div>
    </div>
  </section>
</template>

<style scoped>
.balance { padding: 6px 2px 0; }
.line { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.label { font-size: 0.8rem; letter-spacing: 4px; color: var(--color-muted); white-space: nowrap; }
.short { margin-left: 4px; padding: 0 6px; border: 1px solid var(--color-expense); color: var(--color-expense); letter-spacing: 1px; font-size: 0.7rem; }
.amount { font-family: var(--font-serif); font-size: 2rem; font-weight: 600; line-height: 1.25; letter-spacing: 1px; font-variant-numeric: tabular-nums; }
.amount.negative { color: var(--color-expense); }
.unit { font-size: 0.85rem; margin-left: 4px; color: var(--color-muted); font-weight: 500; }
.stats { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 4px; padding-top: 6px; border-top: 1px solid var(--color-border); }
.stats strong { font-family: var(--font-serif); font-size: 1.05rem; font-weight: 600; font-variant-numeric: tabular-nums; }
</style>

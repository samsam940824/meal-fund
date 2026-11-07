<script setup lang="ts">
import { computed } from 'vue'
import type { DuesStatusItem } from '@/utils/ledgerCalc'
import { formatAmount, formatSignedAmount } from '@/utils/money'

const props = defineProps<{ items: DuesStatusItem[]; monthLabel: string }>()

const totals = computed(() => ({
  due: props.items.reduce((sum, i) => sum + i.due, 0),
  paid: props.items.reduce((sum, i) => sum + i.paid, 0),
  // Net over members with a fixed amount only; open-amount members have no difference.
  difference: props.items.reduce((sum, i) => sum + (i.difference ?? 0), 0),
}))

function differenceClass(difference: number | null): string {
  if (difference === null || difference === 0) return 'muted'
  return difference > 0 ? 'money-in' : 'money-out'
}
</script>

<template>
  <section class="card" aria-labelledby="dues-title">
    <div class="table-head">
      <h2 id="dues-title" class="section-title">{{ monthLabel }}繳費狀況</h2>
      <span class="table-unit">單位：元</span>
    </div>
    <p v-if="items.length === 0" class="note">尚無成員，請點下方「成員管理」新增</p>
    <table v-else class="ledger-table">
      <colgroup>
        <col />
        <col class="col-num" />
        <col class="col-num" />
        <col class="col-num" />
      </colgroup>
      <thead>
        <tr><th>成員</th><th class="num">應繳</th><th class="num">實繳</th><th class="num">差額</th></tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.member.id">
          <td class="name">{{ item.member.name }}</td>
          <td :class="['num', { muted: item.due === 0 }]">{{ item.due > 0 ? formatAmount(item.due) : '不固定' }}</td>
          <td :class="['num', { muted: item.paid === 0 }]">{{ formatAmount(item.paid) }}</td>
          <td :class="['num', 'diff', differenceClass(item.difference)]">
            {{ item.difference === null ? '—' : formatSignedAmount(item.difference) }}
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td>合計</td>
          <td class="num">{{ formatAmount(totals.due) }}</td>
          <td class="num">{{ formatAmount(totals.paid) }}</td>
          <td :class="['num', 'diff', differenceClass(totals.difference)]">{{ formatSignedAmount(totals.difference) }}</td>
        </tr>
      </tfoot>
    </table>
    <p v-if="items.length > 0" class="note">差額：正數為多繳，負數為未繳足</p>
  </section>
</template>

<style scoped>
.col-num { width: 4.3em; }
.name { font-weight: 700; overflow-wrap: anywhere; }
.muted { color: var(--color-muted); }
.diff { font-weight: 700; }
tfoot td { font-weight: 700; border-bottom: none; border-top: 1px solid var(--color-text); }
.note { color: var(--color-muted); font-size: 0.8rem; margin: 12px 0 0; }
</style>

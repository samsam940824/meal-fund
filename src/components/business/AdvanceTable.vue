<script setup lang="ts">
import type { MemberAdvanceSummary } from '@/utils/ledgerDisplay'
import { formatAmount } from '@/utils/money'

defineProps<{ items: MemberAdvanceSummary[] }>()
</script>

<template>
  <section class="card" aria-labelledby="advance-title">
    <div class="table-head">
      <h2 id="advance-title" class="section-title">未歸還代墊款</h2>
      <span class="table-unit">單位：元</span>
    </div>
    <p v-if="items.length === 0" class="note">目前沒有未歸還的代墊款</p>
    <template v-else>
      <table class="ledger-table">
        <colgroup>
          <col />
          <col class="col-num" />
          <col class="col-num" />
          <col class="col-num" />
        </colgroup>
        <thead>
          <tr><th>代墊人</th><th class="num">代墊</th><th class="num">已還</th><th class="num">未還</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.memberName">
            <td class="name">{{ item.memberName }}</td>
            <td class="num">{{ formatAmount(item.advanced) }}</td>
            <td :class="['num', { muted: item.repaid === 0 }]">{{ formatAmount(item.repaid) }}</td>
            <td class="num owed">{{ formatAmount(item.outstanding) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="note">下一筆入帳時自動歸還，最早的代墊先還</p>
    </template>
  </section>
</template>

<style scoped>
.col-num { width: 4.3em; }
.name { font-weight: 700; overflow-wrap: anywhere; }
.muted { color: var(--color-muted); }
.owed { font-weight: 700; color: var(--color-warn); }
.note { color: var(--color-muted); font-size: 0.8rem; text-align: center; margin: 12px 0 0; }
</style>

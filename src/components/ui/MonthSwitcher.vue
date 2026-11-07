<script setup lang="ts">
import { computed } from 'vue'
import type { MonthKey } from '@/types/ledger'
import { currentMonth, formatMonthLabel, shiftMonth } from '@/utils/date'
import ChevronIcon from './ChevronIcon.vue'

const month = defineModel<MonthKey>({ required: true })
const thisMonth = currentMonth()
const isCurrent = computed(() => month.value === thisMonth)
</script>

<template>
  <div class="switcher">
    <button type="button" class="arrow" aria-label="上個月" @click="month = shiftMonth(month, -1)">
      <ChevronIcon direction="left" />
    </button>
    <div class="label">
      <strong>{{ formatMonthLabel(month) }}</strong>
      <button v-if="!isCurrent" type="button" class="today" @click="month = thisMonth">回到本月</button>
    </div>
    <button type="button" class="arrow" aria-label="下個月" @click="month = shiftMonth(month, 1)">
      <ChevronIcon direction="right" />
    </button>
  </div>
</template>

<style scoped>
.switcher { display: flex; align-items: center; gap: 8px; }
.arrow {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
}
.label { flex: 1; display: flex; flex-direction: column; align-items: center; }
.label strong { font-family: var(--font-serif); font-size: 1.25rem; font-weight: 600; letter-spacing: 2px; }
.today { border: none; background: none; color: var(--color-accent); font-size: 0.8rem; letter-spacing: 2px; padding: 0 8px; cursor: pointer; }
</style>

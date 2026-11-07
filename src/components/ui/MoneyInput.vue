<script setup lang="ts">
import { ref, watch } from 'vue'
import { MAX_AMOUNT, parseAmount } from '@/utils/money'

defineProps<{ inputId: string }>()
const amount = defineModel<number | null>({ required: true })

const QUICK_ADD_AMOUNTS = [100, 500, 1000] as const
const text = ref(amount.value === null ? '' : String(amount.value))

// Keep the text box in sync when the amount is set from outside (e.g. member's default due).
watch(amount, (value) => {
  if (parseAmount(text.value) !== value) text.value = value === null ? '' : String(value)
})

function onInput(event: Event): void {
  const digitsOnly = (event.target as HTMLInputElement).value.replace(/\D/g, '')
  text.value = digitsOnly
  amount.value = parseAmount(digitsOnly)
}

function addQuick(step: number): void {
  amount.value = Math.min((amount.value ?? 0) + step, MAX_AMOUNT)
}
</script>

<template>
  <div class="money-input">
    <div class="input-row">
      <input
        :id="inputId"
        class="text-input amount"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        placeholder="0"
        :value="text"
        @input="onInput"
      />
      <span class="unit" aria-hidden="true">元</span>
    </div>
    <div class="quick">
      <button v-for="step in QUICK_ADD_AMOUNTS" :key="step" type="button" class="btn btn-secondary" @click="addQuick(step)">
        +{{ step }}
      </button>
      <button type="button" class="btn btn-secondary" @click="amount = null">清除</button>
    </div>
  </div>
</template>

<style scoped>
.input-row { display: flex; align-items: center; gap: 10px; }
.unit { font-size: 1.1rem; color: var(--color-muted); }
.amount { font-family: var(--font-serif); font-size: 2rem; font-weight: 600; min-height: 72px; text-align: right; letter-spacing: 1px; }
.quick { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.quick .btn { padding: 0 4px; letter-spacing: 0; font-family: var(--font-serif); }
</style>

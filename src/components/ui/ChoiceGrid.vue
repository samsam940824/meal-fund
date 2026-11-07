<script setup lang="ts">
import type { ChoiceOption } from '@/types/ui'

withDefaults(defineProps<{ options: ChoiceOption[]; columns?: number; label: string }>(), {
  columns: 2,
})
const selected = defineModel<string | null>({ required: true })
</script>

<template>
  <div class="grid" role="radiogroup" :aria-label="label" :style="{ '--columns': columns }">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="selected === option.value"
      :class="['choice', { selected: selected === option.value }]"
      @click="selected = option.value"
    >
      <span class="label">{{ option.label }}</span>
      <span v-if="option.hint" class="hint">{{ option.hint }}</span>
    </button>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(var(--columns), minmax(0, 1fr)); gap: 10px; }
.choice {
  min-height: 64px;
  padding: 8px;
  border-radius: var(--radius);
  border: 1px solid var(--color-line-strong);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
}
.choice.selected {
  border-color: var(--color-text);
  background: var(--color-selected);
  box-shadow: inset 0 0 0 1px var(--color-text);
}
.label { font-weight: 500; font-size: 1.05rem; letter-spacing: 1px; }
.hint { font-size: 0.8rem; color: var(--color-muted); }
</style>

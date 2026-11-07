<script setup lang="ts">
import ChevronIcon from './ChevronIcon.vue'

defineProps<{ title: string }>()
</script>

<template>
  <header class="page-header">
    <RouterLink to="/" class="back" aria-label="回首頁">
      <ChevronIcon direction="left" />
      <span>首頁</span>
    </RouterLink>
    <h1>{{ title }}</h1>
  </header>
</template>

<style scoped>
.page-header {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--color-bg);
  padding: 12px 0;
  margin: -16px 0 20px;
  border-bottom: 1px solid var(--color-text);
}
.back {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 48px;
  padding: 0 12px 0 6px;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: 0.95rem;
  letter-spacing: 1px;
  text-decoration: none;
  flex-shrink: 0;
}
h1 { font-family: var(--font-serif); font-size: 1.3rem; font-weight: 600; letter-spacing: 3px; margin: 0; }
</style>

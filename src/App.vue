<script setup lang="ts">
import { isDemoMode } from '@/api'
import { useFlash } from '@/composables/useFlash'

const { message } = useFlash()
</script>

<template>
  <div v-if="isDemoMode" class="demo-banner">示範模式：這是假資料，重新整理就會還原</div>
  <div v-if="message" class="flash" role="status">{{ message }}</div>
  <RouterView />
</template>

<style scoped>
.demo-banner { background: var(--color-accent-soft); color: var(--color-warn); text-align: center; padding: 6px 12px; font-size: 0.85rem; letter-spacing: 1px; }
.flash {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 528px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  letter-spacing: 1px;
  padding: 14px 16px;
  border-radius: var(--radius);
  border-left: 4px solid var(--color-accent);
  text-align: center;
  z-index: 200;
}
</style>

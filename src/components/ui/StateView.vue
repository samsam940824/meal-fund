<script setup lang="ts">
defineProps<{ isLoading: boolean; error: string | null; hasData: boolean }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div v-if="!hasData && isLoading" class="state" role="status">載入中，請稍候…</div>
  <div v-else-if="!hasData && error" class="state error" role="alert">
    <p>{{ error }}</p>
    <button type="button" class="btn btn-primary" @click="$emit('retry')">再試一次</button>
  </div>
  <template v-else>
    <div v-if="error" class="form-error" role="alert">{{ error }}</div>
    <slot />
  </template>
</template>

<style scoped>
.state { text-align: center; padding: 48px 16px; font-size: 1.15rem; color: var(--color-muted); }
.error p { color: var(--color-danger); font-weight: 700; }
</style>

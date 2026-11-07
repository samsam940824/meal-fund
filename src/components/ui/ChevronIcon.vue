<script setup lang="ts">
withDefaults(defineProps<{ direction?: 'left' | 'right' }>(), { direction: 'right' })
</script>

<template>
  <!-- SVG instead of ◀ ▶, which iOS may render as emoji. -->
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'" />
  </svg>
</template>

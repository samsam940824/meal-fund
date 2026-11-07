<script setup lang="ts">
import { computed } from 'vue'
import { lineShareUrl } from '@/utils/lineShare'

const props = withDefaults(defineProps<{ open: boolean; heading: string; text: string; closeLabel?: string }>(), {
  closeLabel: '關閉',
})
defineEmits<{ close: [] }>()

const shareUrl = computed(() => lineShareUrl(props.text))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="$emit('close')">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="share-heading">
        <h2 id="share-heading" class="heading">{{ heading }}</h2>
        <p class="preview">{{ text }}</p>
        <div class="actions">
          <a class="btn btn-block btn-line" :href="shareUrl" target="_blank" rel="noopener">分享到 LINE</a>
          <slot />
          <button type="button" class="btn btn-secondary btn-block" @click="$emit('close')">{{ closeLabel }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 100;
}
.dialog { background: var(--color-bg); border-top: 3px solid var(--color-text); border-radius: var(--radius); padding: 24px 20px 20px; width: 100%; max-width: 440px; }
.heading { font-family: var(--font-serif); font-size: 1.2rem; font-weight: 600; letter-spacing: 3px; margin: 0 0 12px; }
.preview {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 12px 14px;
  margin: 0 0 20px;
  white-space: pre-line;
  line-height: 1.6;
}
.actions { display: flex; flex-direction: column; gap: 10px; }
/* LINE brand green so the family recognises where the message goes. */
.btn-line { background: #06c755; color: #fff; min-height: 60px; font-size: 1.1rem; }
</style>

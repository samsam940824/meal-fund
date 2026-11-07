<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean
    message: string
    isBusy?: boolean
    error?: string | null
    confirmLabel?: string
    cancelLabel?: string
    tone?: 'primary' | 'danger'
  }>(),
  {
    isBusy: false,
    error: null,
    confirmLabel: '確認',
    cancelLabel: '返回修改',
    tone: 'primary',
  },
)
defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="$emit('cancel')">
      <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-message">
        <p id="confirm-message" class="message">{{ message }}</p>
        <div v-if="error" class="form-error" role="alert">{{ error }}</div>
        <div class="actions">
          <button
            type="button"
            :class="['btn', 'btn-block', tone === 'danger' ? 'btn-danger' : 'btn-primary']"
            :disabled="isBusy"
            @click="$emit('confirm')"
          >
            {{ isBusy ? '處理中…' : confirmLabel }}
          </button>
          <button v-if="cancelLabel" type="button" class="btn btn-secondary btn-block" :disabled="isBusy" @click="$emit('cancel')">
            {{ cancelLabel }}
          </button>
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
.dialog {
  background: var(--color-bg);
  border-top: 3px solid var(--color-text);
  border-radius: var(--radius);
  padding: 24px 20px 20px;
  width: 100%;
  max-width: 440px;
}
.message { font-size: 1.15rem; font-weight: 500; margin: 0 0 20px; line-height: 1.6; white-space: pre-line; }
.actions { display: flex; flex-direction: column; gap: 10px; }
</style>

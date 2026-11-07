import { readonly, ref } from 'vue'

const FLASH_DURATION_MS = 3000

const message = ref<string | null>(null)
let hideTimer: ReturnType<typeof setTimeout> | undefined

/** App-wide success banner, e.g. "記好了" after saving and returning home. */
export function useFlash() {
  function show(text: string): void {
    message.value = text
    clearTimeout(hideTimer)
    hideTimer = setTimeout(() => (message.value = null), FLASH_DURATION_MS)
  }

  return { message: readonly(message), show }
}

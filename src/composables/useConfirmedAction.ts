import { ref } from 'vue'
import { LedgerApiError } from '@/api'

/**
 * Open → confirm → run flow shared by every write action, so each one shows a
 * confirmation first and surfaces failures inside the dialog.
 */
export function useConfirmedAction() {
  const isOpen = ref(false)
  const isBusy = ref(false)
  const error = ref<string | null>(null)

  function open(): void {
    error.value = null
    isOpen.value = true
  }

  function cancel(): void {
    if (!isBusy.value) isOpen.value = false
  }

  /** Runs the action; resolves true on success and closes the dialog. */
  async function run(action: () => Promise<void>): Promise<boolean> {
    isBusy.value = true
    error.value = null
    try {
      await action()
      isOpen.value = false
      return true
    } catch (cause) {
      if (!(cause instanceof LedgerApiError)) throw cause
      error.value = cause.message
      return false
    } finally {
      isBusy.value = false
    }
  }

  return { isOpen, isBusy, error, open, cancel, run }
}

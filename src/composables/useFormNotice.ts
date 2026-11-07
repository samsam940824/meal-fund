import { nextTick, ref } from 'vue'

export interface FormNotice {
  message: string
  /** Element to bring into view once the notice is dismissed. */
  fieldId: string
}

/**
 * Validation problems pop up as a dialog (an inline message near the bottom of a long
 * form is easy to miss on a phone); dismissing it scrolls to and focuses the field to fix.
 */
export function useFormNotice() {
  const notice = ref<FormNotice | null>(null)

  function show(message: string, fieldId: string): void {
    notice.value = { message, fieldId }
  }

  async function dismiss(): Promise<void> {
    const fieldId = notice.value?.fieldId
    notice.value = null
    if (!fieldId) return
    await nextTick()
    const field = document.getElementById(fieldId)
    field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    field?.focus({ preventScroll: true })
  }

  return { notice, show, dismiss }
}

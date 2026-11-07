import { onMounted, ref, shallowRef } from 'vue'
import { LedgerApiError, ledgerApi } from '@/api'
import type { LedgerData } from '@/types/ledger'

/** Loads every member and record once; pages derive what they show with the pure functions in `utils/`. */
export function useLedgerData() {
  const data = shallowRef<LedgerData | null>(null)
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  async function reload(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const [members, contributions, expenses] = await Promise.all([
        ledgerApi.listMembers(),
        ledgerApi.listContributions(),
        ledgerApi.listExpenses(),
      ])
      data.value = { members, contributions, expenses }
    } catch (cause) {
      if (!(cause instanceof LedgerApiError)) throw cause
      error.value = cause.message
    } finally {
      isLoading.value = false
    }
  }

  onMounted(reload)

  return { data, isLoading, error, reload }
}

/** Shown when an edit link points at a record that no longer exists. */
export const RECORD_NOT_FOUND_MESSAGE = '找不到這筆紀錄，可能已經被刪掉了'

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi, isDemoMode, ledgerApi } from '@/api'
import AdvanceTable from '@/components/business/AdvanceTable.vue'
import BalanceCard from '@/components/business/BalanceCard.vue'
import DuesStatusList from '@/components/business/DuesStatusList.vue'
import PassbookList from '@/components/business/PassbookList.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import MonthSwitcher from '@/components/ui/MonthSwitcher.vue'
import ShareDialog from '@/components/ui/ShareDialog.vue'
import StateView from '@/components/ui/StateView.vue'
import { useConfirmedAction } from '@/composables/useConfirmedAction'
import { useFlash } from '@/composables/useFlash'
import { useLedgerData } from '@/composables/useLedgerData'
import { currentMonth, formatShortMonth } from '@/utils/date'
import { buildMonthView, type PassbookRow } from '@/utils/ledgerDisplay'
import { buildShareText } from '@/utils/lineShare'
import { formatMoney } from '@/utils/money'

type HomeTab = 'passbook' | 'dues'
const TABS: { value: HomeTab; label: string }[] = [
  { value: 'passbook', label: '收支明細' },
  { value: 'dues', label: '繳費狀況' },
]

const month = ref(currentMonth())
const tab = ref<HomeTab>('passbook')
const { data, isLoading, error, reload } = useLedgerData()
const flash = useFlash()
const router = useRouter()

const monthLabel = computed(() => formatShortMonth(month.value))
const view = computed(() => (data.value ? buildMonthView(data.value, month.value) : null))
const isFirstUse = computed(
  () => view.value !== null && view.value.rows.length === 0 && view.value.openingBalance === 0 && view.value.bookBalance === 0,
)

const selectedRow = ref<PassbookRow | null>(null)
const selectedShareText = computed(() =>
  selectedRow.value ? buildShareText(selectedRow.value, selectedRow.value.balanceAfter) : '',
)

function editSelected(): void {
  const row = selectedRow.value
  if (!row) return
  void router.push({ path: row.kind === 'income' ? '/income' : '/expense', query: { id: row.id } })
}

const removal = useConfirmedAction()
const removeTarget = ref<PassbookRow | null>(null)
const removeMessage = computed(() =>
  removeTarget.value
    ? `確定刪除這筆紀錄？\n${removeTarget.value.title} ${formatMoney(removeTarget.value.amount)}\n刪除後無法復原，代墊歸還會重新計算`
    : '',
)

function askRemove(): void {
  removeTarget.value = selectedRow.value
  selectedRow.value = null
  removal.open()
}

async function confirmRemove(): Promise<void> {
  const target = removeTarget.value
  if (!target) return
  const ok = await removal.run(() =>
    target.kind === 'income' ? ledgerApi.deleteContribution(target.id) : ledgerApi.deleteExpense(target.id),
  )
  if (!ok) return
  flash.show('已刪除')
  await reload()
}

async function signOut(): Promise<void> {
  await authApi.signOut()
  await router.replace('/login')
}
</script>

<template>
  <main class="page home">
    <header class="top">
      <MonthSwitcher v-model="month" />
      <BalanceCard v-if="view" :book-balance="view.bookBalance" :totals="view.totals" />
    </header>

    <StateView :is-loading="isLoading" :error="error" :has-data="view !== null" @retry="reload">
      <template v-if="view">
        <div v-if="isFirstUse" class="card first-use">
          <strong>開始使用</strong><br />
          請點下方「公費入帳」→ 選「其他收入」，輸入公帳目前已有的金額作為期初餘額。
        </div>
        <PassbookList
          v-if="tab === 'passbook'"
          :opening-balance="view.openingBalance"
          :rows="view.rows"
          :month-label="monthLabel"
          @select="selectedRow = $event"
        />
        <template v-else>
          <DuesStatusList :items="view.dues" :month-label="monthLabel" />
          <AdvanceTable :items="view.advances" />
          <RouterLink to="/members" class="btn btn-secondary btn-block">成員管理</RouterLink>
          <button v-if="!isDemoMode" type="button" class="btn btn-ghost btn-block signout" @click="signOut">登出</button>
        </template>
      </template>
    </StateView>

    <nav class="bottom-bar" aria-label="記帳與切換">
      <div class="bottom-bar-inner">
        <RouterLink to="/income" class="btn btn-primary big">公費入帳</RouterLink>
        <RouterLink to="/expense" class="btn btn-outline big">餐費支出</RouterLink>
      </div>
      <div class="tabs" role="tablist">
        <button
          v-for="item in TABS"
          :key="item.value"
          type="button"
          role="tab"
          :aria-selected="tab === item.value"
          :class="['tab', { active: tab === item.value }]"
          @click="tab = item.value"
        >
          {{ item.label }}
        </button>
      </div>
    </nav>

    <ShareDialog :open="selectedRow !== null" heading="交易明細" :text="selectedShareText" @close="selectedRow = null">
      <div class="row-actions">
        <button type="button" class="btn btn-secondary" @click="editSelected">修改</button>
        <button type="button" class="btn btn-delete" @click="askRemove">刪除</button>
      </div>
    </ShareDialog>

    <ConfirmDialog
      :open="removal.isOpen.value"
      :message="removeMessage"
      :is-busy="removal.isBusy.value"
      :error="removal.error.value"
      tone="danger"
      confirm-label="確定刪除"
      cancel-label="取消"
      @confirm="confirmRemove"
      @cancel="removal.cancel"
    />
  </main>
</template>

<style scoped>
.home { padding-top: 0; padding-bottom: 196px; }
.top {
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--color-bg);
  padding: 10px 0 10px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--color-text);
}
.big { min-height: 58px; font-size: 1.1rem; padding: 0 8px; white-space: nowrap; }
/* Text tabs with a gold underline on the active one. */
.tabs { max-width: 560px; margin: 8px auto 0; display: flex; }
.tab {
  flex: 1;
  min-height: 48px;
  border: none;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  font-size: 1rem;
  letter-spacing: 3px;
  color: var(--color-muted);
  cursor: pointer;
}
.tab.active { color: var(--color-text); font-weight: 500; border-bottom: 2px solid var(--color-accent); }
.first-use { padding: 14px 16px; border-left: 3px solid var(--color-accent); background: var(--color-accent-soft); line-height: 1.7; }
.row-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.btn-delete { background: transparent; color: var(--color-danger); border-color: var(--color-danger); }
.signout { margin-top: 8px; }
</style>

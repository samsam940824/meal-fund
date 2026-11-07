<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ledgerApi } from '@/api'
import ChoiceGrid from '@/components/ui/ChoiceGrid.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import MoneyInput from '@/components/ui/MoneyInput.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import ShareDialog from '@/components/ui/ShareDialog.vue'
import StateView from '@/components/ui/StateView.vue'
import { useConfirmedAction } from '@/composables/useConfirmedAction'
import { useFormNotice } from '@/composables/useFormNotice'
import { RECORD_NOT_FOUND_MESSAGE, useLedgerData } from '@/composables/useLedgerData'
import type { Expense, NewExpense } from '@/types/ledger'
import type { ChoiceOption } from '@/types/ui'
import { formatShareDate, todayKey } from '@/utils/date'
import { computeFundBalance, settleAdvances } from '@/utils/ledgerCalc'
import { changeLines, describeExpense, paymentLabel, recentPlaces } from '@/utils/ledgerDisplay'
import { balanceText, buildShareText } from '@/utils/lineShare'
import { formatMoney } from '@/utils/money'

/** ChoiceGrid needs a string value; this sentinel means "the fund pays" (no full advance). */
const FUND_PAYER = 'fund'
const MAX_QUICK_PLACES = 6

const route = useRoute()
const router = useRouter()
const editId = typeof route.query.id === 'string' ? route.query.id : null
const { data, isLoading, error, reload } = useLedgerData()

const amount = ref<number | null>(null)
const description = ref('')
const payer = ref<string>(FUND_PAYER)
/** Member covering what the fund's cash cannot. */
const shortfallPayer = ref<string | null>(null)
const spentDate = ref(todayKey())
const { notice, show: showNotice, dismiss: dismissNotice } = useFormNotice()

const allMembers = computed(() => data.value?.members ?? [])
const activeMembers = computed(() => allMembers.value.filter((m) => m.active))
const original = computed(() => (editId ? (data.value?.expenses.find((e) => e.id === editId) ?? null) : null))
const loadError = computed(() =>
  error.value ?? (editId && data.value && !original.value ? RECORD_NOT_FOUND_MESSAGE : null),
)
const places = computed(() => (data.value ? recentPlaces(data.value.expenses, MAX_QUICK_PLACES) : []))

watch(
  original,
  (expense: Expense | null) => {
    if (!expense) return
    amount.value = expense.amount
    description.value = expense.description
    spentDate.value = expense.spentDate
    const fullAdvance = expense.advancedBy !== null && expense.advancedAmount >= expense.amount
    payer.value = fullAdvance && expense.advancedBy ? expense.advancedBy : FUND_PAYER
    shortfallPayer.value = fullAdvance ? null : expense.advancedBy
  },
  { once: true },
)

/** Every record except the one being edited, so the meal is judged as if it were new. */
const otherExpenses = computed(() => data.value?.expenses.filter((e) => e.id !== editId) ?? [])
const bookBalanceWithoutThis = computed(() =>
  data.value ? computeFundBalance(data.value.contributions, otherExpenses.value) : 0,
)
/** Cash the fund held on the meal's date, which decides how much someone must advance. */
const cashOnDate = computed(() => {
  if (!data.value) return 0
  const date = spentDate.value
  const settled = settleAdvances(
    data.value.contributions.filter((c) => c.receivedDate <= date),
    otherExpenses.value.filter((e) => e.spentDate <= date),
  )
  return Math.max(settled.cash, 0)
})
const shortfall = computed(() =>
  payer.value === FUND_PAYER && amount.value !== null ? Math.max(amount.value - cashOnDate.value, 0) : 0,
)

const payerOptions = computed<ChoiceOption[]>(() => [
  { value: FUND_PAYER, label: '公費支付', hint: `現金 ${formatMoney(cashOnDate.value)}` },
  ...activeMembers.value.map((m) => ({ value: m.id, label: `${m.name}代墊`, hint: '整筆代墊' })),
])
const memberOptions = computed<ChoiceOption[]>(() => activeMembers.value.map((m) => ({ value: m.id, label: m.name })))

function draft(): NewExpense | null {
  if (amount.value === null) return null
  const base = { amount: amount.value, spentDate: spentDate.value, description: description.value.trim() }
  if (payer.value !== FUND_PAYER) return { ...base, advancedBy: payer.value, advancedAmount: amount.value }
  if (shortfall.value > 0 && shortfallPayer.value) {
    return { ...base, advancedBy: shortfallPayer.value, advancedAmount: shortfall.value }
  }
  return { ...base, advancedBy: null, advancedAmount: 0 }
}

function editChanges(entry: NewExpense, before: Expense): string[] {
  return changeLines([
    { label: '金額', before: formatMoney(before.amount), after: formatMoney(entry.amount) },
    { label: '店家', before: before.description, after: entry.description },
    { label: '付款方式', before: paymentLabel(before, allMembers.value), after: paymentLabel(entry, allMembers.value) },
    { label: '日期', before: formatShareDate(before.spentDate), after: formatShareDate(entry.spentDate) },
  ])
}

const save = useConfirmedAction()
const confirmMessage = computed(() => {
  const entry = draft()
  if (!entry) return ''
  const balanceAfter = bookBalanceWithoutThis.value - entry.amount
  const before = original.value
  if (before) return `確認修改？\n${editChanges(entry, before).join('\n')}\n修改後${balanceText(balanceAfter)}`
  return `確認支出？\n${entry.description}　${formatMoney(entry.amount)}\n${paymentLabel(entry, allMembers.value)}\n支出後${balanceText(balanceAfter)}`
})

function submit(): void {
  const entry = draft()
  const before = original.value
  if (!entry) showNotice('請輸入金額', 'expense-amount')
  else if (!entry.description) showNotice('請填寫店家', 'expense-description')
  else if (shortfall.value > 0 && !shortfallPayer.value) {
    showNotice(
      `公費現金只有 ${formatMoney(cashOnDate.value)}，還差 ${formatMoney(shortfall.value)}。\n請在「付款方式」下方選擇由誰代墊。`,
      'expense-shortfall',
    )
  } else if (!entry.spentDate) showNotice('請選擇支出日期', 'expense-date')
  else if (before && editChanges(entry, before).length === 0) showNotice('沒有修改任何內容', 'expense-amount')
  else save.open()
}

const shareText = ref<string | null>(null)

async function confirmSave(): Promise<void> {
  const entry = draft()
  if (!entry) return
  const before = original.value
  const ok = await save.run(() => (before ? ledgerApi.updateExpense(before.id, entry) : ledgerApi.addExpense(entry)))
  if (!ok) return
  shareText.value = buildShareText(
    { kind: 'expense', date: entry.spentDate, amount: entry.amount, ...describeExpense(entry, allMembers.value) },
    bookBalanceWithoutThis.value - entry.amount,
  )
}
</script>

<template>
  <main class="page">
    <PageHeader :title="editId ? '修改支出' : '餐費支出'" />
    <StateView :is-loading="isLoading" :error="loadError" :has-data="data !== null && !loadError" @retry="reload">
      <form @submit.prevent="submit">
        <div class="field">
          <label class="field-label" for="expense-amount">金額</label>
          <MoneyInput v-model="amount" input-id="expense-amount" />
        </div>
        <div class="field">
          <label class="field-label" for="expense-description">店家</label>
          <input
            id="expense-description"
            v-model="description"
            class="text-input"
            type="text"
            maxlength="100"
            placeholder="例如：竹圍 海鮮"
          />
          <template v-if="places.length > 0">
            <p class="chips-label">最近店家</p>
            <div class="chips">
              <button v-for="place in places" :key="place" type="button" class="btn btn-secondary chip" @click="description = place">
                {{ place }}
              </button>
            </div>
          </template>
        </div>
        <div class="field">
          <span class="field-label">付款方式</span>
          <ChoiceGrid v-model="payer" :options="payerOptions" label="付款方式" />
          <div v-if="shortfall > 0" id="expense-shortfall" class="shortfall" tabindex="-1">
            <p>公費現金 {{ formatMoney(cashOnDate) }}，不足 <strong>{{ formatMoney(shortfall) }}</strong>，請選擇代墊人：</p>
            <ChoiceGrid v-model="shortfallPayer" :options="memberOptions" label="代墊人" />
            <p class="shortfall-note">下一筆入帳時會自動歸還</p>
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="expense-date">支出日期</label>
          <input id="expense-date" v-model="spentDate" class="text-input" type="date" />
        </div>
        <div class="bottom-bar">
          <div class="bottom-bar-inner">
            <button type="submit" class="btn btn-primary big">{{ editId ? '儲存修改' : '確認支出' }}</button>
          </div>
        </div>
      </form>
    </StateView>

    <ConfirmDialog
      :open="save.isOpen.value"
      :message="confirmMessage"
      :is-busy="save.isBusy.value"
      :error="save.error.value"
      @confirm="confirmSave"
      @cancel="save.cancel"
    />
    <ConfirmDialog
      :open="notice !== null"
      :message="notice?.message ?? ''"
      confirm-label="知道了"
      cancel-label=""
      @confirm="dismissNotice"
      @cancel="dismissNotice"
    />
    <ShareDialog :open="shareText !== null" :heading="editId ? '已修改' : '已記錄支出'" :text="shareText ?? ''" close-label="回首頁" @close="router.push('/')" />
  </main>
</template>

<style scoped>
.big { min-height: 64px; font-size: 1.15rem; }
.chips-label { margin: 10px 0 6px; color: var(--color-muted); font-size: 0.9rem; }
.chips { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.chip { min-height: 48px; padding: 0 8px; font-weight: 400; overflow-wrap: anywhere; }
.shortfall {
  margin-top: 12px;
  padding: 12px;
  border-left: 3px solid var(--color-accent);
  border-radius: var(--radius);
  background: var(--color-accent-soft);
}
.shortfall p { margin: 0 0 10px; }
.shortfall strong { color: var(--color-expense); }
.shortfall .shortfall-note { margin: 10px 0 0; color: var(--color-muted); font-size: 0.85rem; }
</style>

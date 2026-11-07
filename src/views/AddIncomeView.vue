<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ledgerApi } from '@/api'
import ChoiceGrid from '@/components/ui/ChoiceGrid.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import MoneyInput from '@/components/ui/MoneyInput.vue'
import MonthSwitcher from '@/components/ui/MonthSwitcher.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import ShareDialog from '@/components/ui/ShareDialog.vue'
import StateView from '@/components/ui/StateView.vue'
import { useConfirmedAction } from '@/composables/useConfirmedAction'
import { useFormNotice } from '@/composables/useFormNotice'
import { RECORD_NOT_FOUND_MESSAGE, useLedgerData } from '@/composables/useLedgerData'
import type { Contribution, NewContribution } from '@/types/ledger'
import type { ChoiceOption } from '@/types/ui'
import { currentMonth, formatShareDate, formatShortMonth, monthOf, todayKey } from '@/utils/date'
import { computeFundBalance, settleAdvances } from '@/utils/ledgerCalc'
import { changeLines, describeContribution, repaymentText } from '@/utils/ledgerDisplay'
import { balanceText, buildShareText } from '@/utils/lineShare'
import { formatMoney } from '@/utils/money'

/** ChoiceGrid needs a string value; this sentinel means "not a member's dues" (memberId = null). */
const OTHER_SOURCE = 'other'
/** Stand-in id for the income being entered, to preview which advances it will pay back. */
const DRAFT_ID = 'draft'

const route = useRoute()
const router = useRouter()
const editId = typeof route.query.id === 'string' ? route.query.id : null
const { data, isLoading, error, reload } = useLedgerData()
const entryTime = new Date().toISOString()

const source = ref<string | null>(null)
const amount = ref<number | null>(null)
const forMonth = ref(currentMonth())
const receivedDate = ref(todayKey())
const description = ref('')
// The dues month follows the received date unless someone deliberately picks another month
// (paying early or late); otherwise back-dating a payment silently counted it toward this month.
const monthFollowsDate = ref(true)
const { notice, show: showNotice, dismiss: dismissNotice } = useFormNotice()

const allMembers = computed(() => data.value?.members ?? [])
const activeMembers = computed(() => allMembers.value.filter((m) => m.active))
const original = computed(() => (editId ? (data.value?.contributions.find((c) => c.id === editId) ?? null) : null))
const loadError = computed(() =>
  error.value ?? (editId && data.value && !original.value ? RECORD_NOT_FOUND_MESSAGE : null),
)

watch(
  original,
  (c: Contribution | null) => {
    if (!c) return
    source.value = c.memberId ?? OTHER_SOURCE
    amount.value = c.amount
    forMonth.value = c.forMonth ?? monthOf(c.receivedDate)
    receivedDate.value = c.receivedDate
    description.value = c.description
    monthFollowsDate.value = forMonth.value === monthOf(c.receivedDate)
  },
  { once: true },
)

watch(receivedDate, (date) => {
  if (monthFollowsDate.value && date) forMonth.value = monthOf(date)
})

function selectForMonth(month: string): void {
  forMonth.value = month
  monthFollowsDate.value = month === monthOf(receivedDate.value)
}

const sourceOptions = computed<ChoiceOption[]>(() => [
  ...activeMembers.value.map((m) => ({ value: m.id, label: m.name })),
  { value: OTHER_SOURCE, label: '其他收入', hint: '期初餘額、退款' },
])
const isOther = computed(() => source.value === OTHER_SOURCE)
const selectedMember = computed(() => activeMembers.value.find((m) => m.id === source.value) ?? null)

function selectSource(value: string | null): void {
  source.value = value
  const due = activeMembers.value.find((m) => m.id === value)?.monthlyDue
  // When editing, keep the saved amount instead of jumping to the default.
  if (due && !editId) amount.value = due
}

function draft(): NewContribution | null {
  if (amount.value === null) return null
  const member = selectedMember.value
  return {
    memberId: member?.id ?? null,
    amount: amount.value,
    receivedDate: receivedDate.value,
    forMonth: member ? forMonth.value : null,
    description: description.value.trim(),
  }
}

const otherContributions = computed(() => data.value?.contributions.filter((c) => c.id !== editId) ?? [])
const bookBalanceWithoutThis = computed(() =>
  data.value ? computeFundBalance(otherContributions.value, data.value.expenses) : 0,
)

/** Advances this income will pay back once saved, settled exactly as the ledger will be. */
function previewRepayments(entry: NewContribution) {
  if (!data.value) return []
  const asSaved = { ...entry, id: DRAFT_ID, createdAt: original.value?.createdAt ?? entryTime }
  return settleAdvances([...otherContributions.value, asSaved], data.value.expenses).repayments.filter(
    (r) => r.contributionId === DRAFT_ID,
  )
}

function sourceLabel(memberId: string | null): string {
  return memberId === null ? '其他收入' : (allMembers.value.find((m) => m.id === memberId)?.name ?? '')
}

function editChanges(entry: NewContribution, before: Contribution): string[] {
  const monthLabel = (month: string | null) => (month ? formatShortMonth(month) : '—')
  return changeLines([
    { label: '繳款人', before: sourceLabel(before.memberId), after: sourceLabel(entry.memberId) },
    { label: '金額', before: formatMoney(before.amount), after: formatMoney(entry.amount) },
    { label: '所屬月份', before: monthLabel(before.forMonth), after: monthLabel(entry.forMonth) },
    { label: '日期', before: formatShareDate(before.receivedDate), after: formatShareDate(entry.receivedDate) },
    { label: '備註', before: before.description || '（無）', after: entry.description || '（無）' },
  ])
}

const save = useConfirmedAction()
const confirmMessage = computed(() => {
  const entry = draft()
  if (!entry) return ''
  const balanceAfter = bookBalanceWithoutThis.value + entry.amount
  const repayments = previewRepayments(entry)
  const repayLine = repayments.length > 0 ? `\n將自動${repaymentText(repayments, allMembers.value)}` : ''
  const before = original.value
  if (before) return `確認修改？\n${editChanges(entry, before).join('\n')}${repayLine}\n修改後${balanceText(balanceAfter)}`
  const what = selectedMember.value ? `${selectedMember.value.name}繳交${formatShortMonth(forMonth.value)}公費` : entry.description
  return `確認入帳？\n${what}　${formatMoney(entry.amount)}${repayLine}\n入帳後${balanceText(balanceAfter)}`
})

function submit(): void {
  const entry = draft()
  const before = original.value
  if (!source.value) showNotice('請選擇繳款人', 'income-source')
  else if (!entry) showNotice('請輸入金額', 'income-amount')
  else if (isOther.value && !entry.description) showNotice('請填寫收入說明', 'income-description')
  else if (!entry.receivedDate) showNotice('請選擇入帳日期', 'income-date')
  else if (before && editChanges(entry, before).length === 0) showNotice('沒有修改任何內容', 'income-amount')
  else save.open()
}

const shareText = ref<string | null>(null)

async function confirmSave(): Promise<void> {
  const entry = draft()
  if (!entry) return
  const before = original.value
  const repayments = previewRepayments(entry)
  const ok = await save.run(() =>
    before ? ledgerApi.updateContribution(before.id, entry) : ledgerApi.addContribution(entry),
  )
  if (!ok) return
  shareText.value = buildShareText(
    { kind: 'income', date: entry.receivedDate, amount: entry.amount, ...describeContribution(entry, allMembers.value, repayments) },
    bookBalanceWithoutThis.value + entry.amount,
  )
}
</script>

<template>
  <main class="page">
    <PageHeader :title="editId ? '修改入帳' : '公費入帳'" />
    <StateView :is-loading="isLoading" :error="loadError" :has-data="data !== null && !loadError" @retry="reload">
      <form @submit.prevent="submit">
        <div id="income-source" class="field" tabindex="-1">
          <span class="field-label">繳款人</span>
          <ChoiceGrid :model-value="source" :options="sourceOptions" label="繳款人" @update:model-value="selectSource" />
        </div>
        <div class="field">
          <label class="field-label" for="income-amount">金額</label>
          <MoneyInput v-model="amount" input-id="income-amount" />
        </div>
        <div v-if="isOther" class="field">
          <label class="field-label" for="income-description">收入說明</label>
          <input id="income-description" v-model="description" class="text-input" type="text" maxlength="100" placeholder="例如：期初餘額" />
        </div>
        <div class="field">
          <label class="field-label" for="income-date">入帳日期</label>
          <input id="income-date" v-model="receivedDate" class="text-input" type="date" />
        </div>
        <div v-if="!isOther" class="field">
          <span class="field-label">所屬月份</span>
          <MonthSwitcher :model-value="forMonth" @update:model-value="selectForMonth" />
        </div>
        <div v-if="!isOther" class="field">
          <label class="field-label" for="income-note">備註（選填）</label>
          <input id="income-note" v-model="description" class="text-input" type="text" maxlength="100" />
        </div>
        <div class="bottom-bar">
          <div class="bottom-bar-inner">
            <button type="submit" class="btn btn-primary big">{{ editId ? '儲存修改' : '確認入帳' }}</button>
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
    <ShareDialog :open="shareText !== null" :heading="editId ? '已修改' : '已入帳'" :text="shareText ?? ''" close-label="回首頁" @close="router.push('/')" />
  </main>
</template>

<style scoped>
.big { min-height: 64px; font-size: 1.15rem; }
</style>

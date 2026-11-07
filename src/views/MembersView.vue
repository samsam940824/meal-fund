<script setup lang="ts">
import { computed, ref } from 'vue'
import { ledgerApi } from '@/api'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import MoneyInput from '@/components/ui/MoneyInput.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import StateView from '@/components/ui/StateView.vue'
import { useConfirmedAction } from '@/composables/useConfirmedAction'
import { useFormNotice } from '@/composables/useFormNotice'
import { useLedgerData } from '@/composables/useLedgerData'
import { useFlash } from '@/composables/useFlash'
import type { Member, MemberInput } from '@/types/ledger'
import { formatMoney } from '@/utils/money'

/** Matches the `members.name` length check in schema.sql. */
const MAX_NAME_LENGTH = 20

const { data, isLoading, error, reload } = useLedgerData()
const members = computed(() => data.value?.members.filter((m) => m.active) ?? [])
const flash = useFlash()

/** `undefined` = showing the list; `null` = adding a new member; otherwise the member being edited. */
const editing = ref<Member | null | undefined>(undefined)
const name = ref('')
const monthlyDue = ref<number | null>(null)
const { notice, show: showNotice, dismiss: dismissNotice } = useFormNotice()

function dueLabel(due: number): string {
  return due > 0 ? `每月應繳 ${formatMoney(due)}` : '應繳金額不固定'
}

function startEdit(member: Member | null): void {
  editing.value = member
  name.value = member?.name ?? ''
  monthlyDue.value = member && member.monthlyDue > 0 ? member.monthlyDue : null
}

function draft(): MemberInput {
  return { name: name.value.trim(), monthlyDue: monthlyDue.value ?? 0 }
}

const save = useConfirmedAction()
const confirmMessage = computed(() => {
  const entry = draft()
  const before = editing.value
  const what = before ? `確認修改？\n${before.name} → ${entry.name}` : `確認新增成員？\n${entry.name}`
  return `${what}\n${dueLabel(entry.monthlyDue)}`
})

function submit(): void {
  const entry = draft()
  const selfId = editing.value?.id
  if (!entry.name) showNotice('請輸入名稱', 'member-name')
  else if (members.value.some((m) => m.id !== selfId && m.name === entry.name)) showNotice('已有相同名稱的成員', 'member-name')
  else save.open()
}

async function confirmSave(): Promise<void> {
  const entry = draft()
  const target = editing.value
  const ok = await save.run(() => (target ? ledgerApi.updateMember(target.id, entry) : ledgerApi.addMember(entry)))
  if (!ok) return
  flash.show(target ? '已修改成員' : `已新增成員：${entry.name}`)
  editing.value = undefined
  await reload()
}
</script>

<template>
  <main class="page">
    <PageHeader title="成員管理" />
    <StateView :is-loading="isLoading" :error="error" :has-data="data !== null" @retry="reload">
      <form v-if="editing !== undefined" @submit.prevent="submit">
        <h2 class="section-title">{{ editing ? `修改成員：${editing.name}` : '新增成員' }}</h2>
        <div class="field">
          <label class="field-label" for="member-name">名稱</label>
          <input id="member-name" v-model="name" class="text-input" type="text" :maxlength="MAX_NAME_LENGTH" placeholder="例如：姐姐" />
        </div>
        <div class="field">
          <label class="field-label" for="member-due">每月應繳金額</label>
          <p class="note">金額不固定請留空，繳費狀況將不計算差額</p>
          <MoneyInput v-model="monthlyDue" input-id="member-due" />
        </div>
        <div class="bottom-bar">
          <div class="bottom-bar-inner">
            <button type="button" class="btn btn-secondary big" @click="editing = undefined">取消</button>
            <button type="submit" class="btn btn-primary big">儲存</button>
          </div>
        </div>
      </form>

      <template v-else>
        <section class="card">
          <p v-if="members.length === 0" class="empty">尚無成員，請點下方新增</p>
          <ul v-else class="list">
            <li v-for="member in members" :key="member.id" class="row">
              <div class="info">
                <strong>{{ member.name }}</strong>
                <span class="due">{{ dueLabel(member.monthlyDue) }}</span>
              </div>
              <button type="button" class="btn btn-secondary" @click="startEdit(member)">修改</button>
            </li>
          </ul>
        </section>
        <div class="bottom-bar">
          <div class="bottom-bar-inner">
            <button type="button" class="btn btn-primary big" @click="startEdit(null)">新增成員</button>
          </div>
        </div>
      </template>
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
  </main>
</template>

<style scoped>
.big { min-height: 64px; font-size: 1.15rem; }
.note { margin: -4px 0 10px; color: var(--color-muted); font-size: 0.9rem; }
.list { list-style: none; margin: 0; padding: 0; }
.list { border-top: 1px solid var(--color-text); }
.row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--color-border); }
.info { display: flex; flex-direction: column; min-width: 0; }
.info strong { font-weight: 500; font-size: 1.05rem; }
.due { color: var(--color-muted); font-size: 0.9rem; }
.row .btn { flex-shrink: 0; min-height: 48px; padding: 0 18px; }
.empty { color: var(--color-muted); text-align: center; margin: 8px 0; }
</style>

import { createClient, type PostgrestError } from '@supabase/supabase-js'
import type { Contribution, Expense, Member, NewExpense } from '@/types/ledger'
import { LedgerApiError, type AuthApi, type Backend, type LedgerApi } from './ledgerApi'

interface MemberRow {
  id: string
  name: string
  monthly_due: number
  active: boolean
}
interface ContributionRow {
  id: string
  member_id: string | null
  amount: number
  received_date: string
  for_month: string | null
  description: string
  created_at: string
}
interface ExpenseRow {
  id: string
  amount: number
  spent_date: string
  description: string
  advanced_by: string | null
  advanced_amount: number
  created_at: string
}

const MEMBER_COLUMNS = 'id,name,monthly_due,active'
const CONTRIBUTION_COLUMNS = 'id,member_id,amount,received_date,for_month,description,created_at'
const EXPENSE_COLUMNS = 'id,amount,spent_date,description,advanced_by,advanced_amount,created_at'
const NETWORK_ERROR_MESSAGE = '連不上資料庫，請確認網路後再試一次'
const INVALID_LOGIN_STATUS = 400

function unwrap<T>(data: T | null, error: PostgrestError | null): T {
  if (error) throw new LedgerApiError(`${NETWORK_ERROR_MESSAGE}（${error.message}）`)
  if (data === null) throw new LedgerApiError(NETWORK_ERROR_MESSAGE)
  return data
}

function ensureOk(error: PostgrestError | null): void {
  if (error) throw new LedgerApiError(`${NETWORK_ERROR_MESSAGE}（${error.message}）`)
}

const toMember = (r: MemberRow): Member => ({
  id: r.id,
  name: r.name,
  monthlyDue: r.monthly_due,
  active: r.active,
})
const toContribution = (r: ContributionRow): Contribution => ({
  id: r.id,
  memberId: r.member_id,
  amount: r.amount,
  receivedDate: r.received_date,
  forMonth: r.for_month,
  description: r.description,
  createdAt: r.created_at,
})
const toExpense = (r: ExpenseRow): Expense => ({
  id: r.id,
  amount: r.amount,
  spentDate: r.spent_date,
  description: r.description,
  advancedBy: r.advanced_by,
  advancedAmount: r.advanced_amount,
  createdAt: r.created_at,
})

const toExpenseRow = (e: NewExpense) => ({
  amount: e.amount,
  spent_date: e.spentDate,
  description: e.description,
  advanced_by: e.advancedBy,
  advanced_amount: e.advancedAmount,
})

export interface SupabaseConfig {
  url: string
  anonKey: string
}

export function createSupabaseBackend(config: SupabaseConfig): Backend {
  const client = createClient(config.url, config.anonKey)

  const ledgerApi: LedgerApi = {
    async listMembers() {
      const { data, error } = await client
        .from('meal_members')
        .select(MEMBER_COLUMNS)
        .order('sort_order')
        .overrideTypes<MemberRow[], { merge: false }>()
      return unwrap(data, error).map(toMember)
    },
    async addMember(input) {
      const { error } = await client.from('meal_members').insert({ name: input.name, monthly_due: input.monthlyDue })
      ensureOk(error)
    },
    async updateMember(id, input) {
      const { error } = await client.from('meal_members').update({ name: input.name, monthly_due: input.monthlyDue }).eq('id', id)
      ensureOk(error)
    },
    async listContributions() {
      const { data, error } = await client
        .from('meal_contributions')
        .select(CONTRIBUTION_COLUMNS)
        .overrideTypes<ContributionRow[], { merge: false }>()
      return unwrap(data, error).map(toContribution)
    },
    async listExpenses() {
      const { data, error } = await client
        .from('meal_expenses')
        .select(EXPENSE_COLUMNS)
        .overrideTypes<ExpenseRow[], { merge: false }>()
      return unwrap(data, error).map(toExpense)
    },
    async addContribution(input) {
      const { error } = await client.from('meal_contributions').insert({
        member_id: input.memberId,
        amount: input.amount,
        received_date: input.receivedDate,
        for_month: input.forMonth,
        description: input.description,
      })
      ensureOk(error)
    },
    async addExpense(input) {
      const { error } = await client.from('meal_expenses').insert(toExpenseRow(input))
      ensureOk(error)
    },
    async updateContribution(id, input) {
      const { error } = await client
        .from('meal_contributions')
        .update({
          member_id: input.memberId,
          amount: input.amount,
          received_date: input.receivedDate,
          for_month: input.forMonth,
          description: input.description,
        })
        .eq('id', id)
      ensureOk(error)
    },
    async updateExpense(id, input) {
      const { error } = await client.from('meal_expenses').update(toExpenseRow(input)).eq('id', id)
      ensureOk(error)
    },
    async deleteContribution(id) {
      const { error } = await client.from('meal_contributions').delete().eq('id', id)
      ensureOk(error)
    },
    async deleteExpense(id) {
      const { error } = await client.from('meal_expenses').delete().eq('id', id)
      ensureOk(error)
    },
  }

  const authApi: AuthApi = {
    async isSignedIn() {
      const { data } = await client.auth.getSession()
      return data.session !== null
    },
    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (!error) return
      throw new LedgerApiError(
        error.status === INVALID_LOGIN_STATUS ? '帳號或密碼不對，請再試一次' : NETWORK_ERROR_MESSAGE,
      )
    },
    async signOut() {
      // Local scope only clears this device's session, so signing out works even offline.
      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error) throw new LedgerApiError(NETWORK_ERROR_MESSAGE)
    },
  }

  return { ledgerApi, authApi }
}

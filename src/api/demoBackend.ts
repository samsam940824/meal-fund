import type { Contribution, DateKey, Expense, Member } from '@/types/ledger'
import { currentMonth, shiftMonth } from '@/utils/date'
import type { Backend, LedgerApi } from './ledgerApi'

/** Simulated latency so loading states are visible while previewing. */
const DEMO_DELAY_MS = 250

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, DEMO_DELAY_MS))

function seedData() {
  const thisMonth = currentMonth()
  const lastMonth = shiftMonth(thisMonth, -1)
  let sequence = 0
  // Seed rows get increasing timestamps so same-day records keep their listed order.
  const stamp = (date: DateKey) => `${date}T00:00:${String(sequence++).padStart(2, '0')}.000Z`

  const members: Member[] = [
    { id: 'm-dad', name: '爸爸', monthlyDue: 5000, active: true },
    { id: 'm-mom', name: '媽媽', monthlyDue: 5000, active: true },
    { id: 'm-sister', name: '姐姐', monthlyDue: 3000, active: true },
    { id: 'm-brother', name: '弟弟', monthlyDue: 3000, active: true },
  ]
  const income = (id: string, memberId: string | null, amount: number, date: DateKey, description = ''): Contribution => ({
    id,
    memberId,
    amount,
    receivedDate: date,
    forMonth: memberId ? date.slice(0, 7) : null,
    description,
    createdAt: stamp(date),
  })
  const spend = (id: string, amount: number, date: DateKey, description: string, advancedBy: string | null = null): Expense => ({
    id,
    amount,
    spentDate: date,
    description,
    advancedBy,
    advancedAmount: advancedBy ? amount : 0,
    createdAt: stamp(date),
  })

  const contributions: Contribution[] = [
    income('i1', null, 4000, `${lastMonth}-20`, '原本公帳的錢'),
    income('i2', 'm-dad', 5000, `${thisMonth}-03`),
    income('i3', 'm-mom', 5000, `${thisMonth}-03`),
    income('i4', 'm-sister', 1000, `${thisMonth}-05`),
  ]
  // 竹圍 海鮮 was put on 媽媽's card and is paid back automatically by 爸爸's dues on the 3rd;
  // 鼎泰豐 was advanced by 爸爸 and is still waiting for the next income.
  const expenses: Expense[] = [
    spend('e1', 1200, `${lastMonth}-28`, '巷口 熱炒'),
    spend('e2', 3500, `${thisMonth}-01`, '竹圍 海鮮', 'm-mom'),
    spend('e3', 2380, `${thisMonth}-04`, '欣葉 聚餐'),
    spend('e4', 1200, `${thisMonth}-06`, '鼎泰豐', 'm-dad'),
  ]
  return { members, contributions, expenses }
}

/** In-memory backend used when Supabase is not configured. Data resets on page reload. */
export function createDemoBackend(): Backend {
  const store = seedData()
  const now = () => new Date().toISOString()
  // Not crypto.randomUUID(): it only exists on HTTPS/localhost, and the demo is also opened over plain HTTP.
  let lastId = 0
  const newId = () => `demo-${++lastId}`

  const ledgerApi: LedgerApi = {
    async listMembers() {
      await wait()
      return [...store.members]
    },
    async addMember(input) {
      await wait()
      store.members.push({ ...input, id: newId(), active: true })
    },
    async updateMember(id, input) {
      await wait()
      store.members = store.members.map((m) => (m.id === id ? { ...m, ...input } : m))
    },
    async listContributions() {
      await wait()
      return [...store.contributions]
    },
    async listExpenses() {
      await wait()
      return [...store.expenses]
    },
    async addContribution(input) {
      await wait()
      store.contributions.push({ ...input, id: newId(), createdAt: now() })
    },
    async addExpense(input) {
      await wait()
      store.expenses.push({ ...input, id: newId(), createdAt: now() })
    },
    async updateContribution(id, input) {
      await wait()
      store.contributions = store.contributions.map((c) => (c.id === id ? { ...c, ...input } : c))
    },
    async updateExpense(id, input) {
      await wait()
      store.expenses = store.expenses.map((e) => (e.id === id ? { ...e, ...input } : e))
    },
    async deleteContribution(id) {
      await wait()
      store.contributions = store.contributions.filter((c) => c.id !== id)
    },
    async deleteExpense(id) {
      await wait()
      store.expenses = store.expenses.filter((e) => e.id !== id)
    },
  }

  return {
    ledgerApi,
    authApi: {
      isSignedIn: async () => true,
      signIn: async () => undefined,
      signOut: async () => undefined,
    },
  }
}

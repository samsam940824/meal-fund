import type { Contribution, Expense, Member, MemberInput, NewContribution, NewExpense } from '@/types/ledger'

/** Error with a message that is safe and friendly to show to the family. */
export class LedgerApiError extends Error {
  override name = 'LedgerApiError'
}

export interface LedgerApi {
  listMembers(): Promise<Member[]>
  addMember(input: MemberInput): Promise<void>
  updateMember(id: string, input: MemberInput): Promise<void>
  /** All income records; a family fund stays small enough to load whole. */
  listContributions(): Promise<Contribution[]>
  /** All expense records. */
  listExpenses(): Promise<Expense[]>
  addContribution(input: NewContribution): Promise<void>
  addExpense(input: NewExpense): Promise<void>
  updateContribution(id: string, input: NewContribution): Promise<void>
  updateExpense(id: string, input: NewExpense): Promise<void>
  deleteContribution(id: string): Promise<void>
  deleteExpense(id: string): Promise<void>
}

export interface AuthApi {
  isSignedIn(): Promise<boolean>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
}

export interface Backend {
  ledgerApi: LedgerApi
  authApi: AuthApi
}

import { createDemoBackend } from './demoBackend'
import { createSupabaseBackend } from './supabaseBackend'

const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: anonKey } = import.meta.env

const supabaseConfig = url && anonKey ? { url, anonKey } : null

/** Without Supabase settings the app runs on in-memory sample data for previewing. */
export const isDemoMode = supabaseConfig === null

export const { ledgerApi, authApi } = supabaseConfig
  ? createSupabaseBackend(supabaseConfig)
  : createDemoBackend()

export { LedgerApiError } from './ledgerApi'

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi, LedgerApiError } from '@/api'

const router = useRouter()
const email = ref('')
const password = ref('')
const isBusy = ref(false)
const error = ref<string | null>(null)

async function submit(): Promise<void> {
  if (!email.value.trim()) {
    error.value = '請輸入帳號'
    return
  }
  if (!password.value) {
    error.value = '請輸入密碼'
    return
  }
  isBusy.value = true
  error.value = null
  try {
    await authApi.signIn(email.value.trim(), password.value)
    await router.replace('/')
  } catch (cause) {
    if (!(cause instanceof LedgerApiError)) throw cause
    error.value = cause.message
  } finally {
    isBusy.value = false
  }
}
</script>

<template>
  <main class="page login">
    <div class="card">
      <h1>家庭公費</h1>
      <p class="hint">輸入家裡的帳號和密碼，之後這台手機會記住，不用每次輸入。</p>
      <form @submit.prevent="submit">
        <div class="field">
          <label class="field-label" for="email">帳號</label>
          <input
            id="email"
            v-model="email"
            class="text-input"
            type="email"
            inputmode="email"
            autocomplete="username"
            autocapitalize="off"
            spellcheck="false"
          />
        </div>
        <div class="field">
          <label class="field-label" for="password">密碼</label>
          <input id="password" v-model="password" class="text-input" type="password" autocomplete="current-password" />
        </div>
        <div v-if="error" class="form-error" role="alert">{{ error }}</div>
        <button type="submit" class="btn btn-primary btn-block big" :disabled="isBusy">
          {{ isBusy ? '登入中…' : '進入' }}
        </button>
      </form>
    </div>
  </main>
</template>

<style scoped>
.login { padding-top: 48px; }
h1 { margin: 0 0 8px; font-family: var(--font-serif); font-size: 1.6rem; font-weight: 600; letter-spacing: 6px; text-align: center; }
.hint { color: var(--color-muted); margin: 0 0 24px; }
.big { min-height: 68px; font-size: 1.2rem; }
</style>

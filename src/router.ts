import { createRouter, createWebHashHistory } from 'vue-router'
import { authApi } from '@/api'
import HomeView from '@/views/HomeView.vue'

const LOGIN_ROUTE = 'login'

export const router = createRouter({
  // Hash history: GitHub Pages has no SPA fallback, so deep links must not hit the server.
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/income', name: 'income', component: () => import('@/views/AddIncomeView.vue') },
    { path: '/expense', name: 'expense', component: () => import('@/views/AddExpenseView.vue') },
    { path: '/members', name: 'members', component: () => import('@/views/MembersView.vue') },
    { path: '/login', name: LOGIN_ROUTE, component: () => import('@/views/LoginView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  if (to.name === LOGIN_ROUTE) return true
  return (await authApi.isSignedIn()) ? true : { name: LOGIN_ROUTE }
})

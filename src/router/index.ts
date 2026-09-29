import { createRouter, createWebHistory } from 'vue-router'
import CarteraView from '@/modules/cartera/views/CarteraView.vue'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/modules/autenticacion/views/LoginView.vue'),
    },
    {
      path: '/',
      redirect: '/cartera',
    },
    {
      path: '/',
      component: () => import('@/shared/layouts/MainLayout.vue'),
      meta: { requiresAuth: true }, // los hijos heredan esto
      children: [
        {
          path: 'cartera',
          component: CarteraView,
        },
        {
          path: 'contribuyentes/:cm',
          name: 'contribuyente-detail',
          component: () => import('@/modules/contribuyentes/views/ContribuyenteDetailView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { path: '/cartera' }
  }
})

export default router

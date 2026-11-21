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
          path: 'convenios',
          name: 'convenios',
          meta: { requiereCartera: true },
          component: () => import('@/modules/convenios/views/ConveniosView.vue'),
        },
        {
          path: 'reportes',
          name: 'reportes',
          meta: { requiereCartera: true },
          component: () => import('@/modules/reportes/views/ReportesView.vue'),
        },
        {
          path: 'comparar-cartera',
          name: 'comparar-cartera',
          meta: { requiereCartera: true },
          component: () => import('@/modules/comparacion/views/ComparacionCarteraView.vue'),
        },
        {
          path: 'configuracion',
          name: 'configuracion',
          meta: { requiereAdministrador: true },
          component: () => import('@/modules/configuracion/views/ConfiguracionView.vue'),
        },
        {
          path: 'cartera',
          meta: { requiereCartera: true },
          component: CarteraView,
        },
        {
          path: 'contribuyentes/:contribuyenteId',
          name: 'contribuyente-detail',
          meta: { requiereCartera: true },
          component: () => import('@/modules/contribuyentes/views/ContribuyenteDetalleView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && auth.isAuthenticated) {
    try {
      await auth.actualizarSesion()
    } catch {
      // La API valida los permisos; un fallo de red no borra la sesion local.
      if (!localStorage.getItem('token')) auth.logout()
    }
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }
  if (to.meta.requiereAdministrador && !auth.puedeConfigurar) {
    return { path: '/cartera' }
  }
  if (to.meta.requiereCartera && auth.isAuthenticated && !auth.puedeVerCartera) {
    auth.logout()
    return { name: 'login' }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { path: auth.inicio }
  }
})

export default router

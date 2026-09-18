import { createRouter, createWebHistory } from 'vue-router'
import CarteraView from '@/modules/cartera/views/CarteraView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      redirect: '/cartera',
    },
    {
      path: '/',
      component: () => import('@/shared/layouts/MainLayout.vue'),

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

export default router

import { expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { useAuthStore } from '../src/modules/autenticacion/stores/auth.store'
import NoEncontradaView from '../src/shared/views/NoEncontradaView.vue'

vi.mock('vue-router', () => ({ useRoute: () => ({ fullPath: '/carteraa?q=1' }) }))

it('explica la dirección que no existe y vuelve al inicio del rol', () => {
  setActivePinia(createPinia())
  useAuthStore().user = { id: 1, username: 'admin', roles: ['ADMINISTRADOR'] }
  const w = mount(NoEncontradaView, { global: { stubs: { RouterLink: RouterLinkStub } } })
  expect(w.get('h1').text()).toBe('Página no encontrada')
  expect(w.text()).toContain('/carteraa?q=1')
  const enlace = w.getComponent(RouterLinkStub)
  expect(enlace.text()).toBe('Ir al inicio')
  expect(enlace.props('to')).toBe(useAuthStore().inicio)
})

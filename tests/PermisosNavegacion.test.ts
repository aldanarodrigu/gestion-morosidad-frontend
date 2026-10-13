import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { useAuthStore } from '../src/modules/autenticacion/stores/auth.store'
import NavBar from '../src/shared/components/NavBar.vue'
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})
describe('navegacion segun roles', () => {
  it('Administrador puede entrar a cartera y ve todas las secciones', () => {
    const auth = useAuthStore()
    auth.user = { id: 1, username: 'admin', roles: ['ADMINISTRADOR'] }
    expect(auth.inicio).toBe('/cartera')
    expect(auth.puedeVerCartera).toBe(true)
    const w = mount(NavBar, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
    expect(w.get('nav').text()).toContain('Configuraci')
    expect(w.get('nav').text()).toContain('Cartera')
    expect(w.get('nav').text()).toContain('Convenios')
    expect(w.get('nav').text()).toContain('Reportes')
    w.unmount()
  })
  it.each([
    ['NOTIFICADOR'],
    ['ANALISTA'],
    ['ADMINISTRADOR', 'NOTIFICADOR'],
    ['ADMINISTRADOR', 'ANALISTA'],
  ])('los roles operativos mantienen el acceso a cartera: %s', (...roles: string[]) => {
    const auth = useAuthStore()
    auth.user = { id: 1, username: 'usuario', roles }
    expect(auth.inicio).toBe('/cartera')
    expect(auth.puedeVerCartera).toBe(true)
    const w = mount(NavBar, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
    expect(w.get('nav').text()).toContain('Cartera')
    w.unmount()
  })
})

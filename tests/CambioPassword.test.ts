import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { authService } from '../src/modules/autenticacion/services/auth.service'
import { useAuthStore } from '../src/modules/autenticacion/stores/auth.store'
import CambiarPasswordView from '../src/modules/autenticacion/views/CambiarPasswordView.vue'
import router from '../src/router'

vi.mock('../src/modules/autenticacion/services/auth.service', () => ({
  authService: { cambiarPassword: vi.fn() },
}))

beforeEach(async () => {
  vi.resetAllMocks()
  localStorage.clear()
  setActivePinia(createPinia())
  await router.push('/login')
  vi.spyOn(useAuthStore(), 'actualizarSesion').mockResolvedValue()
})

function sesionTemporal(temporal: boolean) {
  const auth = useAuthStore()
  auth.token = 'token-prueba'
  localStorage.setItem('token', auth.token)
  auth.user = { id: 2, username: 'operador', roles: ['NOTIFICADOR'], requiereCambioPassword: temporal }
  return auth
}

it('redirige las rutas de trabajo al cambio obligatorio cuando la clave es temporal', async () => {
  const auth = sesionTemporal(true)
  await router.push('/cartera')
  expect(router.currentRoute.value.name).toBe('cambiar-contrasena')
  await router.push('/reportes')
  expect(router.currentRoute.value.name).toBe('cambiar-contrasena')
  expect(auth.puedeVerCartera).toBe(false)
})

it('valida la confirmación, cambia la clave y cierra la sesión al guardar', async () => {
  const auth = sesionTemporal(true)
  await router.push('/cambiar-contrasena')
  const w = mount(CambiarPasswordView, { global: { plugins: [router], stubs: { RouterLink: RouterLinkStub } } })
  const campos = w.findAll('input')
  const nueva = 'nueva-clave-de-prueba'
  await campos[0]!.setValue('clave-temporal-prueba')
  await campos[1]!.setValue(nueva)
  await campos[2]!.setValue('otra-clave-de-prueba')
  await w.get('form').trigger('submit')
  expect(authService.cambiarPassword).not.toHaveBeenCalled()
  expect(w.get('[role="alert"]').text()).toContain('no coinciden')

  await campos[2]!.setValue(nueva)
  await w.get('form').trigger('submit')
  await flushPromises()
  expect(authService.cambiarPassword).toHaveBeenCalledExactlyOnceWith('clave-temporal-prueba', nueva)
  expect(auth.isAuthenticated).toBe(false)
  expect(localStorage.getItem('token')).toBeNull()
  expect(router.currentRoute.value.name).toBe('login')
  w.unmount()
})

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

async function montarFormulario() {
  sesionTemporal(false)
  await router.push('/cambiar-contrasena')
  const w = mount(CambiarPasswordView, { global: { plugins: [router], stubs: { RouterLink: RouterLinkStub } } })
  const enviar = async (actual: string, nueva: string, confirmar = nueva) => {
    const campos = w.findAll('input')
    await campos[0]!.setValue(actual)
    await campos[1]!.setValue(nueva)
    await campos[2]!.setValue(confirmar)
    await w.get('form').trigger('submit')
    await flushPromises()
  }
  return { w, enviar }
}

it.each([
  ['menos de 15 caracteres', 'corta-1234567', 'al menos 15'],
  ['14 caracteres Unicode aunque ocupen más unidades UTF-16', '🔑'.repeat(14), 'al menos 15'],
  ['más de 72 bytes en UTF-8', 'á'.repeat(37), '72 bytes'],
])('rechaza en el cliente una nueva con %s', async (_caso, nueva, texto) => {
  const { w, enviar } = await montarFormulario()
  await enviar('clave-actual-de-prueba', nueva)
  expect(authService.cambiarPassword).not.toHaveBeenCalled()
  expect(w.get('[role="alert"]').text()).toContain(texto)
  w.unmount()
})

it('acepta 15 emojis (15 caracteres, 60 bytes)', async () => {
  const { w, enviar } = await montarFormulario()
  await enviar('clave-actual-de-prueba', '🔑'.repeat(15))
  expect(authService.cambiarPassword).toHaveBeenCalledOnce()
  w.unmount()
})

it('rechaza una nueva igual a la actual', async () => {
  const { w, enviar } = await montarFormulario()
  await enviar('misma-clave-de-prueba', 'misma-clave-de-prueba')
  expect(authService.cambiarPassword).not.toHaveBeenCalled()
  expect(w.get('[role="alert"]').text()).toContain('distinta de la actual')
  w.unmount()
})

it('muestra el mensaje del backend en un 400 y conserva la sesión', async () => {
  vi.mocked(authService.cambiarPassword).mockRejectedValueOnce({
    isAxiosError: true,
    response: { status: 400, data: { mensaje: 'La contraseña actual es incorrecta.' } },
  })
  const { w, enviar } = await montarFormulario()
  await enviar('clave-equivocada-prueba', 'nueva-clave-de-prueba')
  expect(w.get('[role="alert"]').text()).toBe('La contraseña actual es incorrecta.')
  expect(useAuthStore().isAuthenticated).toBe(true)
  w.unmount()
})

it('permite entrar a las rutas normales cuando ya no requiere cambio', async () => {
  sesionTemporal(false)
  await router.push('/cartera')
  expect(router.currentRoute.value.path).toBe('/cartera')
})

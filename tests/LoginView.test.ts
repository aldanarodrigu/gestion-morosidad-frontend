import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { authService } from '../src/modules/autenticacion/services/auth.service'
import LoginView from '../src/modules/autenticacion/views/LoginView.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ query: {} }),
}))
vi.mock('../src/modules/autenticacion/services/auth.service', () => ({
  authService: { login: vi.fn() },
}))

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  localStorage.clear()
  setActivePinia(createPinia())
})
afterEach(() => vi.useRealTimers())

it('actualiza la espera sin enviar peticiones y habilita ingresar al vencer', async () => {
  vi.mocked(authService.login).mockRejectedValueOnce({
    isAxiosError: true,
    response: { status: 429, headers: { 'retry-after': '60' } },
  })
  const vista = mount(LoginView)
  const usuario = vista.get('input[autocomplete="username"]')
  await usuario.setValue('operador')
  await vista.get('input[type="password"]').setValue('clave-de-prueba')
  await vista.get('form').trigger('submit')
  await flushPromises()

  expect(vista.get('[role="timer"]').text()).toBe('1 min 00 s')
  expect(vista.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  await vi.advanceTimersByTimeAsync(1000)
  expect(vista.get('[role="timer"]').text()).toBe('59 s')
  await vista.get('form').trigger('submit')
  expect(authService.login).toHaveBeenCalledTimes(1)

  await usuario.setValue('otro')
  expect(vista.find('[role="timer"]').exists()).toBe(false)
  expect(vista.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
  await usuario.setValue(' OPERADOR ')
  expect(vista.get('[role="timer"]').text()).toBe('59 s')

  await vi.advanceTimersByTimeAsync(50000)
  expect(vista.get('[role="timer"]').text()).toBe('9 s')
  await vi.advanceTimersByTimeAsync(9000)
  expect(vista.find('[role="timer"]').exists()).toBe(false)
  expect(vista.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
  expect(authService.login).toHaveBeenCalledTimes(1)
  vista.unmount()
})

it('en un 401 muestra un mensaje genérico sin repetir el del backend', async () => {
  vi.mocked(authService.login).mockRejectedValueOnce({
    isAxiosError: true,
    response: { status: 401, headers: {}, data: { mensaje: 'El usuario no existe' } },
  })
  const vista = mount(LoginView)
  await vista.get('input[autocomplete="username"]').setValue('inexistente')
  await vista.get('input[type="password"]').setValue('clave-de-prueba')
  await vista.get('form').trigger('submit')
  await flushPromises()
  expect(vista.get('[role="alert"]').text()).toBe('Usuario o contraseña incorrectos.')
  vista.unmount()
})

it('en un 429 sin Retry-After muestra el mensaje del backend', async () => {
  vi.mocked(authService.login).mockRejectedValueOnce({
    isAxiosError: true,
    response: {
      status: 429,
      headers: {},
      data: { mensaje: 'Demasiados intentos. Esperá un momento.' },
    },
  })
  const vista = mount(LoginView)
  await vista.get('input[autocomplete="username"]').setValue('operador')
  await vista.get('input[type="password"]').setValue('clave-de-prueba')
  await vista.get('form').trigger('submit')
  await flushPromises()
  expect(vista.get('[role="alert"]').text()).toBe('Demasiados intentos. Esperá un momento.')
  vista.unmount()
})

it('permite ver y ocultar la contraseña sin enviar el formulario', async () => {
  const vista = mount(LoginView)
  const campo = vista.get('#login-password')
  const ver = vista.get('button.login__ver')
  expect(campo.attributes('type')).toBe('password')
  expect(ver.attributes('aria-label')).toBe('Mostrar contraseña')
  await ver.trigger('click')
  expect(campo.attributes('type')).toBe('text')
  expect(ver.attributes('aria-pressed')).toBe('true')
  expect(ver.attributes('aria-label')).toBe('Ocultar contraseña')
  expect(authService.login).not.toHaveBeenCalled()
  await ver.trigger('click')
  expect(campo.attributes('type')).toBe('password')
})

// El entorno de pruebas no implementa Bloq Mayús: se simula el estado de la tecla en el evento.
function teclaConMayusculas(activas: boolean) {
  const evento = new KeyboardEvent('keyup', { key: 'a' })
  Object.defineProperty(evento, 'getModifierState', {
    value: (tecla: string) => tecla === 'CapsLock' && activas,
  })
  return evento
}

it('avisa cuando Bloq Mayús está activado', async () => {
  const vista = mount(LoginView)
  const campo = vista.get('#login-password')
  campo.element.dispatchEvent(teclaConMayusculas(true))
  await vista.vm.$nextTick()
  expect(vista.text()).toContain('Bloq Mayús está activado')
  expect(campo.attributes('aria-describedby')).toBe('login-mayusculas')
  campo.element.dispatchEvent(teclaConMayusculas(false))
  await vista.vm.$nextTick()
  expect(vista.text()).not.toContain('Bloq Mayús')
})

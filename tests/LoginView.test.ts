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
    isAxiosError: true, response: { status: 429, headers: { 'retry-after': '60' } },
  })
  const vista = mount(LoginView)
  const usuario = vista.get('input[autocomplete="username"]')
  await usuario.setValue('operador')
  await vista.get('input[type="password"]').setValue('clave-de-prueba')
  await vista.get('form').trigger('submit')
  await flushPromises()

  expect(vista.get('[role="timer"]').text()).toBe('1 min 00 s')
  expect(vista.get('button').attributes('disabled')).toBeDefined()
  await vi.advanceTimersByTimeAsync(1000)
  expect(vista.get('[role="timer"]').text()).toBe('59 s')
  await vista.get('form').trigger('submit')
  expect(authService.login).toHaveBeenCalledTimes(1)

  await usuario.setValue('otro')
  expect(vista.find('[role="timer"]').exists()).toBe(false)
  expect(vista.get('button').attributes('disabled')).toBeUndefined()
  await usuario.setValue(' OPERADOR ')
  expect(vista.get('[role="timer"]').text()).toBe('59 s')

  await vi.advanceTimersByTimeAsync(50000)
  expect(vista.get('[role="timer"]').text()).toBe('9 s')
  await vi.advanceTimersByTimeAsync(9000)
  expect(vista.find('[role="timer"]').exists()).toBe(false)
  expect(vista.get('button').attributes('disabled')).toBeUndefined()
  expect(authService.login).toHaveBeenCalledTimes(1)
  vista.unmount()
})

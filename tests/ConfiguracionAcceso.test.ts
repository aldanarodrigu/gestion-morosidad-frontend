import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../src/modules/autenticacion/stores/auth.store'
import router from '../src/router'

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  await router.push('/login')
  vi.spyOn(useAuthStore(), 'actualizarSesion').mockResolvedValue()
})
afterEach(() => vi.restoreAllMocks())

function sesion(roles: string[]) {
  const auth = useAuthStore()
  auth.token = 'token-prueba'
  localStorage.setItem('token', auth.token)
  auth.user = { id: 1, username: 'usuario', roles }
  return auth
}

describe('acceso directo a Configuración', () => {
  it.each([['ANALISTA'], ['NOTIFICADOR'], ['ANALISTA', 'NOTIFICADOR']])(
    'redirige a cartera sin Administrador: %s', async (...roles: string[]) => {
      sesion(roles)
      await router.push('/configuracion')
      expect(router.currentRoute.value.path).toBe('/cartera')
    },
  )
  it.each([['ADMINISTRADOR'], ['ANALISTA', 'ADMINISTRADOR'], ['NOTIFICADOR', 'ANALISTA', 'ADMINISTRADOR']])(
    'permite Configuración con Administrador: %s', async (...roles: string[]) => {
      sesion(roles)
      await router.push('/configuracion')
      expect(router.currentRoute.value.name).toBe('configuracion')
    },
  )
  it('evita un bucle de redirecciones si la sesión ya no tiene roles válidos', async () => {
    const auth = sesion([])
    await router.push('/configuracion')
    expect(router.currentRoute.value.name).toBe('login')
    expect(auth.isAuthenticated).toBe(false)
  })
  it('envía a login sin sesión', async () => {
    await router.push('/configuracion')
    expect(router.currentRoute.value.name).toBe('login')
  })
  it('valida los roles actualizados por el servidor antes de permitir entrar', async () => {
    const auth = sesion(['ADMINISTRADOR'])
    vi.mocked(auth.actualizarSesion).mockImplementation(async () => {
      auth.user!.roles = ['ANALISTA']
    })
    await router.push('/configuracion')
    expect(auth.actualizarSesion).toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/cartera')
  })
})

describe('título de la pestaña del navegador', () => {
  it('cada pantalla tiene su propio título, con tilde', async () => {
    await router.push('/login')
    expect(document.title).toBe('Ingresar · Gestión de Morosidad')
    sesion(['ADMINISTRADOR'])
    await router.push('/configuracion')
    expect(document.title).toBe('Configuración · Gestión de Morosidad')
    await router.push('/reportes')
    expect(document.title).toBe('Reportes · Gestión de Morosidad')
  })
})

describe('dirección inexistente', () => {
  it('con sesión muestra «Página no encontrada» dentro del sistema', async () => {
    sesion(['ANALISTA'])
    await router.push('/esto-no-existe/123')
    expect(router.currentRoute.value.name).toBe('no-encontrada')
    expect(router.currentRoute.value.path).toBe('/esto-no-existe/123')
    expect(document.title).toBe('Página no encontrada · Gestión de Morosidad')
  })

  it('sin sesión pide ingresar', async () => {
    await router.push('/esto-no-existe')
    expect(router.currentRoute.value.name).toBe('login')
  })
})

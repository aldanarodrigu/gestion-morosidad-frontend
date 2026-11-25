import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import UsuariosTab from '../src/modules/configuracion/components/UsuariosTab.vue'
import * as api from '../src/modules/configuracion/services/usuarioService'
import { useAuthStore } from '../src/modules/autenticacion/stores/auth.store'
vi.mock('../src/modules/configuracion/services/usuarioService', async (importOriginal) => ({
  ...(await importOriginal<typeof api>()),
  obtenerUsuarios: vi.fn(),
  crearUsuario: vi.fn(),
  actualizarUsuario: vi.fn(),
  restablecerPassword: vi.fn(),
}))
const usuario: api.Usuario = { id: 2, username: 'operador', roles: ['NOTIFICADOR'], activo: true }
beforeEach(() => {
  vi.resetAllMocks()
  setActivePinia(createPinia())
  useAuthStore().user = { id: 1, username: 'admin', roles: ['ADMINISTRADOR'] }
  vi.mocked(api.obtenerUsuarios).mockResolvedValue([{ ...usuario, roles: [...usuario.roles] }])
  vi.mocked(api.actualizarUsuario).mockImplementation(async (id, request) => ({ id, ...request }))
  vi.mocked(api.crearUsuario).mockImplementation(async (request) => ({
    ...request,
    id: 3,
    activo: true,
  }))
})
const montar = () => mount(UsuariosTab)
describe('administracion de usuarios', () => {
  it('permite consultar y administrar con Notificador y Administrador simultaneamente', async () => {
    useAuthStore().user = { id: 1, username: 'mixto', roles: ['NOTIFICADOR', 'ADMINISTRADOR'] }
    const w = montar()
    await flushPromises()
    expect(w.text()).toContain('operador')
    expect(w.text()).toContain('Notificador')
    expect(w.find('.editar').exists()).toBe(true)
    w.unmount()
  })
  it.each(['ANALISTA', 'NOTIFICADOR'])(
    'el rol %s no consulta ni administra usuarios',
    async (rol) => {
      useAuthStore().user = { id: 2, username: 'operador', roles: [rol] }
      const w = montar()
      await flushPromises()
      expect(api.obtenerUsuarios).not.toHaveBeenCalled()
      expect(w.text()).toContain('Solo los administradores')
      expect(w.find('button').exists()).toBe(false)
      w.unmount()
    },
  )
  it('crea una cuenta con varios roles y no conserva la contrasena en la lista', async () => {
    const w = montar()
    await flushPromises()
    await w.get('.cabecera button').trigger('click')
    await w.get('#usuario-nombre').setValue(' nuevo ')
    await w.get('#usuario-password').setValue('clave-inicial-prueba')
    await w.get('[data-rol="NOTIFICADOR"]').setValue(true)
    await w.get('[data-rol="ADMINISTRADOR"]').setValue(true)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(api.crearUsuario).toHaveBeenCalledWith({
      username: 'nuevo',
      password: 'clave-inicial-prueba',
      roles: ['NOTIFICADOR', 'ADMINISTRADOR'],
    })
    expect(w.text()).toContain('Usuario guardado correctamente')
    expect(w.find('form').exists()).toBe(false)
    expect(w.findAll('tbody tr')).toHaveLength(2)
    expect(w.text()).not.toContain('clave-inicial-prueba')
    w.unmount()
  })
  it('guarda los roles y el estado sin enviar ni reemplazar la contrasena', async () => {
    const w = montar()
    await flushPromises()
    await w.get('.editar').trigger('click')
    await w.get('[data-rol="ADMINISTRADOR"]').setValue(true)
    await w.get('#usuario-activo').setValue(false)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(api.actualizarUsuario).toHaveBeenCalledWith(2, {
      username: 'operador',
      roles: ['NOTIFICADOR', 'ADMINISTRADOR'],
      activo: false,
    })
    expect(w.text()).toContain('Administrador')
    expect(w.text()).toContain('Inactivo')
    w.unmount()
  })
  it('no permite quitar todos los roles', async () => {
    const w = montar()
    await flushPromises()
    await w.get('.editar').trigger('click')
    await w.get('[data-rol="NOTIFICADOR"]').setValue(false)
    await w.get('form').trigger('submit')
    expect(api.actualizarUsuario).not.toHaveBeenCalled()
    expect(w.text()).toContain('al menos un rol')
    w.unmount()
  })
  it('cancelar no modifica roles ni estado', async () => {
    const w = montar()
    await flushPromises()
    await w.get('.editar').trigger('click')
    await w.get('[data-rol="ADMINISTRADOR"]').setValue(true)
    await w.get('form button[type="button"]').trigger('click')
    expect(api.actualizarUsuario).not.toHaveBeenCalled()
    expect(w.get('tbody').text()).not.toContain('Administrador')
    w.unmount()
  })
  it('un fallo conserva los cambios del formulario y no modifica la lista', async () => {
    vi.mocked(api.actualizarUsuario).mockRejectedValue(new Error('Sin conexion'))
    const w = montar()
    await flushPromises()
    await w.get('.editar').trigger('click')
    await w.get('[data-rol="ADMINISTRADOR"]').setValue(true)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('No se pudo guardar')
    expect(w.get<HTMLInputElement>('[data-rol="ADMINISTRADOR"]').element.checked).toBe(true)
    expect(w.get('tbody').text()).not.toContain('Administrador')
    w.unmount()
  })
  it('permite reintentar al fallar el listado', async () => {
    vi.mocked(api.obtenerUsuarios).mockRejectedValueOnce(new Error('Sin conexion'))
    const w = montar()
    await flushPromises()
    expect(w.text()).toContain('No se pudieron cargar')
    await w.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('operador')
    w.unmount()
  })
})

it('confirma el restablecimiento de otra cuenta y retira la clave temporal al cerrar', async () => {
  vi.mocked(api.obtenerUsuarios).mockResolvedValue([
    { id: 1, username: 'admin', roles: ['ADMINISTRADOR'], activo: true },
    usuario,
  ])
  vi.mocked(api.restablecerPassword).mockResolvedValue({
    passwordTemporal: 'clave-temporal-de-prueba',
    venceEn: '2026-11-22T16:00:00Z',
  })
  const w = montar()
  await flushPromises()
  expect(w.find('[aria-label="Restablecer contraseña de admin"]').exists()).toBe(false)
  await w.get('[aria-label="Restablecer contraseña de operador"]').trigger('click')
  expect(api.restablecerPassword).not.toHaveBeenCalled()
  const panel = w.get('section[aria-labelledby="titulo-reset-password"]')
  await panel.get('button.primario').trigger('click')
  await flushPromises()
  expect(api.restablecerPassword).toHaveBeenCalledExactlyOnceWith(2, expect.any(AbortSignal))
  expect((panel.get('input[readonly]').element as HTMLInputElement).value).toBe('clave-temporal-de-prueba')
  expect(panel.text()).toMatch(/Vence el \d{2}\/\d{2}\/\d{2,4}/)
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  await panel.get('button.copiar').trigger('click')
  await flushPromises()
  expect(writeText).toHaveBeenCalledExactlyOnceWith('clave-temporal-de-prueba')
  expect(panel.text()).toContain('Copiada al portapapeles')
  await panel.get('button.primario').trigger('click')
  expect(w.find('section[aria-labelledby="titulo-reset-password"]').exists()).toBe(false)
  expect(w.text()).not.toContain('clave-temporal-de-prueba')
  expect(JSON.stringify(localStorage)).not.toContain('clave-temporal-de-prueba')
  w.unmount()
})

describe('contraseña inicial en el alta', () => {
  async function abrirAlta(password: string) {
    const w = montar()
    await flushPromises()
    await w.get('.cabecera button').trigger('click')
    await w.get('#usuario-nombre').setValue('nuevo')
    await w.get('#usuario-password').setValue(password)
    await w.get('[data-rol="NOTIFICADOR"]').setValue(true)
    return w
  }

  it('aclara que la contraseña es temporal y vence en 24 h', async () => {
    const w = await abrirAlta('')
    expect(w.get('#usuario-password-ayuda').text()).toContain('vence en 24 h')
    w.unmount()
  })

  it.each([
    ['menos de 15 caracteres', 'corta-1234567', 'al menos 15'],
    ['14 emojis (cuentan como 14 caracteres)', '🔑'.repeat(14), 'al menos 15'],
    ['más de 72 bytes', 'á'.repeat(37), '72 bytes'],
  ])('rechaza en el cliente una contraseña con %s', async (_caso, password, texto) => {
    const w = await abrirAlta(password)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(api.crearUsuario).not.toHaveBeenCalled()
    expect(w.get('[role="alert"]').text()).toContain(texto)
    w.unmount()
  })

  it('muestra errores.password cuando el backend la rechaza', async () => {
    vi.mocked(api.crearUsuario).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 400,
        data: { mensaje: 'Datos inválidos', errores: { password: 'Contraseña demasiado común' } },
      },
    })
    const w = await abrirAlta('clave-inicial-prueba')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.get('[role="alert"]').text()).toBe('Contraseña demasiado común')
    expect(w.find('form').exists()).toBe(true)
    w.unmount()
  })
})

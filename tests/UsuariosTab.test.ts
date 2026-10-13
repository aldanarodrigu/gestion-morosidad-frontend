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
    await w.get('#usuario-password').setValue('prueba123')
    await w.get('[data-rol="NOTIFICADOR"]').setValue(true)
    await w.get('[data-rol="ADMINISTRADOR"]').setValue(true)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(api.crearUsuario).toHaveBeenCalledWith({
      username: 'nuevo',
      password: 'prueba123',
      roles: ['NOTIFICADOR', 'ADMINISTRADOR'],
    })
    expect(w.text()).toContain('Usuario guardado correctamente')
    expect(w.find('form').exists()).toBe(false)
    expect(w.findAll('tbody tr')).toHaveLength(2)
    expect(w.text()).not.toContain('prueba123')
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

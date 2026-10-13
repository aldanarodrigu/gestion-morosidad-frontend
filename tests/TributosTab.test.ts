import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../src/modules/autenticacion/stores/auth.store'
import TributosTab from '../src/modules/configuracion/components/TributosTab.vue'
import * as api from '../src/modules/configuracion/services/tributoService'
vi.mock('../src/modules/configuracion/services/tributoService')
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.crearTributo).mockImplementation(async (codigo, descripcion) => ({
    id: 3,
    codigo,
    descripcion,
  }))
  vi.mocked(api.eliminarTributo).mockResolvedValue(undefined)
  setActivePinia(createPinia())
  useAuthStore().user = { id: 1, username: 'admin', roles: ['ADMINISTRADOR'] }
  vi.mocked(api.obtenerTributos).mockResolvedValue([
    { id: 1, codigo: '00101', descripcion: null },
    { id: 2, codigo: '201', descripcion: 'Urbana' },
  ])
  vi.mocked(api.actualizarTributo).mockImplementation(async (id, descripcion) => ({
    id,
    codigo: '00101',
    descripcion,
  }))
})
describe('catalogo de tributos', () => {
  it('muestra todos los codigos como texto y las descripciones disponibles', async () => {
    const w = mount(TributosTab)
    await flushPromises()
    expect(w.text()).toContain('00101')
    expect(w.text()).toContain('Sin descripci')
    expect(w.text()).toContain('Urbana')
    expect(w.findAll('tbody tr')).toHaveLength(2)
    w.unmount()
  })
  it('administrador con varios roles edita descripcion sin modificar codigo', async () => {
    useAuthStore().user = { id: 1, username: 'mixto', roles: ['NOTIFICADOR', 'ADMINISTRADOR'] }
    const w = mount(TributosTab)
    await flushPromises()
    await w.findAll('.editar')[0]!.trigger('click')
    await w.get('#tributo-descripcion').setValue(' Rural ')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(api.actualizarTributo).toHaveBeenCalledWith(1, 'Rural')
    expect(w.get('tbody').text()).toContain('Rural')
    expect(w.get('tbody').text()).toContain('00101')
    expect(w.find('form').exists()).toBe(false)
    w.unmount()
  })
  it.each(['ANALISTA', 'NOTIFICADOR'])('el rol %s solo consulta', async (rol) => {
    useAuthStore().user = { id: 1, username: 'operador', roles: [rol] }
    const w = mount(TributosTab)
    await flushPromises()
    expect(w.findAll('tbody tr')).toHaveLength(2)
    expect(w.find('.editar').exists()).toBe(false)
    w.unmount()
  })
  it('cancelar mantiene la descripcion original', async () => {
    const w = mount(TributosTab)
    await flushPromises()
    await w.findAll('.editar')[0]!.trigger('click')
    await w.get('#tributo-descripcion').setValue('Nueva')
    await w.get('form button[type="button"]').trigger('click')
    expect(api.actualizarTributo).not.toHaveBeenCalled()
    expect(w.get('tbody').text()).not.toContain('Nueva')
    w.unmount()
  })
  it('exige descripcion y conserva el formulario al fallar el guardado', async () => {
    const w = mount(TributosTab)
    await flushPromises()
    await w.findAll('.editar')[0]!.trigger('click')
    await w.get('form').trigger('submit')
    expect(api.actualizarTributo).not.toHaveBeenCalled()
    vi.mocked(api.actualizarTributo).mockRejectedValue(new Error('Sin conexion'))
    await w.get('#tributo-descripcion').setValue('Conservar texto')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.get<HTMLInputElement>('#tributo-descripcion').element.value).toBe('Conservar texto')
    expect(w.text()).toContain('No se pudo guardar')
    w.unmount()
  })
  it('un fallo de carga permite reintentar sin mostrar un vacio falso', async () => {
    vi.mocked(api.obtenerTributos).mockRejectedValueOnce(new Error('Sin conexion'))
    const w = mount(TributosTab)
    await flushPromises()
    expect(w.text()).toContain('No se pudieron cargar')
    expect(w.text()).not.toContain('No hay tributos')
    await w.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(w.findAll('tbody tr')).toHaveLength(2)
    w.unmount()
  })
  it('agrega un tributo con codigo y descripcion', async () => {
    const w = mount(TributosTab)
    await flushPromises()
    await w.get('.agregar').trigger('click')
    await w.get('#tributo-codigo').setValue('00999')
    await w.get('#tributo-descripcion').setValue('Nuevo tributo')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(api.crearTributo).toHaveBeenCalledWith('00999', 'Nuevo tributo')
    expect(w.findAll('tbody tr')).toHaveLength(3)
    expect(w.text()).toContain('00999')
    w.unmount()
  })
  it('elimina solo despues de confirmar', async () => {
    const w = mount(TributosTab)
    await flushPromises()
    await w.findAll('.eliminar')[0]!.trigger('click')
    expect(api.eliminarTributo).not.toHaveBeenCalled()
    expect(w.get<HTMLDialogElement>('dialog').element.open).toBe(true)
    expect(w.get('dialog').text()).toContain('00101')
    await w.get('.confirmar-eliminar').trigger('click')
    await flushPromises()
    expect(api.eliminarTributo).toHaveBeenCalledWith(1)
    expect(w.get<HTMLDialogElement>('dialog').element.open).toBe(false)
    expect(w.findAll('tbody tr')).toHaveLength(1)
    w.unmount()
  })
  it('cancelar eliminacion no modifica el catalogo', async () => {
    const w = mount(TributosTab)
    await flushPromises()
    await w.findAll('.eliminar')[0]!.trigger('click')
    await w.get('dialog .secundario').trigger('click')
    expect(api.eliminarTributo).not.toHaveBeenCalled()
    expect(w.findAll('tbody tr')).toHaveLength(2)
    w.unmount()
  })
  it('conserva el tributo si el backend rechaza eliminarlo', async () => {
    vi.mocked(api.eliminarTributo).mockRejectedValue(new Error('Asociado a deudas'))
    const w = mount(TributosTab)
    await flushPromises()
    await w.findAll('.eliminar')[0]!.trigger('click')
    await w.get('.confirmar-eliminar').trigger('click')
    await flushPromises()
    expect(w.findAll('tbody tr')).toHaveLength(2)
    expect(w.text()).toContain('No se pudo eliminar')
    w.unmount()
  })
  it('Escape cierra el popup sin eliminar', async () => {
    const w = mount(TributosTab)
    await flushPromises()
    await w.findAll('.eliminar')[0]!.trigger('click')
    await flushPromises()
    await w.get('dialog').trigger('cancel')
    expect(w.get<HTMLDialogElement>('dialog').element.open).toBe(false)
    expect(api.eliminarTributo).not.toHaveBeenCalled()
    w.unmount()
  })
  it('no cierra ni duplica la eliminacion mientras guarda', async () => {
    let resolver!: () => void
    vi.mocked(api.eliminarTributo).mockReturnValue(
      new Promise((r) => {
        resolver = r
      }),
    )
    const w = mount(TributosTab)
    await flushPromises()
    await w.findAll('.eliminar')[0]!.trigger('click')
    await flushPromises()
    await w.get('.confirmar-eliminar').trigger('click')
    await w.get('.confirmar-eliminar').trigger('click')
    await w.get('dialog').trigger('cancel')
    expect(api.eliminarTributo).toHaveBeenCalledTimes(1)
    expect(w.get<HTMLDialogElement>('dialog').element.open).toBe(true)
    resolver()
    await flushPromises()
    expect(w.get<HTMLDialogElement>('dialog').element.open).toBe(false)
    w.unmount()
  })
})

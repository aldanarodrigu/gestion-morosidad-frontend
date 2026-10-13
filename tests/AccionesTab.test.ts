import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../src/modules/autenticacion/stores/auth.store'
import AccionesTab from '../src/modules/configuracion/components/AccionesTab.vue'
import ConfiguracionView from '../src/modules/configuracion/views/ConfiguracionView.vue'
import * as api from '../src/modules/configuracion/services/accionService'
import { obtenerTributos } from '../src/modules/configuracion/services/tributoService'
import { obtenerUsuarios } from '../src/modules/configuracion/services/usuarioService'
vi.mock('../src/modules/configuracion/services/accionService')
vi.mock('../src/modules/configuracion/services/tributoService', () => ({
  obtenerTributos: vi.fn().mockResolvedValue([]),
}))
vi.mock('../src/modules/configuracion/services/usuarioService', () => ({
  obtenerUsuarios: vi.fn().mockResolvedValue([]),
  rolesDisponibles: [],
}))
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.obtenerSegmentosAccion).mockResolvedValue([
    { id: 1, nombre: 'Mora Temprana', descripcion: null, orden: 1 },
    { id: 2, nombre: 'Mora Inicial', descripcion: null, orden: 2 },
    { id: 3, nombre: 'Mora Tardia', descripcion: null, orden: 3 },
  ])
  vi.mocked(api.crearAccion).mockImplementation(async (nombre, segmentoId) => ({
    id: 99,
    nombre,
    activo: true,
    segmentos: [{ id: segmentoId, nombre: 'Mora Inicial', descripcion: null, orden: 2 }],
  }))
  vi.mocked(obtenerTributos).mockResolvedValue([])
  vi.mocked(obtenerUsuarios).mockResolvedValue([])
  setActivePinia(createPinia())
  useAuthStore().user = { id: 1, username: 'admin', roles: ['ADMINISTRADOR'] }
  vi.mocked(api.cambiarEstadoAccion).mockImplementation(async (id, activo) => ({
    id,
    nombre: 'Llamada',
    activo,
  }))
  vi.mocked(api.obtenerAcciones).mockResolvedValue([
    { id: 1, nombre: 'Llamada', activo: true },
    { id: 2, nombre: 'Intimacion', activo: false },
  ])
})
describe('catalogo de acciones', () => {
  it('muestra los nombres reales e incluye las acciones inactivas', async () => {
    const w = mount(AccionesTab)
    await flushPromises()
    expect(api.obtenerAcciones).toHaveBeenCalledWith(expect.any(AbortSignal))
    expect(w.findAll('.accion')).toHaveLength(2)
    expect(w.findAll('.nombre').map((n) => n.text())).toEqual(['Llamada', 'Intimacion'])
    expect(w.findAll('.estado').map((n) => n.text())).toEqual(['Activa', 'Inactiva'])
    w.unmount()
  })
  it('distingue una lista vacia de un fallo y permite reintentar', async () => {
    vi.mocked(api.obtenerAcciones).mockRejectedValueOnce(new Error('Sin conexion'))
    const w = mount(AccionesTab)
    await flushPromises()
    expect(w.text()).toContain('No se pudieron cargar')
    expect(w.text()).not.toContain('No hay acciones registradas')
    await w.get('button').trigger('click')
    await flushPromises()
    expect(w.findAll('.accion')).toHaveLength(2)
    w.unmount()
  })
  it('informa cuando el catalogo esta vacio', async () => {
    vi.mocked(api.obtenerAcciones).mockResolvedValue([])
    const w = mount(AccionesTab)
    await flushPromises()
    expect(w.text()).toContain('No hay acciones registradas')
    w.unmount()
  })
  it('solo carga al abrir Acciones y vuelve a consultar al regresar', async () => {
    const w = mount(ConfiguracionView)
    await flushPromises()
    expect(api.obtenerAcciones).not.toHaveBeenCalled()
    await w.get('#configuracion-tab-acciones').trigger('click')
    await flushPromises()
    expect(api.obtenerAcciones).toHaveBeenCalledTimes(1)
    expect(w.get('#configuracion-panel-acciones').text()).toContain('Llamada')
    await w.get('#configuracion-tab-usuarios').trigger('click')
    await w.get('#configuracion-tab-acciones').trigger('click')
    await flushPromises()
    expect(api.obtenerAcciones).toHaveBeenCalledTimes(2)
    w.unmount()
  })
  it('guarda la desactivacion y permite reactivar la accion', async () => {
    const w = mount(AccionesTab)
    await flushPromises()
    await w.findAll('[role="switch"]')[0]!.trigger('click')
    await flushPromises()
    expect(api.cambiarEstadoAccion).toHaveBeenCalledWith(1, false)
    expect(w.findAll('[role="switch"]')[0]!.attributes('aria-checked')).toBe('false')
    await w.findAll('[role="switch"]')[0]!.trigger('click')
    await flushPromises()
    expect(api.cambiarEstadoAccion).toHaveBeenLastCalledWith(1, true)
    expect(w.findAll('[role="switch"]')[0]!.attributes('aria-checked')).toBe('true')
    w.unmount()
  })
  it('conserva el estado anterior e informa si falla el guardado', async () => {
    vi.mocked(api.cambiarEstadoAccion).mockRejectedValue(new Error('Sin conexion'))
    const w = mount(AccionesTab)
    await flushPromises()
    await w.findAll('[role="switch"]')[0]!.trigger('click')
    await flushPromises()
    expect(w.findAll('[role="switch"]')[0]!.attributes('aria-checked')).toBe('true')
    expect(w.text()).toContain('No se pudo cambiar el estado')
    w.unmount()
  })
  it.each(['ANALISTA', 'NOTIFICADOR'])('el rol %s consulta pero no cambia estados', async (rol) => {
    useAuthStore().user = { id: 2, username: 'operador', roles: [rol] }
    const w = mount(AccionesTab)
    await flushPromises()
    expect(w.findAll('.accion')).toHaveLength(2)
    for (const interruptor of w.findAll('[role="switch"]')) {
      expect(interruptor.attributes('disabled')).toBeDefined()
      await interruptor.trigger('click')
    }
    expect(api.cambiarEstadoAccion).not.toHaveBeenCalled()
    w.unmount()
  })
  it('bloquea el interruptor mientras guarda y evita envios duplicados', async () => {
    let resolver!: (value: api.Accion) => void
    vi.mocked(api.cambiarEstadoAccion).mockReturnValue(
      new Promise((r) => {
        resolver = r
      }),
    )
    const w = mount(AccionesTab)
    await flushPromises()
    const interruptor = w.findAll('[role="switch"]')[0]!
    await interruptor.trigger('click')
    await interruptor.trigger('click')
    expect(api.cambiarEstadoAccion).toHaveBeenCalledTimes(1)
    expect(interruptor.attributes('disabled')).toBeDefined()
    resolver({ id: 1, nombre: 'Llamada', activo: false })
    await flushPromises()
    expect(interruptor.attributes('aria-checked')).toBe('false')
    w.unmount()
  })
  it('Notificador con Administrador puede cambiar estados', async () => {
    useAuthStore().user = { id: 1, username: 'mixto', roles: ['NOTIFICADOR', 'ADMINISTRADOR'] }
    const w = mount(AccionesTab)
    await flushPromises()
    await w.findAll('[role="switch"]')[0]!.trigger('click')
    await flushPromises()
    expect(api.cambiarEstadoAccion).toHaveBeenCalledWith(1, false)
    w.unmount()
  })
  it('crea una accion activa vinculada a la mora elegida', async () => {
    const w = mount(AccionesTab)
    await flushPromises()
    await w.get('.agregar').trigger('click')
    await flushPromises()
    await w.get('#accion-nombre').setValue(' Nueva llamada ')
    await w.get('#accion-segmento').setValue('2')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(api.crearAccion).toHaveBeenCalledWith('Nueva llamada', 2)
    expect(w.findAll('.accion')).toHaveLength(3)
    expect(w.text()).toContain('Mora Inicial')
    expect(w.find('form').exists()).toBe(false)
    w.unmount()
  })
  it('exige nombre y segmento antes de crear', async () => {
    const w = mount(AccionesTab)
    await flushPromises()
    await w.get('.agregar').trigger('click')
    await flushPromises()
    await w.get('form').trigger('submit')
    await w.get('#accion-nombre').setValue('Nueva')
    await w.get('form').trigger('submit')
    expect(api.crearAccion).not.toHaveBeenCalled()
    expect(w.find('form [role="alert"]').exists()).toBe(true)
    w.unmount()
  })
  it('cancelar no crea ninguna accion', async () => {
    const w = mount(AccionesTab)
    await flushPromises()
    await w.get('.agregar').trigger('click')
    await flushPromises()
    await w.get('#accion-nombre').setValue('Cancelar')
    await w.get('form .secundario').trigger('click')
    expect(api.crearAccion).not.toHaveBeenCalled()
    expect(w.find('form').exists()).toBe(false)
    w.unmount()
  })
  it('conserva nombre y mora si falla la creacion', async () => {
    vi.mocked(api.crearAccion).mockRejectedValue(new Error('Duplicada'))
    const w = mount(AccionesTab)
    await flushPromises()
    await w.get('.agregar').trigger('click')
    await flushPromises()
    await w.get('#accion-nombre').setValue('Conservar nombre')
    await w.get('#accion-segmento').setValue('2')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.get<HTMLInputElement>('#accion-nombre').element.value).toBe('Conservar nombre')
    expect(w.get<HTMLSelectElement>('#accion-segmento').element.value).toBe('2')
    expect(w.findAll('.accion')).toHaveLength(2)
    expect(w.text()).toContain('No se pudo crear')
    w.unmount()
  })
  it('no envia dos veces mientras crea', async () => {
    let resolver!: (accion: api.Accion) => void
    vi.mocked(api.crearAccion).mockReturnValue(
      new Promise((r) => {
        resolver = r
      }),
    )
    const w = mount(AccionesTab)
    await flushPromises()
    await w.get('.agregar').trigger('click')
    await flushPromises()
    await w.get('#accion-nombre').setValue('Nueva')
    await w.get('#accion-segmento').setValue('1')
    await w.get('form').trigger('submit')
    await w.get('form').trigger('submit')
    expect(api.crearAccion).toHaveBeenCalledTimes(1)
    expect(w.get('fieldset').attributes('disabled')).toBeDefined()
    resolver({ id: 99, nombre: 'Nueva', activo: true })
    await flushPromises()
    w.unmount()
  })
  it('permite reintentar si falla la carga de moras', async () => {
    vi.mocked(api.obtenerSegmentosAccion).mockRejectedValueOnce(new Error('Sin conexion'))
    const w = mount(AccionesTab)
    await flushPromises()
    await w.get('.agregar').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('No se pudieron cargar los segmentos')
    expect(w.get('form button[type="submit"]').attributes('disabled')).toBeDefined()
    await w.get('form [role="alert"] button').trigger('click')
    await flushPromises()
    expect(w.findAll('#accion-segmento option')).toHaveLength(4)
    w.unmount()
  })
  it.each(['ANALISTA', 'NOTIFICADOR'])('el rol %s no tiene formulario de creacion', async (rol) => {
    useAuthStore().user = { id: 2, username: 'usuario', roles: [rol] }
    const w = mount(AccionesTab)
    await flushPromises()
    expect(w.find('.agregar').exists()).toBe(false)
    expect(w.find('form').exists()).toBe(false)
    w.unmount()
  })
})

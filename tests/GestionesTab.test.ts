import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import GestionesTab from '../src/modules/contribuyentes/components/GestionesTab.vue'
import * as api from '../src/modules/contribuyentes/services/gestionService'
import type { DeudaApi } from '../src/modules/cartera/types/cartera'
import type { GestionResponse } from '../src/modules/contribuyentes/services/gestionService'
vi.mock('../src/modules/contribuyentes/services/gestionService')
const deudas = [10, 20].map(
  (id) =>
    ({
      id,
      padron: { cm: String(id), numeroPadron: String(id) },
      tributos: [{ id: 1, codigo: '201', descripcion: 'Contribución' }],
    }) as DeudaApi,
)
const gestion = (deudaId: number, nota = 'Nota inicial'): GestionResponse => ({
  id: deudaId,
  deudaId,
  accionId: 2,
  accionNombre: 'Llamada',
  resultado: 'EXITOSA',
  observacion: nota,
  fecha: '2026-10-12T17:00:00',
  usuarioId: 1,
  usuarioNombre: 'operador',
  cm: String(deudaId),
  numeroPadron: String(deudaId),
  tributos: [],
})
function montar() {
  return mount(GestionesTab, {
    props: { deudas, deudaInicialId: 10 },
    global: { plugins: [createPinia()] },
  })
}
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.setItem(
    'user',
    JSON.stringify({ id: 1, username: 'operador', roles: ['NOTIFICADOR'] }),
  )
  vi.mocked(api.obtenerGestiones).mockImplementation(async (id) => [gestion(id)])
  vi.mocked(api.obtenerAccionesDisponibles).mockResolvedValue([
    { id: 2, nombre: 'Llamada', activo: true },
  ])
})
describe('historial y registro de gestiones', () => {
  it('consulta la deuda de cartera y muestra el padrón sin selector', async () => {
    const w = montar()
    await flushPromises()
    expect(api.obtenerGestiones).toHaveBeenCalledWith(10, expect.any(AbortSignal))
    expect(w.text()).toContain('Nota inicial')
    expect(w.find('#gestion-deuda').exists()).toBe(false)
    expect(w.get('.contexto-deuda').text()).toContain('Padrón 10')
    await w.setProps({ deudaInicialId: 20 })
    await flushPromises()
    expect(api.obtenerGestiones).toHaveBeenLastCalledWith(20, expect.any(AbortSignal))
    expect(w.findAll('.gestion')).toHaveLength(1)
    w.unmount()
  })
  it('abre el historial de la deuda elegida en cartera aunque no sea la primera', async () => {
    const w = mount(GestionesTab, {
      props: { deudas, deudaInicialId: 20 },
      global: { plugins: [createPinia()] },
    })
    await flushPromises()
    expect(api.obtenerGestiones).toHaveBeenCalledWith(20, expect.any(AbortSignal))
    expect(api.obtenerGestiones).not.toHaveBeenCalledWith(10, expect.anything())
    w.unmount()
  })
  it('no elige arbitrariamente una deuda si falta el contexto de cartera', async () => {
    const w = mount(GestionesTab, { props: { deudas } })
    await flushPromises()
    expect(api.obtenerGestiones).not.toHaveBeenCalled()
    expect(w.text()).toContain('Volvé a la cartera')
    expect(w.find('.enlace').exists()).toBe(false)
    w.unmount()
  })
  it('usa la única deuda disponible cuando se abre el detalle sin contexto', async () => {
    const w = mount(GestionesTab, { props: { deudas: [deudas[0]!] } })
    await flushPromises()
    expect(api.obtenerGestiones).toHaveBeenCalledWith(10, expect.any(AbortSignal))
    w.unmount()
  })
  it('descarta una respuesta anterior que llega después de cambiar de deuda', async () => {
    let resolver!: (value: GestionResponse[]) => void
    vi.mocked(api.obtenerGestiones).mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolver = r
        }),
    )
    const w = montar()
    await flushPromises()
    await w.setProps({ deudaInicialId: 20 })
    await flushPromises()
    resolver([gestion(10, 'Nota deuda anterior')])
    await flushPromises()
    expect(w.text()).not.toContain('Nota deuda anterior')
    expect(w.findAll('.gestion')).toHaveLength(1)
    w.unmount()
  })
  it('guarda una sola vez, muestra el nuevo registro y notifica el contador', async () => {
    let resolver!: (value: GestionResponse) => void
    vi.mocked(api.guardarGestion).mockReturnValue(
      new Promise((r) => {
        resolver = r
      }),
    )
    const w = montar()
    await flushPromises()
    await w.get('.enlace').trigger('click')
    await w.get('#gestion-resultado').setValue('EXITOSA')
    await w.get('#gestion-observacion').setValue('Nueva nota')
    await w.get('form').trigger('submit')
    await w.get('form').trigger('submit')
    expect(api.guardarGestion).toHaveBeenCalledTimes(1)
    expect(api.guardarGestion).toHaveBeenCalledWith({
      deudaId: 10,
      accionId: 2,
      resultado: 'EXITOSA',
      observacion: 'Nueva nota',
    })
    expect(w.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    resolver({ ...gestion(10, 'Nueva nota'), id: 99 })
    await flushPromises()
    expect(w.text()).toContain('Gestión registrada correctamente.')
    expect(w.findAll('.gestion')).toHaveLength(2)
    expect(w.emitted('registrada')).toEqual([[10]])
    expect(w.find('form').exists()).toBe(false)
    w.unmount()
  })
  it('mantiene las notas y permite reintentar ante un fallo de guardado', async () => {
    vi.mocked(api.guardarGestion).mockRejectedValue(new Error('Sin conexión'))
    const w = montar()
    await flushPromises()
    await w.get('.enlace').trigger('click')
    await w.get('#gestion-resultado').setValue('PENDIENTE')
    await w.get('#gestion-observacion').setValue('Conservar nota')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.get('textarea').element.value).toBe('Conservar nota')
    expect(w.text()).toContain('No se pudo guardar')
    expect(w.emitted('registrada')).toBeUndefined()
    w.unmount()
  })
  it('cancelar no envía ni agrega gestiones', async () => {
    const w = montar()
    await flushPromises()
    await w.get('.enlace').trigger('click')
    await w.get('form button[type="button"]').trigger('click')
    expect(api.guardarGestion).not.toHaveBeenCalled()
    expect(w.find('form').exists()).toBe(false)
    w.unmount()
  })
  it('sin acciones informa el motivo y no habilita el formulario', async () => {
    vi.mocked(api.obtenerAccionesDisponibles).mockResolvedValue([])
    const w = montar()
    await flushPromises()
    expect(w.text()).toContain('No hay acciones disponibles')
    expect(w.find('.enlace').exists()).toBe(false)
    w.unmount()
  })
  it('un fallo al cargar muestra reintento y no un historial vacío engañoso', async () => {
    vi.mocked(api.obtenerGestiones).mockRejectedValueOnce(new Error('Sin conexión'))
    const w = montar()
    await flushPromises()
    expect(w.text()).toContain('No se pudieron cargar las gestiones')
    await w.get('.alerta button').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Nota inicial')
    w.unmount()
  })
  it.each(['ADMINISTRADOR', 'ANALISTA'])('el rol %s no puede registrar gestiones', async (rol) => {
    localStorage.setItem('user', JSON.stringify({ id: 1, username: 'usuario', roles: [rol] }))
    const w = montar()
    await flushPromises()
    expect(w.find('.enlace').exists()).toBe(false)
    expect(w.find('form').exists()).toBe(false)
    expect(api.guardarGestion).not.toHaveBeenCalled()
    w.unmount()
  })
  it('Administrador con Notificador conserva el registro de gestiones', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 1, username: 'mixto', roles: ['ADMINISTRADOR', 'NOTIFICADOR'] }),
    )
    const w = montar()
    await flushPromises()
    expect(w.find('.enlace').exists()).toBe(true)
    await w.get('.enlace').trigger('click')
    expect(w.find('form').exists()).toBe(true)
    w.unmount()
  })
})

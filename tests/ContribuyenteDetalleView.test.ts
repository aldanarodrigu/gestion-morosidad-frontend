import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { mount, flushPromises, RouterLinkStub, enableAutoUnmount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import ContribuyenteDetalleView from '../src/modules/contribuyentes/views/ContribuyenteDetalleView.vue'
import GestionesTab from '../src/modules/contribuyentes/components/GestionesTab.vue'
import DatosContactoTab from '../src/modules/contribuyentes/components/DatosContactoTab.vue'
import * as contribuyentes from '../src/modules/contribuyentes/services/contribuyenteService'
import * as gestiones from '../src/modules/contribuyentes/services/gestionService'
import { deuda } from './carteraFixtures'
import type { DeudaApi } from '../src/modules/cartera/types/cartera'

enableAutoUnmount(afterEach)
const route = reactive({ params: { contribuyenteId: '405' }, query: {} as Record<string, string> })
vi.mock('vue-router', () => ({ useRoute: () => route }))
vi.mock('../src/modules/contribuyentes/services/contribuyenteService', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../src/modules/contribuyentes/services/contribuyenteService')
  >()),
  obtenerDeudasPorContribuyenteId: vi.fn(),
}))
vi.mock('../src/modules/contribuyentes/services/gestionService')
const deudas: DeudaApi[] = ['82461', '81613', '81619'].map((cm, indice) => ({
  ...deuda((indice + 1) * 10, '90000668'),
  contribuyenteId: 405,
  contribuyente: { cm, nombre: 'Lucia Valentina Luna Nunez', documento: '90000668' },
  padron: { cm, numeroPadron: String(100000 + indice) },
  importe: (indice + 1) * 100,
}))
function montar() {
  return mount(ContribuyenteDetalleView, {
    global: {
      plugins: [createPinia()],
      stubs: {
        RouterLink: RouterLinkStub,
        DeudasTab: true,
        DatosContactoTab: { props: ['cm'], template: '<div>Contactos</div>' },
      },
    },
  })
}
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  localStorage.setItem(
    'user',
    JSON.stringify({ id: 1, username: 'operador', roles: ['NOTIFICADOR'] }),
  )
  route.query = { deuda: '20' }
  vi.mocked(contribuyentes.obtenerDeudasPorContribuyenteId).mockResolvedValue(
    deudas.map((d) => ({ ...d })),
  )
  vi.mocked(gestiones.obtenerGestiones).mockResolvedValue([])
  vi.mocked(gestiones.obtenerAccionesDisponibles).mockResolvedValue([
    { id: 1, nombre: 'Llamada', activo: true },
  ])
})
describe('CM de la deuda seleccionada en el detalle', () => {
  it('la cabecera y Gestiones usan la deuda de cartera aunque no sea la primera, conservando el total del contribuyente', async () => {
    const w = montar()
    await flushPromises()
    expect(w.get('.resumen .meta').text()).toBe('CM 81613')
    expect(w.get('.contexto-deuda').text()).toContain('CM 81613')
    expect(w.get('.resumen').text()).not.toContain('82461')
    expect(gestiones.obtenerGestiones).toHaveBeenCalledWith(20, expect.any(AbortSignal))
    expect(gestiones.obtenerGestiones).not.toHaveBeenCalledWith(10, expect.anything())
    expect(w.get('.deuda-monto').text()).toContain('600,00')
    expect(w.get('.resumen').text()).toContain('Lucia Valentina Luna Nunez')
    w.unmount()
  })
  it('cambia ambos CM y el historial al abrir otra deuda del mismo contribuyente', async () => {
    const w = montar()
    await flushPromises()
    route.query = { deuda: '30' }
    await flushPromises()
    expect(w.get('.resumen .meta').text()).toBe('CM 81619')
    expect(w.get('.contexto-deuda').text()).toContain('CM 81619')
    expect(gestiones.obtenerGestiones).toHaveBeenLastCalledWith(30, expect.any(AbortSignal))
    expect(contribuyentes.obtenerDeudasPorContribuyenteId).toHaveBeenCalledTimes(1)
    w.unmount()
  })
  it('admite enlaces anteriores con deudaId para cabecera e historial', async () => {
    route.query = { deudaId: '20' }
    const w = montar()
    await flushPromises()
    expect(w.get('.resumen .meta').text()).toBe('CM 81613')
    expect(w.get('.contexto-deuda').text()).toContain('CM 81613')
    expect(gestiones.obtenerGestiones).toHaveBeenCalledWith(20, expect.any(AbortSignal))
    w.unmount()
  })
  it('si llegan los dos parámetros usa deuda de forma consistente', async () => {
    route.query = { deuda: '20', deudaId: '10' }
    const w = montar()
    await flushPromises()
    expect(w.get('.resumen .meta').text()).toBe('CM 81613')
    expect(w.get('.contexto-deuda').text()).toContain('CM 81613')
    expect(gestiones.obtenerGestiones).not.toHaveBeenCalledWith(10, expect.anything())
    w.unmount()
  })
  it.each([{}, { deuda: '999' }, { deuda: 'incorrecta' }])(
    'sin una deuda válida no muestra un CM arbitrario ni consulta su historial: %j',
    async (query) => {
      route.query = query as Record<string, string>
      const w = montar()
      await flushPromises()
      expect(w.find('.resumen .meta').exists()).toBe(false)
      expect(w.text()).toContain('Volvé a la cartera')
      expect(gestiones.obtenerGestiones).not.toHaveBeenCalled()
      await w.findAll('.pestanas button')[2]!.trigger('click')
      expect(w.findComponent(DatosContactoTab).props('cm')).toBe('82461')
      w.unmount()
    },
  )
  it('si solo hay una deuda la cabecera y el historial la toman automáticamente', async () => {
    route.query = {}
    vi.mocked(contribuyentes.obtenerDeudasPorContribuyenteId).mockResolvedValue([deudas[1]!])
    const w = montar()
    await flushPromises()
    expect(w.get('.resumen .meta').text()).toBe('CM 81613')
    expect(w.get('.contexto-deuda').text()).toContain('CM 81613')
    expect(gestiones.obtenerGestiones).toHaveBeenCalledWith(20, expect.any(AbortSignal))
    w.unmount()
  })
  it('guarda la gestión en la deuda indicada por el CM de la cabecera', async () => {
    vi.mocked(gestiones.guardarGestion).mockResolvedValue({
      id: 1,
      deudaId: 20,
      accionId: 1,
      accionNombre: 'Llamada',
      resultado: 'RESPONDIO',
      observacion: null,
      fecha: '2026-10-14T12:00:00',
      usuarioId: 1,
      usuarioNombre: 'operador',
      cm: '81613',
      numeroPadron: '100001',
      tributos: [],
    })
    const w = montar()
    await flushPromises()
    const tab = w.getComponent(GestionesTab)
    await tab.get('.enlace').trigger('click')
    await tab.get('#gestion-resultado').setValue('RESPONDIO')
    await tab.get('form').trigger('submit')
    await flushPromises()
    expect(gestiones.guardarGestion).toHaveBeenCalledWith(expect.objectContaining({ deudaId: 20 }))
    expect(w.get('.resumen .meta').text()).toBe('CM 81613')
    expect(w.get('.contexto-deuda').text()).toContain('CM 81613')
    w.unmount()
  })
})

describe('segmento del resumen con distintos PadTipo', () => {
  it('muestra la mora más avanzada aunque no sea la deuda más antigua ni la seleccionada', async () => {
    const datos: DeudaApi[] = deudas.map((d, indice) => ({
      ...d,
      padron: { ...d.padron, tipoPadron: ['CIU', 'PAT', 'CIR'][indice] },
      diasAtraso: [100, 50, 75][indice]!,
      deudaDesde: ['2026-07-08', '2026-08-27', '2026-08-02'][indice]!,
      segmentoMora: [
        { id: 1, nombre: 'Mora Temprana', descripcion: '', orden: 1 },
        { id: 99, nombre: 'Mora Tardía', descripcion: '', orden: 3 },
        { id: 2, nombre: 'Mora Inicial', descripcion: '', orden: 2 },
      ][indice]!,
    }))
    route.query = { deuda: '10' }
    vi.mocked(contribuyentes.obtenerDeudasPorContribuyenteId).mockResolvedValue(datos)
    const w = montar()
    await flushPromises()
    expect(w.get('.resumen .segmento-badge').text()).toBe('Mora Tardía')
    expect(w.get('.resumen .segmento-badge').classes()).toContain('tardia')
    expect(w.findAll('.resumen .stat dd')[0]!.text()).toBe('100 días')
    expect(w.findAll('.resumen .stat dd')[1]!.text()).toBe('08/07/2026')
    expect(w.get('.deuda-monto').text()).toContain('600,00')
    expect(w.get('.resumen .meta').text()).toBe('CM 82461')
    expect(w.get('.contexto-deuda').text()).toContain('CM 82461')
    expect(gestiones.obtenerGestiones).toHaveBeenCalledWith(10, expect.any(AbortSignal))
    route.query = { deuda: '30' }
    await flushPromises()
    expect(w.get('.resumen .segmento-badge').text()).toBe('Mora Tardía')
    expect(w.get('.resumen .meta').text()).toBe('CM 81619')
    w.unmount()
  })
  it.each([true, false])(
    'maneja deudas sin segmento: existe un segmento informado=%s',
    async (tieneSegmento) => {
      const datos = [
        { ...deudas[0]!, diasAtraso: 200, segmentoMora: null },
        {
          ...deudas[1]!,
          diasAtraso: 50,
          segmentoMora: tieneSegmento
            ? { id: 3, nombre: 'Mora Tardía', descripcion: '', orden: 3 }
            : null,
        },
      ]
      vi.mocked(contribuyentes.obtenerDeudasPorContribuyenteId).mockResolvedValue(datos)
      const w = montar()
      await flushPromises()
      expect(w.get('.resumen .segmento-badge').text()).toBe(
        tieneSegmento ? 'Mora Tardía' : 'Sin segmento',
      )
      expect(w.findAll('.resumen .stat dd')[0]!.text()).toBe('200 días')
      w.unmount()
    },
  )
})

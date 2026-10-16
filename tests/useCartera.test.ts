import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { reactive, defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { useCartera } from '../src/modules/cartera/composables/useCartera'
import * as api from '../src/modules/cartera/services/carteraService'
const route = reactive<{ path: string; query: Record<string, string> }>({
  path: '/cartera',
  query: {},
})
const replace = vi.fn()
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => ({ replace }) }))
vi.mock('../src/modules/cartera/services/carteraService')
let estado: ReturnType<typeof useCartera>
function montar() {
  return mount(
    defineComponent({
      setup() {
        estado = useCartera()
        return () => null
      },
    }),
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  route.query = {}
  vi.mocked(api.obtenerCarteraAgrupada).mockResolvedValue({
    contenido: [],
    pagina: 0,
    tamanio: 20,
    totalElementos: 40,
    totalPaginas: 2,
  })
  vi.mocked(api.obtenerCartera).mockResolvedValue({
    contenido: [],
    pagina: 0,
    tamanio: 20,
    totalElementos: 60,
    totalPaginas: 3,
  })
})
afterEach(() => vi.useRealTimers())
describe('checkbox de agrupación', () => {
  it('restaura el origen y lo mantiene al cambiar de vista', async () => {
    route.query = { origen: 'sucive' }
    const w = montar()
    await flushPromises()
    expect(api.obtenerCartera).toHaveBeenLastCalledWith(0, 20,
      expect.objectContaining({ origen: 'sucive' }), expect.any(AbortSignal))
    estado.filtros.value.agruparPor = true
    await vi.advanceTimersByTimeAsync(0)
    await flushPromises()
    expect(api.obtenerCarteraAgrupada).toHaveBeenLastCalledWith(0, 20,
      expect.objectContaining({ origen: 'sucive' }), expect.any(AbortSignal))
    expect(replace).toHaveBeenLastCalledWith({ query: { origen: 'sucive', agrupar: 'true' } })
    w.unmount()
  })
  it('arranca sin agrupar y al marcar consulta grupos, reinicia página y conserva la opción en URL', async () => {
    const w = montar()
    await flushPromises()
    expect(estado.filtros.value.agruparPor).toBe(false)
    expect(api.obtenerCartera).toHaveBeenCalledTimes(1)
    expect(api.obtenerCarteraAgrupada).not.toHaveBeenCalled()
    estado.cambiarPagina(1)
    await flushPromises()
    estado.filtros.value.agruparPor = true
    await vi.advanceTimersByTimeAsync(0)
    await flushPromises()
    expect(api.obtenerCarteraAgrupada).toHaveBeenCalledWith(
      0,
      20,
      expect.any(Object),
      expect.any(AbortSignal),
    )
    expect(estado.pagina.value).toBe(0)
    expect(estado.totalElementos.value).toBe(40)
    expect(replace).toHaveBeenLastCalledWith({ query: { agrupar: 'true' } })
    estado.filtros.value.agruparPor = false
    await vi.advanceTimersByTimeAsync(0)
    await flushPromises()
    expect(estado.totalElementos.value).toBe(60)
    expect(replace).toHaveBeenLastCalledWith({ query: {} })
    w.unmount()
  })
  it('restaura la agrupación activada y la página desde la URL', async () => {
    route.query = { agrupar: 'true', pagina: '2', q: '90000001' }
    const w = montar()
    await flushPromises()
    expect(estado.filtros.value.agruparPor).toBe(true)
    expect(api.obtenerCarteraAgrupada).toHaveBeenCalledWith(
      1,
      20,
      expect.objectContaining({ busqueda: '90000001' }),
      expect.any(AbortSignal),
    )
    expect(api.obtenerCartera).not.toHaveBeenCalled()
    w.unmount()
  })
  it('envía documento, segmento y PadTipo al modo agrupado y vuelve a primera página', async () => {
    route.query = { agrupar: 'true', pagina: '2' }
    const w = montar()
    await flushPromises()
    estado.filtros.value.segmento = 'tardia'
    estado.filtros.value.tipoPadron = 'CIU'
    await vi.advanceTimersByTimeAsync(0)
    estado.filtros.value.search = '90000001'
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    expect(api.obtenerCarteraAgrupada).toHaveBeenLastCalledWith(
      0,
      20,
      expect.objectContaining({ busqueda: '90000001', segmento: 'tardia', tipoPadron: 'CIU' }),
      expect.any(AbortSignal),
    )
    w.unmount()
  })
  it('ignora la respuesta agrupada anterior si ya se pasó al modo individual', async () => {
    route.query = { agrupar: 'true' }
    let resolver!: (value: Awaited<ReturnType<typeof api.obtenerCarteraAgrupada>>) => void
    vi.mocked(api.obtenerCarteraAgrupada).mockReturnValueOnce(new Promise((r) => (resolver = r)))
    const w = montar()
    estado.filtros.value.agruparPor = false
    await vi.advanceTimersByTimeAsync(0)
    await flushPromises()
    resolver({ contenido: [], pagina: 0, tamanio: 20, totalElementos: 999, totalPaginas: 99 })
    await flushPromises()
    expect(estado.totalElementos.value).toBe(60)
    expect(estado.grupos.value).toEqual([])
    expect(estado.cargando.value).toBe(false)
    w.unmount()
  })
  it.each([false, true])(
    'restaura y envía contacto en modo agrupado=%s, reiniciando la página al cambiarlo',
    async (agrupada) => {
      route.query = { contacto: 'sin', pagina: '2', ...(agrupada ? { agrupar: 'true' } : {}) }
      const w = montar()
      await flushPromises()
      const consulta = agrupada ? api.obtenerCarteraAgrupada : api.obtenerCartera
      expect(consulta).toHaveBeenLastCalledWith(
        1,
        20,
        expect.objectContaining({ contacto: 'sin' }),
        expect.any(AbortSignal),
      )
      estado.filtros.value.contacto = 'con'
      await vi.advanceTimersByTimeAsync(0)
      await flushPromises()
      expect(consulta).toHaveBeenLastCalledWith(
        0,
        20,
        expect.objectContaining({ contacto: 'con' }),
        expect.any(AbortSignal),
      )
      expect(estado.pagina.value).toBe(0)
      expect(replace).toHaveBeenLastCalledWith({
        query: { contacto: 'con', ...(agrupada ? { agrupar: 'true' } : {}) },
      })
      estado.filtros.value.contacto = ''
      await vi.advanceTimersByTimeAsync(0)
      await flushPromises()
      expect(consulta).toHaveBeenLastCalledWith(
        0,
        20,
        expect.objectContaining({ contacto: '' }),
        expect.any(AbortSignal),
      )
      expect(replace).toHaveBeenLastCalledWith({ query: agrupada ? { agrupar: 'true' } : {} })
      w.unmount()
    },
  )
})

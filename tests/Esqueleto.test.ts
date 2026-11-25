import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { DEMORA_ESQUELETO_MS, useEsqueleto } from '../src/shared/composables/useEsqueleto'
import SkeletonFilas from '../src/shared/components/esqueleto/SkeletonFilas.vue'
import CancelacionesView from '../src/modules/cancelaciones/views/CancelacionesView.vue'
import { obtenerCancelaciones, obtenerMotivosCancelaciones } from '../src/modules/cancelaciones/services/cancelacionService'
import type { PaginaCancelaciones } from '../src/modules/cancelaciones/services/cancelacionService'

vi.mock('../src/modules/cancelaciones/services/cancelacionService')
enableAutoUnmount(afterEach)

function montarComposable(cargando: ReturnType<typeof ref<boolean>>) {
  let mostrar!: ReturnType<typeof useEsqueleto>
  mount(defineComponent({ setup() { mostrar = useEsqueleto(() => !!cargando.value); return () => h('div') } }))
  return () => mostrar.value
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  setActivePinia(createPinia())
  vi.mocked(obtenerMotivosCancelaciones).mockResolvedValue([])
})
afterEach(() => {
  vi.useRealTimers()
  vi.resetAllMocks()
})

describe('useEsqueleto', () => {
  it('no muestra el esqueleto si la carga termina antes de la demora', async () => {
    const cargando = ref(true)
    const mostrar = montarComposable(cargando)
    await vi.advanceTimersByTimeAsync(DEMORA_ESQUELETO_MS - 50)
    cargando.value = false
    await vi.advanceTimersByTimeAsync(500)
    expect(mostrar()).toBe(false)
  })

  it('lo muestra en cargas lentas y lo oculta apenas terminan', async () => {
    const cargando = ref(true)
    const mostrar = montarComposable(cargando)
    expect(mostrar()).toBe(false)
    await vi.advanceTimersByTimeAsync(DEMORA_ESQUELETO_MS)
    expect(mostrar()).toBe(true)
    cargando.value = false
    await flushPromises()
    expect(mostrar()).toBe(false)
  })
})

describe('SkeletonFilas', () => {
  it('genera la cantidad de filas y columnas pedida, oculta para lectores de pantalla', () => {
    const w = mount({ components: { SkeletonFilas }, template: '<table><tbody><SkeletonFilas :columnas="4" :filas="3" /></tbody></table>' })
    const filas = w.findAll('tr')
    expect(filas).toHaveLength(3)
    expect(filas.every((f) => f.attributes('aria-hidden') === 'true')).toBe(true)
    expect(filas[0]!.findAll('td')).toHaveLength(4)
  })
})

describe('esqueleto en Cancelaciones', () => {
  const pagina = (totalElementos: number): PaginaCancelaciones => ({
    contenido: totalElementos ? [{ id: 1, origen: 'INTENDENCIA', cm: '9', numeroCobro: '77', numeroPadron: '5',
      persona: 'Ana', documento: null, fechaCobro: '2026-11-20', importeTotal: 10, motivo: 'PAGO' }] : [],
    pagina: 0, totalPaginas: 1, totalElementos,
  })

  it('muestra filas esqueleto con el encabezado real mientras la consulta demora', async () => {
    let responder!: (p: PaginaCancelaciones) => void
    vi.mocked(obtenerCancelaciones).mockReturnValue(new Promise((r) => { responder = r }))
    const w = mount(CancelacionesView)
    await w.vm.$nextTick()
    const panel = w.get('[aria-label="Cancelaciones registradas"]')
    expect(panel.attributes('aria-busy')).toBe('true')
    expect(w.find('.fila-esqueleto').exists()).toBe(false)

    await vi.advanceTimersByTimeAsync(DEMORA_ESQUELETO_MS)
    expect(w.findAll('.fila-esqueleto')).toHaveLength(20)
    expect(w.get('thead').text()).toContain('Importe del cobro')
    expect(w.text()).toContain('Cargando cancelaciones')

    responder(pagina(1))
    await flushPromises()
    expect(w.find('.fila-esqueleto').exists()).toBe(false)
    expect(w.get('tbody').text()).toContain('77')
    expect(panel.attributes('aria-busy')).toBe('false')
  })

  it('mantiene el estado vacío y el de error cuando la carga termina', async () => {
    vi.mocked(obtenerCancelaciones).mockResolvedValueOnce(pagina(0))
    const w = mount(CancelacionesView)
    await flushPromises()
    expect(w.text()).toContain('No hay cancelaciones registradas')
    expect(w.find('.fila-esqueleto').exists()).toBe(false)

    vi.mocked(obtenerCancelaciones).mockRejectedValueOnce(new Error('fallo'))
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.get('[role="alert"]').text()).toContain('No se pudieron cargar')
  })
})

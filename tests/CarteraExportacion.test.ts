import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import CarteraView from '../src/modules/cartera/views/CarteraView.vue'
import { exportarCartera, obtenerTiposPadron } from '../src/modules/cartera/services/carteraService'

vi.mock('../src/modules/cartera/services/carteraService', () => ({ exportarCartera: vi.fn(), obtenerTiposPadron: vi.fn() }))
vi.mock('../src/modules/cartera/composables/useCartera', () => ({
  useCartera: () => ({
    cartera: ref([]), grupos: ref([]), cargando: ref(false), error: ref(''), pagina: ref(5),
    totalElementos: ref(1000), totalPaginas: ref(50), cargar: vi.fn(), cambiarPagina: vi.fn(),
    filtros: ref({ search: '001', segmento: 'inicial', tipoPadron: 'CIU', origen: 'intendencia',
      contacto: 'sin', agruparPor: true, ordenarPor: 'nombre' }),
  }),
}))
function montar() {
  return mount(CarteraView, { global: { stubs: {
    MorosidadFilters: { props: ['exportando'], emits: ['export'],
      template: `<button :disabled="exportando" @click="$emit('export')">Exportar</button>` },
    CarteraTable: true, CarteraAgrupadaTable: true,
  } } })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(obtenerTiposPadron).mockResolvedValue(['CIU', 'CIR'])
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:archivo')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('descarga Excel de cartera', () => {
  it('descarga XLSX con filtros actuales, bloquea duplicados y libera el archivo', async () => {
    vi.useFakeTimers()
    let completar!: (b: Blob) => void
    vi.mocked(exportarCartera).mockReturnValue(new Promise(resolve => { completar = resolve }))
    const w = montar()
    await w.get('button').trigger('click')
    await flushPromises()
    await w.get('[aria-label="Segmento de mora a exportar"]').setValue('inicial')
    await w.get('[aria-label="PadTipo a exportar"]').setValue('CIU')
    await w.get('[aria-label="Origen a exportar"]').setValue('intendencia')
    await w.get('form').trigger('submit')
    expect(w.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(w.get('[role="status"]').text()).toContain('todas las filas')
    expect(exportarCartera).toHaveBeenCalledExactlyOnceWith({
      segmento: 'inicial', tipoPadron: 'CIU', origen: 'intendencia', ordenarPor: 'nombre',
    }, true)
    const archivo = new Blob(['excel'])
    completar(archivo)
    await flushPromises()
    expect(URL.createObjectURL).toHaveBeenCalledWith(archivo)
    const click = vi.mocked(HTMLAnchorElement.prototype.click)
    expect(click.mock.instances[0]?.download).toBe('cartera-morosidad.xlsx')
    expect(w.get('button').attributes('disabled')).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1000)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:archivo')
    w.unmount()
  })
  it('ante error informa y permite reintentar sin descargar un archivo inválido', async () => {
    vi.mocked(exportarCartera).mockRejectedValue(new Error('fallo'))
    const w = montar()
    await w.get('button').trigger('click')
    await flushPromises()
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.get('[role="alert"]').text()).toContain('No se pudo exportar')
    expect(w.get('button').attributes('disabled')).toBeUndefined()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    w.unmount()
  })
})


describe('filtros opcionales del Excel', () => {
  it.each([
    ['', '', ''],
    ['temprana', '', ''],
    ['', 'CIR', ''],
    ['', '', 'sucive'],
    ['tardia', 'CIU', 'intendencia'],
  ])('exporta segmento=%s PadTipo=%s origen=%s sin heredar filtros ocultos del listado', async (segmento, tipoPadron, origen) => {
    vi.mocked(exportarCartera).mockResolvedValue(new Blob(['excel']))
    const w = montar()
    await w.get('button').trigger('click')
    await flushPromises()
    expect(exportarCartera).not.toHaveBeenCalled()
    await w.get('[aria-label="Segmento de mora a exportar"]').setValue(segmento)
    await w.get('[aria-label="PadTipo a exportar"]').setValue(tipoPadron)
    await w.get('[aria-label="Origen a exportar"]').setValue(origen)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(exportarCartera).toHaveBeenCalledExactlyOnceWith({ segmento, tipoPadron, origen, ordenarPor: 'nombre' }, true)
    expect(w.find('form').exists()).toBe(false)
    w.unmount()
  })

  it('limpia los tres filtros y cancela sin descargar', async () => {
    const w = montar()
    await w.get('button').trigger('click')
    await flushPromises()
    for (const [label, valor] of [['Segmento de mora', 'tardia'], ['PadTipo', 'CIU'], ['Origen', 'sucive']]) {
      await w.get(`[aria-label="${label} a exportar"]`).setValue(valor)
    }
    const limpiar = w.findAll('button').find(b => b.text() === 'Limpiar filtros')!
    await limpiar.trigger('click')
    for (const select of w.findAll('select')) expect((select.element as HTMLSelectElement).value).toBe('')
    await w.findAll('button').find(b => b.text() === 'Cancelar')!.trigger('click')
    expect(w.find('form').exists()).toBe(false)
    expect(exportarCartera).not.toHaveBeenCalled()
    w.unmount()
  })

  it('permite reintentar el catálogo de PadTipo si falla', async () => {
    vi.mocked(obtenerTiposPadron).mockRejectedValueOnce(new Error('fallo'))
    const w = montar()
    await w.get('button').trigger('click')
    await flushPromises()
    expect(w.get('[role="alert"]').text()).toContain('PadTipo')
    expect(w.get('[aria-label="PadTipo a exportar"]').attributes('disabled')).toBeDefined()
    await w.findAll('button').find(b => b.text() === 'Reintentar')!.trigger('click')
    await flushPromises()
    expect(w.get('[aria-label="PadTipo a exportar"]').attributes('disabled')).toBeUndefined()
    expect(w.findAll('option').some(o => o.text() === 'CIU')).toBe(true)
    w.unmount()
  })
})

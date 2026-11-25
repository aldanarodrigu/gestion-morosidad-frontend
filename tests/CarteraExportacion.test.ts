import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../src/modules/autenticacion/stores/auth.store'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import CarteraView from '../src/modules/cartera/views/CarteraView.vue'
import { exportarCartera, obtenerTiposPadron } from '../src/modules/cartera/services/carteraService'

vi.mock('../src/modules/cartera/services/carteraService', () => ({ exportarCartera: vi.fn(), obtenerTiposPadron: vi.fn() }))
const filtrosListado = ref({ search: '001', segmento: 'inicial', tipoPadron: 'CIU', origen: 'intendencia',
  multa: '', contacto: 'sin', agruparPor: true, ordenarPor: 'nombre' as const })
vi.mock('../src/modules/cartera/composables/useCartera', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/modules/cartera/composables/useCartera')>()),
  useCartera: () => ({
    cartera: ref([]), grupos: ref([]), cargando: ref(false), error: ref(''), pagina: ref(5),
    totalElementos: ref(1000), totalPaginas: ref(50), cargar: vi.fn(), cambiarPagina: vi.fn(),
    filtros: filtrosListado,
  }),
}))
function montar() {
  return mount(CarteraView, { global: { stubs: {
    MorosidadFilters: { name: 'MorosidadFilters', props: ['exportando', 'puedeExportar'], emits: ['export'],
      template: `<button v-if="puedeExportar" :disabled="exportando" @click="$emit('export')">Exportar</button>` },
    CarteraTable: true, CarteraAgrupadaTable: true,
  } } })
}

const FILTROS_API_LISTADO = {
  busqueda: '001', segmento: 'inicial', tipoPadron: 'CIU', origen: 'intendencia', contacto: 'sin', ordenarPor: 'nombre',
}

beforeEach(() => {
  vi.resetAllMocks()
 setActivePinia(createPinia())
 useAuthStore().user = {id:1,username:'analista',roles:['ANALISTA']}
  filtrosListado.value = { search: '001', segmento: 'inicial', tipoPadron: 'CIU', origen: 'intendencia',
    multa: '', contacto: 'sin', agruparPor: true, ordenarPor: 'nombre' }
  vi.mocked(obtenerTiposPadron).mockResolvedValue(['CIU', 'CIR'])
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:archivo')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('exportación de cartera', () => {
  it('ofrece XLSX por defecto y permite descargar CSV con los filtros del listado', async () => {
    vi.mocked(exportarCartera).mockResolvedValue(new Blob(['csv']))
    const w = montar()
    await w.get('button').trigger('click')
    await flushPromises()
    const formato = w.get('[aria-label="Formato de exportación"]')
    expect((formato.element as HTMLSelectElement).value).toBe('xlsx')
    await formato.setValue('csv')
    expect(w.get('button[type="submit"]').text()).toBe('Descargar CSV')
    expect(w.text()).toContain('sin hoja de resumen')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(exportarCartera).toHaveBeenCalledExactlyOnceWith(FILTROS_API_LISTADO, true, 'csv')
    expect(vi.mocked(HTMLAnchorElement.prototype.click).mock.instances[0]?.download).toBe('cartera-morosidad.csv')
    w.unmount()
  })
  it('descarga XLSX con filtros actuales, bloquea duplicados y libera el archivo', async () => {
    vi.useFakeTimers()
    let completar!: (b: Blob) => void
    vi.mocked(exportarCartera).mockReturnValue(new Promise(resolve => { completar = resolve }))
    const w = montar()
    await w.get('button').trigger('click')
    await flushPromises()
    await w.get('form').trigger('submit')
    expect(w.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(w.get('[role="status"]').text()).toContain('todas las filas')
    expect(exportarCartera).toHaveBeenCalledExactlyOnceWith(FILTROS_API_LISTADO, true, 'xlsx')
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

describe('filtros de la exportación', () => {
  it('muestra los filtros activos del listado y no exporta hasta confirmar', async () => {
    const w = montar()
    await w.get('button').trigger('click')
    await flushPromises()
    expect(exportarCartera).not.toHaveBeenCalled()
    const resumen = w.get('[aria-label="Filtros aplicados"]').text()
    for (const texto of ['«001»', 'Mora Inicial', 'CIU', 'Intendencia', 'Sin contacto']) expect(resumen).toContain(texto)
    w.unmount()
  })

  it('sigue los cambios del listado hechos con el panel abierto', async () => {
    vi.mocked(exportarCartera).mockResolvedValue(new Blob(['excel']))
    const w = montar()
    await w.get('button').trigger('click')
    filtrosListado.value = { ...filtrosListado.value, segmento: 'tardia', tipoPadron: '', agruparPor: false }
    await flushPromises()
    expect(w.get('[aria-label="Filtros aplicados"]').text()).toContain('Mora Tardía')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(exportarCartera).toHaveBeenCalledExactlyOnceWith(
      { ...FILTROS_API_LISTADO, segmento: 'tardia', tipoPadron: '' }, false, 'xlsx')
    expect(w.find('form').exists()).toBe(false)
    w.unmount()
  })

  it('sin filtros avisa que se exporta toda la cartera', async () => {
    vi.mocked(exportarCartera).mockResolvedValue(new Blob(['excel']))
    filtrosListado.value = { search: '', segmento: '', tipoPadron: '', origen: '', multa: '', contacto: '',
      agruparPor: false, ordenarPor: 'antiguedad' }
    const w = montar()
    await w.get('button').trigger('click')
    await flushPromises()
    expect(w.find('[aria-label="Filtros aplicados"]').exists()).toBe(false)
    expect(w.text()).toContain('toda la cartera')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(exportarCartera).toHaveBeenCalledExactlyOnceWith({ busqueda: '', segmento: '', tipoPadron: '', origen: '',
      contacto: '', ordenarPor: 'antiguedad' }, false, 'xlsx')
    w.unmount()
  })

  it('cancela sin descargar', async () => {
    const w = montar()
    await w.get('button').trigger('click')
    await flushPromises()
    await w.findAll('button').find(b => b.text() === 'Cancelar')!.trigger('click')
    expect(w.find('form').exists()).toBe(false)
    expect(exportarCartera).not.toHaveBeenCalled()
    w.unmount()
  })
})

describe('permisos de exportación', () => {
 it.each(['ADMINISTRADOR','NOTIFICADOR'])('oculta exportar para %s y rechaza eventos del panel', async rol => {
  useAuthStore().user!.roles=[rol]
  const w=montar(); await flushPromises()
  expect(w.findAll('button').some(b => b.text() === 'Exportar')).toBe(false)
  w.findComponent({name:'MorosidadFilters'}).vm.$emit('export')
  await flushPromises()
  expect(w.find('form').exists()).toBe(false)
  expect(exportarCartera).not.toHaveBeenCalled()
  w.unmount()
 })
 it('permite exportar teniendo Analista junto con otros roles', async () => {
  useAuthStore().user!.roles=['ADMINISTRADOR','NOTIFICADOR','ANALISTA']
  const w=montar(); await w.get('button').trigger('click'); await flushPromises()
  expect(w.find('form').exists()).toBe(true)
  w.unmount()
 })
})

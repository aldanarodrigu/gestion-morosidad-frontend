import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import MorosidadFilters from '../src/modules/cartera/components/MorosidadFilters.vue'
import type { CarteraFilters } from '../src/modules/cartera/components/MorosidadFilters.vue'
import { obtenerTiposPadron } from '../src/modules/cartera/services/carteraService'

vi.mock('../src/modules/cartera/services/carteraService', () => ({ obtenerTiposPadron: vi.fn() }))

const vacios: CarteraFilters = {
  search: '', segmento: '', tipoPadron: '', origen: '', multa: '', contacto: '',
  agruparPor: false, ordenarPor: 'antiguedad',
}

function montar(filtros: Partial<CarteraFilters> = {}) {
  const w = mount(MorosidadFilters, {
    props: {
      // Reactivo, como el ref de filtros que le pasa Cartera: el componente modifica sus campos.
      modelValue: reactive({ ...vacios, ...filtros }),
      'onUpdate:modelValue': (v: CarteraFilters) => w.setProps({ modelValue: v }),
    },
  })
  return w
}

const limpiar = (w: ReturnType<typeof montar>) => w.get('button.limpiar')

beforeEach(() => {
  vi.mocked(obtenerTiposPadron).mockResolvedValue(['CIU', 'CIR'])
})

describe('filtros de cartera', () => {
  it('cada filtro tiene una etiqueta visible asociada y «Todos» como primera opción', async () => {
    const w = montar()
    await flushPromises()
    const etiquetas = w.findAll('.etiqueta').map((e) => e.text())
    expect(etiquetas).toEqual(['Buscar', 'Segmento', 'PadTipo', 'Origen', 'Multa', 'Contacto'])
    for (const select of w.findAll('select')) {
      expect(select.findAll('option')[0]!.text()).toBe('Todos')
      // El nombre accesible sale de la etiqueta visible, no de la primera opción.
      const el = select.element as HTMLSelectElement
      const etiqueta = el.closest('label') ?? (el.id ? w.element.querySelector(`label[for="${el.id}"]`) : null)
      expect(etiqueta?.textContent?.trim()).toBeTruthy()
    }
  })

  it('sin filtros activos el botón no muestra contador y está deshabilitado', async () => {
    const w = montar()
    await flushPromises()
    expect(limpiar(w).text()).toBe('Limpiar filtros')
    expect(limpiar(w).attributes('disabled')).toBeDefined()
  })

  it('cuenta los filtros activos, incluida la búsqueda', async () => {
    const w = montar({ search: 'perez', origen: 'sucive', multa: 'con' })
    await flushPromises()
    expect(limpiar(w).text()).toBe('Limpiar filtros (3)')
    await w.get('select').setValue('tardia')
    expect(limpiar(w).text()).toBe('Limpiar filtros (4)')
  })

  it('limpia solo los filtros y conserva agrupar y ordenar', async () => {
    const w = montar({ search: 'perez', segmento: 'inicial', tipoPadron: 'CIU', contacto: 'sin',
      agruparPor: true, ordenarPor: 'importe' })
    await flushPromises()
    await limpiar(w).trigger('click')
    expect(w.props('modelValue')).toEqual({ ...vacios, agruparPor: true, ordenarPor: 'importe' })
    expect(limpiar(w).text()).toBe('Limpiar filtros')
  })
})

describe('filtros aplicados', () => {
  it('muestra una etiqueta por filtro activo con su valor legible', async () => {
    const w = montar({ search: 'perez', segmento: 'tardia', origen: 'sucive', tipoPadron: 'CIU' })
    await flushPromises()
    expect(w.findAll('.filtros-activos li').map((li) => li.text())).toEqual([
      'Búsqueda: «perez»', 'Segmento: Mora Tardía', 'PadTipo: CIU', 'Origen: SUCIVE',
    ])
  })

  it('cada etiqueta quita solo su filtro', async () => {
    const w = montar({ segmento: 'tardia', origen: 'sucive' })
    await flushPromises()
    await w.get('[aria-label="Quitar filtro Origen: SUCIVE"]').trigger('click')
    expect(w.props('modelValue')).toMatchObject({ segmento: 'tardia', origen: '' })
    expect(w.findAll('.filtros-activos li')).toHaveLength(1)
  })

  it('sin filtros no muestra la lista', async () => {
    const w = montar()
    await flushPromises()
    expect(w.find('.filtros-activos').exists()).toBe(false)
  })

  it('«Ordenar por» marca la opción activa', async () => {
    const w = montar()
    await flushPromises()
    const botones = w.findAll('.sort-button')
    await botones[1]!.trigger('click')
    expect(w.props('modelValue').ordenarPor).toBe('importe')
    expect(botones.map((b) => b.attributes('aria-pressed'))).toEqual(['false', 'true', 'false'])
  })
})

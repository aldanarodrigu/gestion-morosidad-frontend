import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import CarteraTable from '../src/modules/cartera/components/CarteraTable.vue'
import type { CarteraItem } from '../src/modules/cartera/types/cartera'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
enableAutoUnmount(afterEach)
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function item(id: number, accionesSugeridas: string[]): CarteraItem {
  return {
    id, contribuyenteId: id + 100, cm: String(id), numeroPadron: '1', tipoPadron: 'CIU', origen: 'Intendencia',
    contribuyente: 'Ana Alvarez', documento: '1', tributo: 'Contribución', codigosTributo: ['201'], deuda: 100,
    diasVencido: 30, segmento: 'Mora Inicial', convenio: false, contacto: 'Sin datos', accionesSugeridas, gestiones: 0,
  }
}

function montar(cartera: CarteraItem[]) {
  return mount(CarteraTable, {
    props: { cartera },
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  })
}

describe('acciones sugeridas', () => {
  it('«+N más» despliega el resto de las acciones en la celda, sin alert ni navegación', async () => {
    const alerta = vi.fn()
    vi.stubGlobal('alert', alerta)
    const w = montar([item(1, ['Llamada', 'Correo', 'Visita'])])
    const boton = w.get('.acciones-mas')
    expect(boton.text()).toBe('+2 más')
    expect(boton.attributes('aria-expanded')).toBe('false')
    expect(w.find('.acciones-resto').exists()).toBe(false)

    await boton.trigger('click')
    expect(alerta).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(boton.attributes('aria-expanded')).toBe('true')
    expect(w.findAll('.acciones-resto li').map((li) => li.text())).toEqual(['Correo', 'Visita'])
    expect(w.get(`#${boton.attributes('aria-controls')}`).exists()).toBe(true)
    expect(boton.text()).toBe('Ver menos')

    await boton.trigger('click')
    expect(w.find('.acciones-resto').exists()).toBe(false)
    expect(boton.text()).toBe('+2 más')
  })

  it('cada fila se despliega por separado y se cierran al cambiar la página', async () => {
    const w = montar([item(1, ['A', 'B']), item(2, ['C', 'D'])])
    await w.findAll('.acciones-mas')[1]!.trigger('click')
    expect(w.findAll('.acciones-resto')).toHaveLength(1)
    expect(w.get('.acciones-resto').text()).toBe('D')

    await w.setProps({ cartera: [item(3, ['E', 'F'])] })
    expect(w.find('.acciones-resto').exists()).toBe(false)
  })

  it('con una sola acción no muestra el botón', () => {
    const w = montar([item(1, ['Llamada'])])
    expect(w.find('.acciones-mas').exists()).toBe(false)
  })
})

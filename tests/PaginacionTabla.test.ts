import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PaginacionTabla from '../src/shared/components/PaginacionTabla.vue'

function montar(props: Partial<InstanceType<typeof PaginacionTabla>['$props']> = {}) {
  return mount(PaginacionTabla, {
    props: { pagina: 2, totalPaginas: 50, totalElementos: 1000, tamanio: 20, elementos: 'deudas', ...props },
  })
}

describe('PaginacionTabla', () => {
  it('muestra el rango visible y la página actual', () => {
    const w = montar()
    expect(w.get('.rango').text()).toBe('41–60 de 1.000 deudas')
    expect(w.get('.actual').text()).toBe('Página 3 de 50')
  })

  it('ofrece 20, 50 y 100 filas y avisa el tamaño elegido', async () => {
    const w = montar()
    const select = w.get('select')
    expect(select.findAll('option').map((o) => o.text())).toEqual(['20', '50', '100'])
    await select.setValue('50')
    expect(w.emitted('cambiarTamanio')).toEqual([[50]])
  })

  it('«Ir a página» pasa a la página pedida (desde 0) y limpia el campo', async () => {
    const w = montar()
    const input = w.get('input[type="number"]')
    await input.setValue('37')
    await w.get('form').trigger('submit')
    expect(w.emitted('cambiarPagina')).toEqual([[36]])
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it.each([
    ['999', 49],
    ['0', 0],
  ])('un número fuera de rango (%s) va a la última o la primera página', async (valor, esperada) => {
    const w = montar()
    await w.get('input[type="number"]').setValue(valor)
    await w.get('form').trigger('submit')
    expect(w.emitted('cambiarPagina')).toEqual([[esperada]])
  })

  it('no navega si se pide la página actual o el campo está vacío', async () => {
    const w = montar()
    await w.get('form').trigger('submit')
    await w.get('input[type="number"]').setValue('3')
    await w.get('form').trigger('submit')
    expect(w.emitted('cambiarPagina')).toBeUndefined()
  })

  it('con una sola página muestra el tamaño y el rango, sin navegación', () => {
    const w = montar({ pagina: 0, totalPaginas: 1, totalElementos: 35, tamanio: 50 })
    expect(w.find('select').exists()).toBe(true)
    expect(w.get('.rango').text()).toBe('1–35 de 35 deudas')
    expect(w.find('.navegacion').exists()).toBe(false)
  })

  it('deshabilita los controles mientras carga', () => {
    const w = montar({ deshabilitado: true })
    expect(w.get('select').attributes('disabled')).toBeDefined()
    expect(w.findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
  })
})

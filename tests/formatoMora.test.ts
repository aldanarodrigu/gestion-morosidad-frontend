import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { formatoImporte, formatoNumero } from '../src/shared/utils/formato'
import { nivelMoraPorNombre, nivelMoraPorOrden } from '../src/shared/utils/mora'
import EtiquetaMora from '../src/shared/components/EtiquetaMora.vue'

describe('formatos', () => {
  it('importes en pesos uruguayos con dos decimales', () => {
    expect(formatoImporte(12500.5)).toBe('$ 12.500,50')
    expect(formatoImporte(0)).toBe('$ 0,00')
  })
  it('números con separador de miles', () => {
    expect(formatoNumero(1000)).toBe('1.000')
    expect(formatoNumero(320)).toBe('320')
  })
})

describe('nivel de mora', () => {
  it.each([
    ['Mora Temprana', 'temprana'], ['mora inicial', 'inicial'], ['Mora Tardía', 'tardia'],
    ['Mora tardia', 'tardia'], ['', ''], [null, ''],
  ] as const)('por nombre %s → %s', (nombre, nivel) => expect(nivelMoraPorNombre(nombre)).toBe(nivel))

  it('por orden', () => {
    expect([1, 2, 3, 4, undefined].map((o) => nivelMoraPorOrden(o))).toEqual(['temprana', 'inicial', 'tardia', '', ''])
  })

  it('la etiqueta usa la clase del nivel, o «sin-segmento»', () => {
    expect(mount(EtiquetaMora, { props: { nivel: 'tardia' }, slots: { default: 'Mora Tardía' } }).classes()).toContain('tardia')
    expect(mount(EtiquetaMora, { props: { nivel: '' } }).classes()).toContain('sin-segmento')
  })
})

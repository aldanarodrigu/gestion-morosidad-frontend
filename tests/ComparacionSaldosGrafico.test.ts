import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Grafico from '../src/modules/comparacion/components/ComparacionSaldosGrafico.vue'
const etiquetas = { anterior: 'Primera', posterior: 'Segunda' }
describe('barras de saldos por cuenta', () => {
 it('distingue el origen y mantiene la misma escala entre ambas capturas', () => {
  const w = mount(Grafico, { props: { ...etiquetas, cuentas: [
   { cm:'1001', origen:'INTENDENCIA', antes:100, despues:50 },
   { cm:'1001', origen:'SUCIVE', antes:200, despues:0 },
  ] } })
  const filas = w.findAll('.cuenta-grafico')
  expect(filas[0]!.text()).toContain('SUCIVE')
  expect(filas[1]!.text()).toContain('Intendencia')
  expect(filas[0]!.findAll('.barra')[0]!.attributes('style')).toContain('100%')
  expect(filas[1]!.findAll('.barra')[1]!.attributes('style')).toContain('25%')
  expect(filas[0]!.findAll('.barra')[1]!.attributes('style')).toContain('0%')
  expect(w.text()).toContain('Anterior · Primera')
  expect(w.text()).toContain('Posterior · Segunda')
 })
 it('limita el gráfico a las diez mayores variaciones sin modificar los datos completos', () => {
  const cuentas = Array.from({length:12},(_,i)=>({cm:String(i),origen:'INTENDENCIA',antes:100,despues:100+i}))
  const w = mount(Grafico,{props:{...etiquetas,cuentas}})
  expect(w.findAll('.cuenta-grafico')).toHaveLength(10)
  expect(w.get('.limite').text()).toContain('12 cuentas')
  expect(w.findAll('.cuenta-grafico')[0]!.text()).toContain('CM 11')
  expect(cuentas[0]!.cm).toBe('0')
 })
 it('los saldos en cero no generan una escala inválida', () => {
  const w=mount(Grafico,{props:{...etiquetas,cuentas:[{cm:'1',origen:'INTENDENCIA',antes:0,despues:0}]}})
  for (const b of w.findAll('.barra')) expect(b.attributes('style')).toContain('0%')
  expect(w.html()).not.toContain('NaN')
 })
})

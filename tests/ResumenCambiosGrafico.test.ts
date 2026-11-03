import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Grafico from '../src/modules/comparacion/components/ResumenCambiosGrafico.vue'
describe('distribución de cambios de saldo', () => {
 it('cuenta cada cuenta en una sola categoría y separa saldo cero de disminuciones parciales', () => {
  const w = mount(Grafico, { props: { cuentas: [
   { antes: 0, despues: 100 }, { antes: 100, despues: 50 }, { antes: 20, despues: 0 },
   { antes: 30, despues: 30 }, { antes: 0, despues: 0 },
  ] } })
  expect(w.findAll('.cantidad-categoria').map(n=>n.text())).toEqual(['1','1','1','2'])
  expect(w.findAll('.porcentaje-categoria').map(n=>n.text())).toEqual(['20 %','20 %','20 %','40 %'])
  expect(w.get('.total-cuentas').text()).toContain('5 cuentas')
 })
 it('no inventa estadísticas cuando no hay cuentas seleccionadas', () => {
  const w=mount(Grafico,{props:{cuentas:[]}})
  expect(w.findAll('.categoria')).toHaveLength(0)
  expect(w.get('.vacio').text()).toContain('No hay cuentas')
  expect(w.html()).not.toContain('NaN')
 })
 it('recalcula la distribución al cambiar la selección', async () => {
  const w=mount(Grafico,{props:{cuentas:[{antes:10,despues:0}]}})
  await w.setProps({cuentas:[{antes:5,despues:10},{antes:1,despues:2}]})
  expect(w.findAll('.cantidad-categoria').map(n=>n.text())).toEqual(['2','0','0','0'])
  expect(w.findAll('.porcentaje-categoria')[0]!.text()).toBe('100 %')
 })
})

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Fecha from '../src/shared/components/FechaSincronizacion.vue'
describe('fecha de sincronización', () => {
  it('conserva la hora local informada por la API y agrupa fechas del mismo minuto', () => {
    const w = mount(Fecha, { props: { etiqueta: 'Datos de esta página sincronizados', fechas: ['2026-10-27T17:05:35.123', '2026-10-27T17:05:58'] } })
    expect(w.text()).toBe('Datos de esta página sincronizados: 27/10/2026 17:05')
    expect(w.findAll('time')).toHaveLength(1)
  })
  it('muestra un rango sin presentar el registro más nuevo como actualización de toda la página', () => {
    const w = mount(Fecha, { props: { etiqueta: 'Página', fechas: ['2026-10-30T18:30:00', '2026-10-27T17:05:00', null] } })
    expect(w.text()).toContain('entre 27/10/2026 17:05 y 30/10/2026 18:30')
    expect(w.text()).toContain('1 registro sin fecha')
  })
  it('no inventa fecha para registros nulos o inválidos', () => {
    const w = mount(Fecha, { props: { etiqueta: 'Padrón sincronizado', fechas: [null, undefined, 'incorrecta'] } })
    expect(w.text()).toBe('Padrón sincronizado: sin fecha informada')
    expect(w.find('time').exists()).toBe(false)
  })
})

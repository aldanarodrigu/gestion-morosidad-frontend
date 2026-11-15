import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Progreso from '../src/modules/configuracion/components/SincronizacionProgreso.vue'
import type { ProgresoSincronizacion } from '../src/modules/configuracion/services/sincronizacionService'
const base: ProgresoSincronizacion = {
  etapa: 'DEUDAS',
  paginasDescargadas: 55,
  paginaActual: 56,
  registrosDescargados: 55000,
  totalRegistros: null,
  totalPaginas: null,
  intento: 3,
  detalle: 'Reintentando página 56',
}
describe('avance de sincronización', () => {
  it('muestra datos confirmados sin inventar porcentaje ni tiempo restante', () => {
    const w = mount(Progreso, { props: { progreso: base, estado: 'EN_CURSO' } })
    expect(w.get('[role=progressbar]').attributes('aria-valuenow')).toBeUndefined()
    expect(w.find('.indeterminado').exists()).toBe(true)
    expect(w.text()).toContain('55.000')
    expect(w.text()).toContain('Consultando página 56')
    expect(w.text()).toContain('intento 3 de 3')
    expect(w.text()).toContain('aún no se puede calcular')
    expect(w.text()).not.toContain('%')
    expect(w.findAll('[aria-current=step]')).toHaveLength(1)
  })
  it('calcula porcentaje y restantes de la descarga cuando hay total conocido', () => {
    const w = mount(Progreso, {
      props: {
        progreso: {
          ...base,
          etapa: 'COBROS',
          paginasDescargadas: 1,
          paginaActual: 2,
          registrosDescargados: 1000,
          totalRegistros: 9214,
          totalPaginas: 10,
          intento: 1,
        },
        estado: 'EN_CURSO',
      },
    })
    expect(Number(w.get('[role=progressbar]').attributes('aria-valuenow'))).toBeCloseTo(
      (1000 / 9214) * 100,
    )
    expect(w.text()).toContain('10 % de esta descarga')
    expect(w.text()).toContain('8.214 registros · 9 páginas')
    expect(w.findAll('.hecha')).toHaveLength(1)
  })
  it('el guardado sigue en curso hasta que el backend confirma el final', () => {
    const w = mount(Progreso, {
      props: {
        progreso: {
          ...base,
          etapa: 'GUARDANDO',
          registrosDescargados: 22081,
          paginaActual: null,
          intento: 1,
        },
        estado: 'EN_CURSO',
      },
    })
    expect(w.text()).toContain('22.081 deudas para conciliar')
    expect(w.text()).toContain('Esperando la confirmación')
    expect(w.get('[role=progressbar]').attributes('aria-valuenow')).toBeUndefined()
    expect(w.findAll('.hecha')).toHaveLength(3)
  })
  it('solo marca el proceso completo cuando termina', () => {
    const w = mount(Progreso, {
      props: { progreso: { ...base, etapa: 'FINALIZADA' }, estado: 'COMPLETADA' },
    })
    expect(w.get('[role=progressbar]').attributes('aria-valuenow')).toBe('100')
    expect(w.findAll('.hecha')).toHaveLength(4)
    expect(w.find('.indeterminado').exists()).toBe(false)
    expect(w.text()).not.toContain('Restan')
  })
  it('detiene la animación y conserva el último avance si hay un error', () => {
    const w = mount(Progreso, { props: { progreso: base, estado: 'ERROR' } })
    expect(w.find('.indeterminado').exists()).toBe(false)
    expect(w.find('.detenida').exists()).toBe(true)
    expect(w.text()).toContain('55.000')
    expect(w.text()).toContain('Última página consultada 56')
    expect(w.text()).not.toContain('100 %')
  })
  it('reinicia el contador y el porcentaje al pasar a otra consulta', async () => {
    const w = mount(Progreso, {
      props: {
        progreso: { ...base, etapa: 'COBROS', totalRegistros: 55000, totalPaginas: 55 },
        estado: 'EN_CURSO',
      },
    })
    expect(w.get('[role=progressbar]').attributes('aria-valuenow')).toBe('100')
    await w.setProps({
      progreso: {
        ...base,
        etapa: 'CONTACTOS',
        paginasDescargadas: 0,
        registrosDescargados: 0,
        paginaActual: 1,
        intento: 1,
      },
    })
    expect(w.get('[role=progressbar]').attributes('aria-valuenow')).toBeUndefined()
    expect(w.text()).toContain('Descarga de contactos')
    expect(w.text()).not.toContain('55.000')
  })
})

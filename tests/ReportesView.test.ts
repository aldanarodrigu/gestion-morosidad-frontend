import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import Reportes from '../src/modules/reportes/views/ReportesView.vue'
import * as api from '../src/modules/reportes/services/reporteService'
import type { ReporteCartera } from '../src/modules/reportes/services/reporteService'
vi.mock('../src/modules/reportes/services/reporteService')
enableAutoUnmount(afterEach)
const reporte: ReporteCartera = {
 generado:'2026-11-03T20:10:00',totales:{importe:700.30,contribuyentes:4,padrones:35,deudas:35},
 porSegmento:[{id:87,nombre:'Mora Tardía',orden:3,cantidad:35,importe:700.30}],
 porTipo:[{tipo:'CIU',cantidad:35,importe:700.30}],
 resumen:[{origen:'SUCIVE',tipo:'CIU',personas:4,cantidad:35,importe:700.30}],
}
function montar(){return mount(Reportes,{global:{stubs:{RouterLink:true}}})}
beforeEach(()=>{
 vi.resetAllMocks()
 vi.mocked(api.obtenerReporte).mockResolvedValue(reporte)
 vi.mocked(api.obtenerCatalogosReporte).mockResolvedValue({tipos:['CIU','CIR'],segmentos:[{id:87,nombre:'Mora Tardía',orden:3}]})
})
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers()})
describe('reportes de la base real',()=>{
 it('muestra los totales del backend, sin calcularlos desde la página de cartera',async()=>{
  const w=montar();await flushPromises()
  expect(api.obtenerReporte).toHaveBeenCalledWith({origen:'',tipoPadron:'',segmento:''},expect.any(AbortSignal))
  expect(w.get('.indicadores').text()).toContain('700,30')
  expect(w.get('.indicadores').text()).toContain('35')
  expect(w.get('tbody').text()).toContain('SUCIVE')
  expect(w.text()).not.toContain('ficticios')
  expect(w.text()).not.toContain('Vista de ejemplo')
 })
 it('combina filtros con los IDs reales del catálogo y permite limpiarlos',async()=>{
  const w=montar();await flushPromises()
  const selects=w.findAll('select')
  await selects[0]!.setValue('SUCIVE');await selects[1]!.setValue('CIU');await selects[2]!.setValue('87');await flushPromises()
  expect(api.obtenerReporte).toHaveBeenLastCalledWith({origen:'SUCIVE',tipoPadron:'CIU',segmento:87},expect.any(AbortSignal))
  await w.get('.limpiar').trigger('click');await flushPromises()
  expect(api.obtenerReporte).toHaveBeenLastCalledWith({origen:'',tipoPadron:'',segmento:''},expect.any(AbortSignal))
 })
 it('sin resultados muestra cero sin inventar deudas',async()=>{
  vi.mocked(api.obtenerReporte).mockResolvedValue({...reporte,totales:{importe:0,contribuyentes:0,padrones:0,deudas:0},porSegmento:[],porTipo:[],resumen:[]})
  const w=montar();await flushPromises()
  expect(w.get('.sin-datos').text()).toContain('No hay deuda pendiente')
  expect(w.findAll('.fila-barra')).toHaveLength(0)
  expect(w.get('tfoot').text()).toContain('0,00')
 })
 it('ante un error no muestra ceros como datos reales y permite reintentar',async()=>{
  vi.mocked(api.obtenerReporte).mockRejectedValueOnce(new Error('error')).mockResolvedValueOnce(reporte)
  const w=montar();await flushPromises()
  expect(w.get('[role="alert"]').text()).toContain('No se pudo cargar')
  expect(w.find('.indicadores').exists()).toBe(false)
  await w.get('.mensaje-reporte button').trigger('click');await flushPromises()
  expect(w.get('.indicadores').text()).toContain('700,30')
 })
 it('no reemplaza el reporte actual con una respuesta antigua',async()=>{
  let terminar!: (r: ReporteCartera)=>void
  vi.mocked(api.obtenerReporte).mockReturnValueOnce(new Promise(resolve=>{terminar=resolve}))
  const w=montar();await flushPromises()
  await w.findAll('select')[0]!.setValue('SUCIVE');await flushPromises()
  terminar({...reporte,totales:{...reporte.totales,importe:999999}});await flushPromises()
  expect(w.get('.indicadores').text()).toContain('700,30')
  expect(w.get('.indicadores').text()).not.toContain('999.999')
 })
 it('exporta con los filtros elegidos y descarga XLSX',async()=>{
  vi.useFakeTimers()
  vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:reporte');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{})
  const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{})
  vi.mocked(api.exportarReporte).mockResolvedValue(new Blob(['excel']))
  const w=montar();await flushPromises()
  await w.findAll('select')[0]!.setValue('SUCIVE');await flushPromises()
  await w.get('.acciones-reporte button').trigger('click');await flushPromises()
  expect(api.exportarReporte).toHaveBeenCalledWith({origen:'SUCIVE',tipoPadron:'',segmento:''},expect.any(AbortSignal))
  expect(click.mock.instances[0]?.download).toBe('reporte-cartera.xlsx')
  await vi.advanceTimersByTimeAsync(1000)
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:reporte')
 })
 it('si falla el catálogo sigue mostrando el reporte y permite reintentar filtros',async()=>{
  vi.mocked(api.obtenerCatalogosReporte).mockRejectedValueOnce(new Error('error'))
  const w=montar();await flushPromises()
  expect(w.get('.indicadores').text()).toContain('700,30')
  expect(w.findAll('select')[1]!.attributes('disabled')).toBeDefined()
  await w.get('.ayuda button').trigger('click');await flushPromises()
  expect(w.findAll('select')[1]!.attributes('disabled')).toBeUndefined()
 })
})


it('agrupa los importes y padrones por origen usando todo el desglose filtrado', async()=>{
 vi.mocked(api.obtenerReporte).mockResolvedValue({...reporte,resumen:[
  {origen:'INTENDENCIA',tipo:'CIU',personas:2,cantidad:10,importe:200},
  {origen:'INTENDENCIA',tipo:'CIR',personas:3,cantidad:15,importe:400},
  {origen:'SUCIVE',tipo:'PAT',personas:1,cantidad:10,importe:100.30},
 ]})
 const w=montar();await flushPromises()
 const filas=w.findAll('.grafico-origen .fila-barra')
 expect(filas).toHaveLength(2)
 expect(filas[0]!.text()).toContain('Intendencia')
 expect(filas[0]!.text()).toContain('25 padrones')
 expect(filas[0]!.text()).toContain('600,00')
 expect(filas[1]!.text()).toContain('SUCIVE')
 expect(filas[1]!.text()).toContain('10 padrones')
 expect(filas[1]!.text()).toContain('100,30')
})
it('con un solo origen muestra únicamente ese origen y su participación real',async()=>{
 const w=montar();await flushPromises()
 const filas=w.findAll('.grafico-origen .fila-barra')
 expect(filas).toHaveLength(1)
 expect(filas[0]!.text()).toContain('SUCIVE')
 expect(filas[0]!.text()).toContain('100 %')
})

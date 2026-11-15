import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { mount, flushPromises, enableAutoUnmount, RouterLinkStub } from '@vue/test-utils'
import Historial from '../src/modules/contribuyentes/components/HistorialPadronPanel.vue'
import DeudasTab from '../src/modules/contribuyentes/components/DeudasTab.vue'
import { obtenerHistorial } from '../src/modules/contribuyentes/services/historialService'
import { deuda } from './carteraFixtures'
vi.mock('../src/modules/contribuyentes/services/historialService',()=>({obtenerHistorial:vi.fn()}))
enableAutoUnmount(afterEach)
const relacion={CM_PADRON:10,NRO_PADRON:'001',TIPO_PADRON:'PAT',COD_CONTRIBUYENTE:123,NOMBRE:'Ana',DOCUMENTO:'00123',TELEFONO:null,EMAIL:null,DESCRIPCION_RELACION:'Propietario',SITUACION_REGISTRO:'ACTIVO'}
beforeEach(()=>{vi.resetAllMocks();vi.mocked(obtenerHistorial).mockResolvedValue({data:[relacion,{...relacion,CM_PADRON:20,SITUACION_REGISTRO:'NO ACTIVO - SOLO HISTORICO'}],meta:{total:2}})})
describe('personas vinculadas al padrón',()=>{
 it('consulta solo al abrir la fila correcta y conserva la gestión seleccionada',async()=>{
  const w=mount(DeudasTab,{props:{deudas:[deuda(10),deuda(20)],deudaSeleccionadaId:10},global:{stubs:{RouterLink:RouterLinkStub}}})
  expect(obtenerHistorial).not.toHaveBeenCalled()
  await w.findAll('.boton-detalle')[1]!.trigger('click')
  expect(obtenerHistorial).not.toHaveBeenCalled()
  await w.get('.enlace-historial').trigger('click');await flushPromises()
  expect(obtenerHistorial).toHaveBeenCalledExactlyOnceWith(20,expect.any(AbortSignal));expect(w.emitted('seleccionar')).toBeUndefined()
  expect(w.findAll('.historial-panel')).toHaveLength(1)
  const signal=vi.mocked(obtenerHistorial).mock.calls[0]![1]!
  await w.findAll('.boton-detalle')[1]!.trigger('click');expect(signal.aborted).toBe(true)
 })
 it('separa actuales e históricas sin unir personas por documento y muestra datos faltantes',async()=>{
  const w=mount(Historial,{props:{deudaId:10,cm:'10',origen:'SUCIVE'}});await flushPromises()
  expect(w.text()).toContain('SUCIVE · CM 10');expect(w.text()).toContain('Relaciones actuales (1)');expect(w.text()).toContain('Relaciones históricas (1)')
  expect(w.findAll('tbody tr')).toHaveLength(2);expect(w.text()).toContain('Documento: 00123');expect(w.text()).toContain('Correo sin informar')
 })
 it('muestra vacío sin confundirlo con error',async()=>{
  vi.mocked(obtenerHistorial).mockResolvedValue({data:[],meta:{total:0}})
  const w=mount(Historial,{props:{deudaId:10,cm:'10'}});await flushPromises();expect(w.text()).toContain('No hay relaciones registradas');expect(w.find('[role=alert]').exists()).toBe(false)
 })
 it('permite reintentar errores de la fuente',async()=>{
  vi.mocked(obtenerHistorial).mockRejectedValueOnce({response:{data:{mensaje:'API externa respondió HTTP 504'}}})
  const w=mount(Historial,{props:{deudaId:10,cm:'10'}});await flushPromises();expect(w.get('[role=alert]').text()).toContain('504')
  await w.get('button').trigger('click');await flushPromises();expect(w.find('[role=alert]').exists()).toBe(false);expect(w.findAll('tbody tr')).toHaveLength(2)
 })
 it('ignora respuestas anteriores al cambiar el padrón',async()=>{
  let resolver!:(v:Awaited<ReturnType<typeof obtenerHistorial>>)=>void
  vi.mocked(obtenerHistorial).mockImplementationOnce(()=>new Promise(r=>{resolver=r}))
  const w=mount(Historial,{props:{deudaId:10,cm:'10'}});const anterior=vi.mocked(obtenerHistorial).mock.calls[0]![1]!
  await w.setProps({deudaId:20,cm:'20'});await flushPromises();expect(anterior.aborted).toBe(true)
  resolver({data:[],meta:{total:0}});await flushPromises();expect(w.findAll('tbody tr')).toHaveLength(2)
 })
})

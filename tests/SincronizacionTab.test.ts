import { beforeEach,afterEach,it,expect,vi } from 'vitest'
import { mount,flushPromises,enableAutoUnmount } from '@vue/test-utils'
import Tab from '../src/modules/configuracion/components/SincronizacionTab.vue'
import * as api from '../src/modules/configuracion/services/sincronizacionService'
let admin=true
vi.mock('../src/modules/autenticacion/stores/auth.store',()=>({useAuthStore:()=>({tieneRol:()=>admin})}))
vi.mock('../src/modules/configuracion/services/sincronizacionService',()=>({obtenerPeriodo:vi.fn(),guardarPeriodo:vi.fn(),obtenerEjecucion:vi.fn(),iniciarSincronizacion:vi.fn(),cancelarSincronizacion:vi.fn()}))
enableAutoUnmount(afterEach)
const trabajo={estado:'EN_CURSO' as const,origen:'SUCIVE' as const,anioMinimo:2013,inicio:'2026-11-11T12:00:00',fin:null,mensaje:'Descargando',resultado:null}
beforeEach(()=>{vi.resetAllMocks();admin=true;vi.mocked(api.obtenerPeriodo).mockResolvedValue({anioMinimo:2013});vi.mocked(api.obtenerEjecucion).mockResolvedValue(null)})
it('guarda el año y usa el origen elegido sin enviar otro período al iniciar',async()=>{
 vi.mocked(api.guardarPeriodo).mockResolvedValue({anioMinimo:2015});vi.mocked(api.iniciarSincronizacion).mockResolvedValue(trabajo)
 const w=mount(Tab);await flushPromises();await w.get('input').setValue(2015)
 expect(w.findAll('button').find(b=>b.text()==='Sincronizar ahora')!.attributes('disabled')).toBeDefined()
 await w.get('form').trigger('submit');await flushPromises();expect(api.guardarPeriodo).toHaveBeenCalledWith(2015)
 await w.get('select').setValue('SUCIVE');await w.findAll('button').find(b=>b.text()==='Sincronizar ahora')!.trigger('click');await flushPromises()
 expect(api.iniciarSincronizacion).toHaveBeenCalledWith('SUCIVE');expect(w.get('input').attributes('disabled')).toBeDefined()
})
it('retoma el seguimiento al abrir y libera controles al finalizar',async()=>{
 vi.useFakeTimers();vi.mocked(api.obtenerEjecucion).mockResolvedValueOnce(trabajo).mockResolvedValue({...trabajo,estado:'COMPLETADA',mensaje:'Completada'})
 const w=mount(Tab);await flushPromises();expect(w.text()).toContain('En curso')
 await vi.advanceTimersByTimeAsync(2000);await flushPromises();expect(w.text()).toContain('Completada');expect(w.get('input').attributes('disabled')).toBeUndefined();w.unmount();vi.useRealTimers()
})
it('no permite administrar a otros roles',async()=>{
 admin=false;const w=mount(Tab);await flushPromises();expect(w.find('form').exists()).toBe(false);expect(api.obtenerPeriodo).not.toHaveBeenCalled()
})
it('muestra el error de origen y permite un nuevo intento',async()=>{
 vi.mocked(api.obtenerEjecucion).mockResolvedValue({...trabajo,estado:'ERROR',mensaje:'API respondió HTTP 504'})
 const w=mount(Tab);await flushPromises();expect(w.get('[role=alert]').text()).toContain('504');expect(w.get('input').attributes('disabled')).toBeUndefined()
})

it('actualiza el avance con las consultas periódicas y conserva el error final',async()=>{
 vi.useFakeTimers()
 const progreso={etapa:'DEUDAS' as const,paginasDescargadas:10,paginaActual:11,registrosDescargados:10000,totalRegistros:null,totalPaginas:null,intento:1,detalle:'Consultando página 11'}
 vi.mocked(api.obtenerEjecucion).mockResolvedValueOnce({...trabajo,progreso}).mockResolvedValueOnce({...trabajo,progreso:{...progreso,paginasDescargadas:20,paginaActual:21,registrosDescargados:20000}}).mockResolvedValue({...trabajo,estado:'ERROR',mensaje:'API respondió HTTP 504',progreso:{...progreso,paginasDescargadas:20,paginaActual:21,registrosDescargados:20000,intento:3}})
 const w=mount(Tab);await flushPromises();expect(w.text()).toContain('10.000')
 await vi.advanceTimersByTimeAsync(2000);await flushPromises();expect(w.text()).toContain('20.000')
 await vi.advanceTimersByTimeAsync(2000);await flushPromises();expect(w.text()).toContain('504');expect(w.find('.indeterminado').exists()).toBe(false)
 const llamadas=vi.mocked(api.obtenerEjecucion).mock.calls.length
 await vi.advanceTimersByTimeAsync(6000);expect(api.obtenerEjecucion).toHaveBeenCalledTimes(llamadas)
 w.unmount();vi.useRealTimers()
})

it('solicita cancelar y sigue consultando hasta que se confirma',async()=>{
 vi.useFakeTimers();vi.mocked(api.obtenerEjecucion).mockResolvedValueOnce(trabajo).mockResolvedValue({...trabajo,estado:'CANCELADA',mensaje:'Se descartó la descarga'})
 vi.mocked(api.cancelarSincronizacion).mockResolvedValue({...trabajo,estado:'CANCELANDO',mensaje:'Esperando petición actual'})
 const w=mount(Tab);await flushPromises();await w.get('button.cancelar').trigger('click');await flushPromises()
 expect(api.cancelarSincronizacion).toHaveBeenCalledOnce();expect(w.text()).toContain('Cancelando…');expect(w.get('input').attributes('disabled')).toBeDefined()
 await vi.advanceTimersByTimeAsync(2000);await flushPromises();expect(w.text()).toContain('Cancelada');expect(w.get('input').attributes('disabled')).toBeUndefined();w.unmount();vi.useRealTimers()
})
it('deshabilita cancelar al comenzar a guardar',async()=>{
 vi.mocked(api.obtenerEjecucion).mockResolvedValue({...trabajo,progreso:{etapa:'GUARDANDO',paginasDescargadas:0,paginaActual:null,registrosDescargados:22081,totalRegistros:null,totalPaginas:null,intento:1,detalle:'Guardando'}})
 const w=mount(Tab);await flushPromises();expect(w.get('button.cancelar').attributes('disabled')).toBeDefined();expect(w.text()).toContain('la cancelación está deshabilitada')
})

it('permite vaciar el año, guardarlo y volver a abrir sin límite',async()=>{
 vi.mocked(api.guardarPeriodo).mockResolvedValue({anioMinimo:null})
 const w=mount(Tab);await flushPromises();await w.get('input').setValue('');await w.get('form').trigger('submit');await flushPromises()
 expect(api.guardarPeriodo).toHaveBeenCalledWith(null);expect(w.text()).toContain('sin año mínimo')
 expect(w.findAll('button').find(b=>b.text()==='Sincronizar ahora')!.attributes('disabled')).toBeUndefined()
 w.unmount();vi.mocked(api.obtenerPeriodo).mockResolvedValue({anioMinimo:null})
 const otro=mount(Tab);await flushPromises();expect(otro.find('form').exists()).toBe(true);expect(otro.text()).toContain('sin año mínimo')
 expect((otro.get('input').element as HTMLInputElement).value).toBe('')
})

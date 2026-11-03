import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import Comparacion from '../src/modules/comparacion/views/ComparacionCarteraView.vue'
import * as api from '../src/modules/comparacion/services/capturaService'
import type { CapturaDetalle, EstadoCuenta } from '../src/modules/comparacion/services/capturaService'
const route = reactive({ query: {} as Record<string, string> })
vi.mock('vue-router', () => ({ useRoute: () => route }))
vi.mock('../src/modules/comparacion/services/capturaService', async (original) => ({
 ...(await original<typeof import('../src/modules/comparacion/services/capturaService')>()), listarCapturas: vi.fn(), obtenerCaptura: vi.fn(), crearCaptura: vi.fn(), validarCuenta: vi.fn(),
}))
enableAutoUnmount(afterEach)
const cuenta = (cm: string, importe: number, origen: 'INTENDENCIA' | 'SUCIVE' = 'INTENDENCIA'): EstadoCuenta => ({ cm, origen, importe, numeroPadron:'00042',tipoPadron:'CIU',nombre:'Persona',documento:'90000001',estado:importe ? 'PENDIENTE':'SIN_DEUDA_PENDIENTE',segmento:null,fechaSincronizacion:'2026-10-27T12:00:00',fechaUltimoCobro:null,importeUltimoCobro:null })
let antes: CapturaDetalle
let despues: CapturaDetalle
beforeEach(() => {
 vi.resetAllMocks(); route.query = {}
 vi.mocked(api.validarCuenta).mockResolvedValue(undefined)
 antes={id:1,nombre:'Primera',fecha:'2026-11-01T12:00:00',usuario:'admin',cuentas:[cuenta('1001',100),cuenta('1001',200,'SUCIVE'),cuenta('1002',0)]}
 despues={id:2,nombre:'Segunda',fecha:'2026-11-03T12:00:00',usuario:'analista',cuentas:[cuenta('1001',50),cuenta('1001',0,'SUCIVE'),cuenta('1002',80)]}
 vi.mocked(api.listarCapturas).mockResolvedValue([despues,antes].map(c=>({...c,cantidadCuentas:c.cuentas.length})))
 vi.mocked(api.obtenerCaptura).mockImplementation(async id => id===1 ? antes : despues)
})
describe('capturas reales', () => {
 it('carga capturas persistentes y separa cuentas del mismo CM por origen', async () => {
  route.query={cm:'1001',origen:'SUCIVE'}
  const w=mount(Comparacion); await flushPromises()
  expect(w.findAll('tbody tr')).toHaveLength(1)
  expect(w.get('tbody').text()).toContain('Sin deuda pendiente')
  expect(w.get('tbody').text()).toContain('200,00')
  expect(w.get('tbody').text()).not.toContain('Persona ficticia')
  expect(w.text()).not.toContain('BOCETO TEMPORAL')
 })
 it('no considera como pago una cuenta no incluida en la segunda captura', async () => {
  despues.cuentas=[cuenta('1001',50)]
  const w=mount(Comparacion); await flushPromises()
  expect(w.findAll('tbody tr')).toHaveLength(1)
  expect(w.get('.cuentas-excluidas').text()).toContain('2 cuentas no se comparan')
  expect(w.get('tbody').text()).toContain('Saldo disminuyó')
 })
 it('sin capturas informa el estado vacío, sin recurrir a ejemplos', async () => {
  vi.mocked(api.listarCapturas).mockResolvedValue([])
  const w=mount(Comparacion); await flushPromises()
  expect(w.text()).toContain('Todavía no hay capturas guardadas')
  expect(w.find('.indicadores').exists()).toBe(false)
  expect(api.obtenerCaptura).not.toHaveBeenCalled()
 })
 it('crea una captura con nombre y únicamente los CM agregados', async () => {
  vi.mocked(api.crearCaptura).mockResolvedValue({...despues,id:3,nombre:'Seguimiento'})
  const w=mount(Comparacion); await flushPromises()
  await w.get('button.nueva').trigger('click')
  expect(w.get('form button[type="submit"]').attributes('disabled')).toBeDefined()
  await w.get('form input[maxlength="100"]').setValue('Seguimiento')
  await w.get('form select').setValue('SUCIVE')
  await w.get('form input[placeholder="Ingresá el CM"]').setValue(' 1001 ')
  await w.findAll('form button').find(b=>b.text()==='Agregar CM')!.trigger('click')
  await w.get('form').trigger('submit'); await flushPromises()
  expect(api.crearCaptura).toHaveBeenCalledExactlyOnceWith('Seguimiento',[{cm:'1001',origen:'SUCIVE'}])
  expect(w.get('[role="status"]').text()).toContain('guardada')
  expect(w.find('form').exists()).toBe(false)
 })
 it('un error al guardar mantiene la selección y no simula éxito', async () => {
  vi.mocked(api.crearCaptura).mockRejectedValue(new Error('error'))
  const w=mount(Comparacion); await flushPromises()
  await w.get('button.nueva').trigger('click')
  await w.get('form input[maxlength="100"]').setValue('Prueba')
  await w.get('form input[placeholder="Ingresá el CM"]').setValue('1001')
  await w.findAll('form button').find(b=>b.text()==='Agregar CM')!.trigger('click')
  await w.get('form').trigger('submit'); await flushPromises()
  expect(w.get('form [role="alert"]').text()).toContain('No se pudo guardar')
  expect(w.get('form .seleccion').text()).toContain('1001')
 })
 it('distingue deuda nueva y elimina el supuesto de pago confirmado', async () => {
  const w=mount(Comparacion); await flushPromises()
  expect(w.get('tbody').text()).toContain('Deuda pendiente nueva')
  expect(w.get('tbody').text()).toContain('Sin información')
 })
 it('rechaza comparar una captura consigo misma o con orden temporal invertido', async () => {
  const w=mount(Comparacion); await flushPromises()
  await w.findAll('.fechas select')[0]!.setValue('2')
  await flushPromises()
  expect(w.get('[role="alert"]').text()).toContain('más reciente')
  expect(w.find('.indicadores').exists()).toBe(false)
 })
 it('un fallo al cargar la lista no muestra datos ficticios', async () => {
  vi.mocked(api.listarCapturas).mockRejectedValue(new Error('error'))
  const w=mount(Comparacion); await flushPromises()
  expect(w.get('[role="alert"]').text()).toContain('No se pudieron cargar')
  expect(w.find('tbody').exists()).toBe(false)
 })
})


describe('validación al agregar CM', () => {
 async function formulario() {
  const w=mount(Comparacion); await flushPromises()
  await w.get('button.nueva').trigger('click')
  await w.get('form input[placeholder="Ingresá el CM"]').setValue('1001')
  return w
 }
 it('un CM inexistente no se agrega y muestra el error junto al campo', async () => {
  vi.mocked(api.validarCuenta).mockRejectedValue({ isAxiosError: true, response: { status: 404 } })
  const w=await formulario()
  await w.findAll('form button').find(b=>b.text()==='Agregar CM')!.trigger('click'); await flushPromises()
  expect(w.get('#error-cuenta').text()).toBe('No existe el CM 1001 en Intendencia.')
  expect(w.get('#error-cuenta').classes()).toContain('error')
  expect(w.findAll('.seleccion li')).toHaveLength(0)
  expect(api.crearCaptura).not.toHaveBeenCalled()
 })
 it('espera la validación del origen correcto antes de agregarlo y bloquea duplicados', async () => {
  let terminar!: () => void
  vi.mocked(api.validarCuenta).mockReturnValue(new Promise<void>(resolve=>{terminar=resolve}))
  const w=await formulario()
  await w.get('form select').setValue('SUCIVE')
  await w.findAll('form button').find(b=>b.text()==='Agregar CM')!.trigger('click')
  expect(w.findAll('.seleccion li')).toHaveLength(0)
  expect(api.validarCuenta).toHaveBeenCalledExactlyOnceWith({cm:'1001',origen:'SUCIVE'},expect.any(AbortSignal))
  expect(w.findAll('button').find(b=>b.text()==='Validando...')!.attributes('disabled')).toBeDefined()
  terminar(); await flushPromises()
  expect(w.get('.seleccion').text()).toContain('SUCIVE · CM 1001')
 })
 it('una respuesta tardía no agrega un CM si se modificó el campo durante la consulta', async () => {
  let terminar!: () => void
  vi.mocked(api.validarCuenta).mockReturnValue(new Promise<void>(resolve=>{terminar=resolve}))
  const w=await formulario()
  await w.findAll('form button').find(b=>b.text()==='Agregar CM')!.trigger('click')
  await w.get('form input[placeholder="Ingresá el CM"]').setValue('2002')
  terminar(); await flushPromises()
  expect(w.findAll('.seleccion li')).toHaveLength(0)
 })
 it('una falla de comunicación no se confunde con un CM inexistente', async () => {
  vi.mocked(api.validarCuenta).mockRejectedValue(new Error('fallo'))
  const w=await formulario()
  await w.findAll('form button').find(b=>b.text()==='Agregar CM')!.trigger('click'); await flushPromises()
  expect(w.get('#error-cuenta').text()).toContain('No se pudo validar')
  expect(w.findAll('.seleccion li')).toHaveLength(0)
 })
})

import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ConveniosView from '../src/modules/convenios/views/ConveniosView.vue'
import { obtenerConvenios } from '../src/modules/convenios/services/convenioService'
vi.mock('../src/modules/convenios/services/convenioService', () => ({ obtenerConvenios: vi.fn() }))
const pagina = { data: [{ CM: 900, NUMERO_CONVENIO: '123', PERSONA: 'Ana', DOCUMENTO: '12345', MATRICULA: null, CANT_CUOTAS_VENC: 2, CANT_CUOTAS_CONVENIOS: 12, IMPORTE_DEUDA: '123.45000', DEUDA_FACTURAS: '130.45', SALDO_A_FAVOR: '7.00', CREDITO_DESCONTADO: '7.00', DEUDA_DESDE: '2025-01-01', ULTIMO_VENCIMIENTO: null, TRIBUTOS_DEUDA: '1, 2', TELEFONO: null, EMAIL: null, DIRECCION: null, NUMERO_PUERTA: null, LOCALIDAD: null }], meta: { total: 21, current_page: 1, last_page: 2, has_more: true } }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(obtenerConvenios).mockResolvedValue(pagina) })
describe('Convenios reales', () => {
 it('muestra resultados y abre el desglose conservando el importe', async () => {
  const w = mount(ConveniosView); await flushPromises()
  expect(w.text()).toContain('Ana'); expect(w.text()).toContain('123.45000')
  await w.findAll('button').find(b => b.text() === 'Ver detalle')!.trigger('click')
  expect(w.text()).toContain('Crédito descontado'); expect(w.text()).toContain('130.45'); w.unmount()
 })
 it('aplica filtros y pagina usando los filtros ya aplicados', async () => {
  const w = mount(ConveniosView); await flushPromises()
  await w.find('select').setValue('SUCIVE'); await w.find('input[inputmode=numeric]').setValue('900'); await w.find('form').trigger('submit'); await flushPromises()
  expect(obtenerConvenios).toHaveBeenLastCalledWith(expect.objectContaining({ origen: 'SUCIVE', cm: '900' }), 1, expect.any(AbortSignal))
  await w.find('select').setValue('INTENDENCIA')
  await w.findAll('button').find(b => b.text() === 'Siguiente')!.trigger('click'); await flushPromises()
  expect(obtenerConvenios).toHaveBeenLastCalledWith(expect.objectContaining({ origen: 'SUCIVE' }), 2, expect.any(AbortSignal)); w.unmount()
 })
 it('distingue error externo de consulta sin resultados y permite reintentar', async () => {
  vi.mocked(obtenerConvenios).mockRejectedValueOnce({ response: { data: { mensaje: 'API externa respondió HTTP 504' } } })
  const w = mount(ConveniosView); await flushPromises(); expect(w.find('[role=alert]').text()).toContain('504')
  vi.mocked(obtenerConvenios).mockResolvedValue({ data: [], meta: { total: 0, current_page: 1, last_page: 1, has_more: false } })
  await w.findAll('button').find(b => b.text() === 'Reintentar')!.trigger('click'); await flushPromises()
  expect(w.text()).toContain('No se encontraron convenios'); expect(w.find('[role=alert]').exists()).toBe(false); w.unmount()
 })
 it('aborta la consulta al salir', async () => {
  const w = mount(ConveniosView); const signal = vi.mocked(obtenerConvenios).mock.calls[0]![2]!
  w.unmount(); expect(signal.aborted).toBe(true)
 })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, enableAutoUnmount, RouterLinkStub } from '@vue/test-utils'
import DeudasTab from '../src/modules/contribuyentes/components/DeudasTab.vue'
import FacturasPanel from '../src/modules/contribuyentes/components/FacturasPadronPanel.vue'
import { obtenerFacturas } from '../src/modules/contribuyentes/services/facturaService'
import { deuda } from './carteraFixtures'
vi.mock('../src/modules/contribuyentes/services/facturaService', () => ({ obtenerFacturas: vi.fn() }))
enableAutoUnmount(afterEach)
const factura = {
  factura_id: '0001', cm: 10, tributo: 'Tasa', anio: 2026, cuota: 1, total_cuotas: 12,
  monto: '1234.56789', moneda: null, unidad_codigo: 7, estado: 'PENDIENTE', vencida: true,
  fecha_vencimiento: '2026-01-05', periodo_desde: null, periodo_hasta: null, convenio_cm: 800,
  montos_por_unidad: null,
}
const resultado = { data: [factura], meta: { total: 1 } }
function panel() { return mount(FacturasPanel, { props: { deudaId: 10, cm: '10', numeroPadron: '1010' } }) }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(obtenerFacturas).mockResolvedValue(resultado) })

describe('detalle de facturas bajo demanda', () => {
  it('muestra el desglose sin volver a descontar crédito y distingue cero de dato ausente', async () => {
    const d = {...deuda(10), importe:80, deudaFacturas:100, saldoAFavor:200, creditoDescontado:20}
    const w = mount(DeudasTab, { props:{deudas:[d]}, global:{stubs:{RouterLink:RouterLinkStub}} })
    expect(w.find('.panel-detalle').exists()).toBe(false)
    await w.get('.boton-detalle').trigger('click')
    const detalle = w.get('.desglose-saldo')
    expect(detalle.element.closest('tr')?.classList.contains('fila-detalle')).toBe(true)
    expect(detalle.element.closest('td')?.getAttribute('colspan')).toBe('9')
    expect(detalle.text()).toContain('100,00'); expect(detalle.text()).toContain('200,00')
    expect(detalle.text()).toContain('20,00'); expect(detalle.text()).toContain('80,00')
    expect(obtenerFacturas).not.toHaveBeenCalled()
    w.unmount()
    const vacio = mount(DeudasTab, {props:{deudas:[{...deuda(20),saldoAFavor:0}]},global:{stubs:{RouterLink:RouterLinkStub}}})
    await vacio.get('.boton-detalle').trigger('click')
    expect(vacio.get('.desglose-saldo').text()).toContain('Sin informar')
    expect(vacio.get('.desglose-saldo').text()).toContain('0,00')
  })
  it('muestra matrícula en el detalle y la tabla de cartera sin cambiar el enlace', async () => {
    const d = {...deuda(10),padron:{...deuda(10).padron,matricula:'SAA0123',origen:'SUCIVE' as const}}
    const w = mount(DeudasTab,{props:{deudas:[d]},global:{stubs:{RouterLink:RouterLinkStub}}})
    expect(w.text()).toContain('Matrícula: SAA0123')
    const { default:CarteraTable } = await import('../src/modules/cartera/components/CarteraTable.vue')
    const { obtenerCartera } = await import('../src/modules/cartera/services/carteraService')
    const { http } = await import('../src/shared/api/http')
    const consulta = vi.spyOn(http, 'get').mockResolvedValue({data:{contenido:[d],pagina:0,tamanio:20,totalElementos:1,totalPaginas:1}})
    const item = (await obtenerCartera()).contenido[0]!
    consulta.mockRestore()
    expect(item.matricula).toBe('SAA0123')
    const table = mount(CarteraTable,{props:{cartera:[item]},global:{stubs:{RouterLink:RouterLinkStub}}})
    expect(table.text()).toContain('Matrícula: SAA0123')
  })
  it('muestra contadores distintos y años no consecutivos sin inferir valores faltantes', async () => {
    const d={...deuda(10),cantidadFacturasVencidas:5,cantidadFacturasConDeuda:3,anioDesde:2021,anioHasta:2026,cantidadAniosDeuda:2,aniosDeuda:'2021, 2026'}
    const w=mount(DeudasTab,{props:{deudas:[d]},global:{stubs:{RouterLink:RouterLinkStub}}})
    await w.get('.boton-detalle').trigger('click')
    await w.get('.opcion-resumen').trigger('click')
    const datos=w.get('.facturas-anios')
    expect(w.find('.desglose-saldo').exists()).toBe(false)
    expect(datos.findAll('dd').map(c=>c.text())).toEqual(['5','3','2021','2026','2','2021, 2026'])
    expect(obtenerFacturas).not.toHaveBeenCalled()
    w.unmount()
    const vacio=mount(DeudasTab,{props:{deudas:[{...deuda(20),cantidadFacturasVencidas:0,aniosDeuda:null}]},global:{stubs:{RouterLink:RouterLinkStub}}})
    await vacio.get('.boton-detalle').trigger('click')
    await vacio.get('.opcion-resumen').trigger('click')
    expect(vacio.get('.facturas-anios').findAll('dd').map(c=>c.text())).toEqual(['0','Sin informar','Sin informar','Sin informar','Sin informar','Sin informar'])
  })
  it('no consulta hasta expandir; usa el ID de la fila sin cambiar la gestión seleccionada', async () => {
    const w = mount(DeudasTab, { props: { deudas: [deuda(10), deuda(20)], deudaSeleccionadaId: 10 }, global: { stubs: { RouterLink: RouterLinkStub } } })
    expect(obtenerFacturas).not.toHaveBeenCalled()
    const botones = w.findAll('.boton-detalle')
    await botones[1]!.trigger('click')
    expect(obtenerFacturas).not.toHaveBeenCalled()
    await w.get('.enlace-facturas').trigger('click'); await flushPromises()
    expect(obtenerFacturas).toHaveBeenCalledExactlyOnceWith(20, { estado: '', vencida: '', incluirConvenios: true }, expect.any(AbortSignal))
    expect(w.emitted('seleccionar')).toBeUndefined()
    expect(w.get('tr.seleccionada').text()).toContain('CM: 10')
    expect(botones[1]!.attributes('aria-expanded')).toBe('true')
    await botones[0]!.trigger('click')
    await w.get('.enlace-facturas').trigger('click'); await flushPromises()
    expect(w.findAllComponents(FacturasPanel)).toHaveLength(1)
    expect(obtenerFacturas).toHaveBeenLastCalledWith(10, expect.anything(), expect.any(AbortSignal))
  })
  it('conserva precisión y unidad desconocida sin convertir a pesos', async () => {
    const w = panel(); await flushPromises()
    expect(w.text()).toContain('1.234,56789 · Unidad 7')
    expect(w.text()).toContain('Convenio CM 800')
    expect(w.text()).toContain('05/01/2026')
    expect(w.text()).not.toContain('$')
  })
  it('muestra unidades múltiples por separado y nunca las suma', async () => {
    vi.mocked(obtenerFacturas).mockResolvedValue({ data: [{ ...factura, monto: null, montos_por_unidad: [
      { monto: '20.00001', moneda: 'UI', unidad_codigo: 1 },
      { monto: '300.00', moneda: 'UYU', unidad_codigo: 2 },
    ] }], meta: { total: 1 } })
    const w = panel(); await flushPromises()
    expect(w.findAll('.unidad').map(n => n.text())).toEqual(['20,00001 UI', '300,00 UYU'])
  })
  it('combina los filtros y vuelve a consultar', async () => {
    const w = panel(); await flushPromises()
    await w.findAll('select')[0]!.setValue('PENDIENTE')
    await w.findAll('select')[1]!.setValue('true')
    await w.get('input[type="checkbox"]').setValue(false)
    await flushPromises()
    expect(obtenerFacturas).toHaveBeenLastCalledWith(10, { estado: 'PENDIENTE', vencida: 'true', incluirConvenios: false }, expect.any(AbortSignal))
  })
  it('permite reintentar una falla y muestra lista vacía sin inventar filas', async () => {
    vi.mocked(obtenerFacturas).mockRejectedValueOnce(new Error('504')).mockResolvedValueOnce({ data: [], meta: { total: 0 } })
    const w = panel(); await flushPromises()
    expect(w.get('[role="alert"]').text()).toContain('API externa')
    await w.get('button').trigger('click'); await flushPromises()
    expect(w.text()).toContain('No hay facturas para estos filtros.')
  })
  it('cancela la petición al cerrar el detalle', async () => {
    const w = panel()
    const signal = vi.mocked(obtenerFacturas).mock.calls[0]![2]!
    w.unmount()
    expect(signal.aborted).toBe(true)
  })
  it('una respuesta anterior no reemplaza la del padrón actual', async () => {
    let terminar!: (r: typeof resultado) => void
    vi.mocked(obtenerFacturas).mockReturnValueOnce(new Promise(resolve => { terminar = resolve }))
    const w = panel()
    await w.setProps({ deudaId: 20 })
    await flushPromises()
    terminar({ data: [{ ...factura, factura_id: 'VIEJA' }], meta: { total: 1 } })
    await flushPromises()
    expect(w.text()).toContain('0001')
    expect(w.text()).not.toContain('VIEJA')
  })
})


it('el enlace de evolución conserva el CM y el origen del padrón de la fila', async () => {
  const sucive = deuda(20)
  sucive.padron.cm = '001001'
  sucive.padron.origen = 'SUCIVE'
  const w = mount(DeudasTab, { props: { deudas: [deuda(10), sucive] }, global: { stubs: { RouterLink: RouterLinkStub } } })
  await w.findAll('.boton-detalle')[0]!.trigger('click')
  expect(w.getComponent(RouterLinkStub).props('to')).toEqual({ name: 'comparar-cartera', query: { cm: '10', origen: 'INTENDENCIA' } })
  await w.findAll('.boton-detalle')[1]!.trigger('click')
  expect(w.findAll('.panel-detalle')).toHaveLength(1)
  expect(w.getComponent(RouterLinkStub).props('to')).toEqual({ name: 'comparar-cartera', query: { cm: '001001', origen: 'SUCIVE' } })
  await w.findAll('.boton-detalle')[1]!.trigger('click')
  expect(w.find('.panel-detalle').exists()).toBe(false)
})

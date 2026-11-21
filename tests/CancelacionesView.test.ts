import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../src/modules/autenticacion/stores/auth.store'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import CancelacionesView from '../src/modules/cancelaciones/views/CancelacionesView.vue'
import { exportarCancelaciones, obtenerCancelaciones, obtenerMotivosCancelaciones } from '../src/modules/cancelaciones/services/cancelacionService'
import { obtenerFacturasCanceladas } from '../src/modules/contribuyentes/services/facturaService'

vi.mock('../src/modules/cancelaciones/services/cancelacionService')
vi.mock('../src/modules/contribuyentes/services/facturaService')
enableAutoUnmount(afterEach)
beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.mocked(obtenerMotivosCancelaciones).mockResolvedValue(['PAGO'])
})
afterEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
})

it('lista cobros locales y consulta las cuotas solo al expandir la fila', async () => {
  vi.mocked(obtenerCancelaciones).mockResolvedValue({
    contenido: [{
      id: 4, origen: 'SUCIVE', cm: '001', numeroCobro: '0002', numeroPadron: '03', persona: null,
      documento: null, fechaCobro: '2026-11-20', importeTotal: 425.75, motivo: 'PAGO',
    }],
    pagina: 0, totalPaginas: 1, totalElementos: 1,
  })
  vi.mocked(obtenerFacturasCanceladas).mockResolvedValue({
    data: [{
      factura_id: '005', cm: 1, cuota: 2, total_cuotas: 6, anio: 2026, tributo: 'Patente',
      estado: 'CANCELADA', vencida: false, monto: '80.50', moneda: 'UYU', unidad_codigo: null,
      fecha_vencimiento: null, periodo_desde: null, periodo_hasta: null, convenio_cm: null, montos_por_unidad: null,
    }],
    meta: { total: 1 },
  })
  const vista = mount(CancelacionesView)
  await flushPromises()
  expect(vista.get('tbody').text()).toContain('0002')
  expect(vista.get('tbody').text()).toContain('425,75')
  expect(obtenerFacturasCanceladas).not.toHaveBeenCalled()

  await vista.get('button[aria-expanded]').trigger('click')
  await flushPromises()
  expect(obtenerFacturasCanceladas).toHaveBeenCalledExactlyOnceWith(4, expect.any(AbortSignal))
  expect(vista.text()).toContain('Cuota 2 / 6')
  expect(vista.text()).toContain('Facturas canceladas del padrón 03')
})

it('abre un panel de exportación independiente del listado para Analista', async () => {
  vi.mocked(obtenerCancelaciones).mockResolvedValue({
    contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0,
  })
  const auth = useAuthStore()
  auth.user = { id: 1, username: 'usuario', roles: ['ADMINISTRADOR'] }
  const vista = mount(CancelacionesView)
  await flushPromises()
  expect(vista.findAll('.filtros button').map(boton => boton.text())).not.toContain('Exportar Excel')

  auth.user.roles.push('ANALISTA')
  await flushPromises()
  const abrir = vista.findAll('.filtros button').find(boton => boton.text() === 'Exportar Excel')!
  await vista.get('.filtros select').setValue('INTENDENCIA')
  await vista.get('form.panel').trigger('submit')
  await flushPromises()
  await abrir.trigger('click')
  await flushPromises()

  const panel = vista.get('form.exportacion-panel')
  const formato = panel.get('[aria-label="Formato de exportación"]')
  const origen = panel.get('[aria-label="Origen a exportar"]')
  expect((formato.element as HTMLSelectElement).value).toBe('xlsx')
  expect((origen.element as HTMLSelectElement).value).toBe('')
  expect(exportarCancelaciones).not.toHaveBeenCalled()
  expect(panel.find('[aria-label="Buscar para exportar"]').exists()).toBe(false)
  const motivo = panel.get('select[aria-label="Motivo a exportar"]')
  expect(motivo.findAll('option').map(opcion => opcion.text())).toEqual(['Todos los motivos', 'PAGO'])
  expect(obtenerMotivosCancelaciones).toHaveBeenCalledExactlyOnceWith(expect.any(AbortSignal))

  vi.mocked(exportarCancelaciones).mockResolvedValue(new Blob(['csv']))
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cancelaciones')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  await origen.setValue('SUCIVE')
  await panel.get('[aria-label="Motivo a exportar"]').setValue('PAGO')
  await panel.get('[aria-label="Fecha desde a exportar"]').setValue('2026-11-01')
  await formato.setValue('csv')
  expect(panel.get('button[type="submit"]').text()).toBe('Descargar CSV')
  await panel.trigger('submit')
  await flushPromises()
  expect(exportarCancelaciones).toHaveBeenCalledExactlyOnceWith(
    { origen: 'SUCIVE', motivo: 'PAGO', desde: '2026-11-01', hasta: '' },
    'csv',
    expect.any(AbortSignal),
  )
  expect(click.mock.instances[0]?.download).toBe('cancelaciones.csv')
  expect(vista.find('form.exportacion-panel').exists()).toBe(false)
  expect((vista.get('.filtros select').element as HTMLSelectElement).value).toBe('INTENDENCIA')
  expect(obtenerCancelaciones).toHaveBeenCalledTimes(2)
})

it('permite limpiar los filtros del panel, cancelar y volver a abrir con valores iniciales', async () => {
  vi.mocked(obtenerCancelaciones).mockResolvedValue({
    contenido: [], pagina: 0, totalPaginas: 0, totalElementos: 0,
  })
  useAuthStore().user = { id: 1, username: 'analista', roles: ['ANALISTA'] }
  const vista = mount(CancelacionesView)
  await flushPromises()
  const abrir = vista.findAll('.filtros button').find(boton => boton.text() === 'Exportar Excel')!
  await abrir.trigger('click')
  await flushPromises()
  const panel = vista.get('form.exportacion-panel')
  const formato = panel.get('[aria-label="Formato de exportación"]')
  await formato.setValue('csv')
  await panel.get('[aria-label="Motivo a exportar"]').setValue('PAGO')
  await panel.findAll('button').find(boton => boton.text() === 'Limpiar filtros')!.trigger('click')
  expect((panel.get('[aria-label="Motivo a exportar"]').element as HTMLSelectElement).value).toBe('')
  expect((formato.element as HTMLSelectElement).value).toBe('csv')

  await panel.findAll('button').find(boton => boton.text() === 'Cancelar')!.trigger('click')
  expect(vista.find('form.exportacion-panel').exists()).toBe(false)
  expect(exportarCancelaciones).not.toHaveBeenCalled()
  await abrir.trigger('click')
  expect(vista.get('form.exportacion-panel button[type="submit"]').text()).toBe('Descargar Excel')
})

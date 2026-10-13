import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../src/modules/autenticacion/stores/auth.store'
import PeriodosMoraTab from '../src/modules/configuracion/components/PeriodosMoraTab.vue'
import * as api from '../src/modules/configuracion/services/periodoMoraService'
import { obtenerTributos } from '../src/modules/configuracion/services/tributoService'
vi.mock('../src/modules/configuracion/services/periodoMoraService')
vi.mock('../src/modules/configuracion/services/tributoService')
const segmentos = ['Mora Temprana', 'Mora Inicial', 'Mora Tardia'].map((nombre, i) => ({
  id: i + 1,
  nombre,
  descripcion: null,
  orden: i + 1,
}))
const rangos: api.RangoMora[] = segmentos.map((s, i) => ({
  id: s.id,
  segmentoId: s.id,
  segmentoNombre: s.nombre,
  diasDesde: [0, 91, 366][i]!,
  diasHasta: [90, 365, null][i]!,
  activa: true,
  fechaCreacion: '2026-10-13T10:00:00',
  tributoId: null,
}))
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(obtenerTributos).mockResolvedValue([{ id: 101, codigo: '101', descripcion: 'Rural' }])
  setActivePinia(createPinia())
  useAuthStore().user = { id: 1, username: 'admin', roles: ['ADMINISTRADOR', 'NOTIFICADOR'] }
  vi.mocked(api.obtenerPeriodos).mockResolvedValue({ segmentos, rangos })
  vi.mocked(api.guardarPeriodos).mockImplementation(async (nuevos, tributoId) =>
    nuevos.map((r, i) => ({ ...rangos[i]!, ...r, tributoId: tributoId ?? null })),
  )
})
describe('periodos de mora', () => {
  it('muestra los tres segmentos y sus rangos actuales', async () => {
    const w = mount(PeriodosMoraTab)
    await flushPromises()
    expect(w.findAll('tbody tr')).toHaveLength(3)
    expect(w.get('tbody').text()).toContain('Mora Temprana')
    expect(w.get('tbody').text()).toContain('90')
    expect(w.get('tbody').text()).toContain('365')
    w.unmount()
  })
  it('guarda los limites juntos y calcula los inicios sin huecos', async () => {
    const w = mount(PeriodosMoraTab)
    await flushPromises()
    await w.get('#mora-tributo').setValue('101')
    await flushPromises()
    await w.get('.editar').trigger('click')
    await w.get('#mora-hasta-1').setValue(120)
    await w.get('#mora-hasta-2').setValue(450)
    expect(w.get<HTMLSelectElement>('#mora-tributo').element.value).toBe('101')
    expect(api.obtenerPeriodos).toHaveBeenLastCalledWith(expect.any(AbortSignal), 101)
    expect(w.findAll('.desde')[1]!.text()).toContain('121')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(api.guardarPeriodos).toHaveBeenCalledWith(
      [
        { segmentoId: 1, diasDesde: 0, diasHasta: 120 },
        { segmentoId: 2, diasDesde: 121, diasHasta: 450 },
        { segmentoId: 3, diasDesde: 451, diasHasta: null },
      ],
      101,
    )
    expect(w.find('form').exists()).toBe(false)
    expect(w.get('tbody').text()).toContain('451')
    w.unmount()
  })
  it.each(['ANALISTA', 'NOTIFICADOR'])('el rol %s solo consulta', async (rol) => {
    useAuthStore().user = { id: 1, username: 'operador', roles: [rol] }
    const w = mount(PeriodosMoraTab)
    await flushPromises()
    expect(w.findAll('tbody tr')).toHaveLength(3)
    await w.get('#mora-tributo').setValue('101')
    await flushPromises()
    expect(w.find('.editar').exists()).toBe(false)
    w.unmount()
  })
  it('rechaza limites invertidos', async () => {
    const w = mount(PeriodosMoraTab)
    await flushPromises()
    await w.get('#mora-tributo').setValue('101')
    await flushPromises()
    await w.get('.editar').trigger('click')
    await w.get('#mora-hasta-1').setValue(400)
    await w.get('form').trigger('submit')
    expect(api.guardarPeriodos).not.toHaveBeenCalled()
    expect(w.find('[role="alert"]').exists()).toBe(true)
    w.unmount()
  })
  it('cancelar conserva los rangos anteriores', async () => {
    const w = mount(PeriodosMoraTab)
    await flushPromises()
    await w.get('#mora-tributo').setValue('101')
    await flushPromises()
    await w.get('.editar').trigger('click')
    await w.get('#mora-hasta-1').setValue(120)
    await w.get('form button[type="button"]').trigger('click')
    expect(api.guardarPeriodos).not.toHaveBeenCalled()
    expect(w.get('tbody').text()).not.toContain('120')
    w.unmount()
  })
  it('un fallo conserva el formulario y los rangos vigentes', async () => {
    vi.mocked(api.guardarPeriodos).mockRejectedValue(new Error('Sin conexion'))
    const w = mount(PeriodosMoraTab)
    await flushPromises()
    await w.get('#mora-tributo').setValue('101')
    await flushPromises()
    await w.get('.editar').trigger('click')
    await w.get('#mora-hasta-1').setValue(120)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.get<HTMLInputElement>('#mora-hasta-1').element.value).toBe('120')
    expect(w.get('tbody').text()).not.toContain('120')
    expect(w.text()).toContain('No se pudieron guardar')
    w.unmount()
  })
  it('permite reintentar la carga', async () => {
    vi.mocked(api.obtenerPeriodos).mockRejectedValueOnce(new Error('Sin conexion'))
    const w = mount(PeriodosMoraTab)
    await flushPromises()
    expect(w.text()).toContain('No se pudieron cargar')
    await w.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(w.findAll('tbody tr')).toHaveLength(3)
    w.unmount()
  })
  it('los rangos base se muestran como referencia sin editar', async () => {
    const w = mount(PeriodosMoraTab)
    await flushPromises()
    expect(w.find('.editar').exists()).toBe(false)
    expect(api.obtenerPeriodos).toHaveBeenCalledWith(expect.any(AbortSignal), undefined)
    await w.get('#mora-tributo').setValue('101')
    await flushPromises()
    expect(api.obtenerPeriodos).toHaveBeenLastCalledWith(expect.any(AbortSignal), 101)
    expect(w.find('.editar').exists()).toBe(true)
    expect(w.text()).toContain('usa los rangos base')
    w.unmount()
  })
  it('restaura la base del tributo seleccionado', async () => {
    const propias = rangos.map((r) => ({ ...r, tributoId: 101 }))
    vi.mocked(api.obtenerPeriodos).mockResolvedValue({ segmentos, rangos: propias })
    vi.mocked(api.restaurarPeriodosBase).mockResolvedValue(undefined)
    const w = mount(PeriodosMoraTab)
    await flushPromises()
    await w.get('#mora-tributo').setValue('101')
    await flushPromises()
    vi.mocked(api.obtenerPeriodos).mockResolvedValue({ segmentos, rangos })
    await w.get('.restaurar').trigger('click')
    await flushPromises()
    expect(api.restaurarPeriodosBase).toHaveBeenCalledWith(101)
    expect(w.find('.restaurar').exists()).toBe(false)
    expect(w.text()).toContain('usa los rangos base')
    w.unmount()
  })
  it('al cambiar de tributo cierra el formulario anterior', async () => {
    const w = mount(PeriodosMoraTab)
    await flushPromises()
    await w.get('#mora-tributo').setValue('101')
    await flushPromises()
    await w.get('.editar').trigger('click')
    await w.get('#mora-hasta-1').setValue(120)
    await w.get('#mora-tributo').setValue('')
    await flushPromises()
    expect(w.find('form').exists()).toBe(false)
    expect(api.guardarPeriodos).not.toHaveBeenCalled()
    w.unmount()
  })
})

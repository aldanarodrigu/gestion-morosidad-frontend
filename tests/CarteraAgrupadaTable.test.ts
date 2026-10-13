import { describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import CarteraAgrupadaTable from '../src/modules/cartera/components/CarteraAgrupadaTable.vue'
import type { CarteraGrupo } from '../src/modules/cartera/types/cartera'
import { grupo } from './carteraFixtures'
import { obtenerCarteraAgrupada } from '../src/modules/cartera/services/carteraService'
import { http } from '../src/shared/api/http'
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../src/shared/api/http', () => ({ http: { get: vi.fn() } }))
async function grupos(): Promise<CarteraGrupo[]> {
  vi.mocked(http.get).mockResolvedValue({
    data: {
      contenido: [grupo(), grupo('90000002')],
      pagina: 0,
      tamanio: 20,
      totalElementos: 2,
      totalPaginas: 1,
    },
  })
  return (await obtenerCarteraAgrupada()).contenido
}
describe('tabla agrupada', () => {
  it('muestra documentos distintos por separado y despliega solo las deudas del grupo elegido', async () => {
    const w = mount(CarteraAgrupadaTable, {
      props: { grupos: await grupos() },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    expect(w.findAll('tr.grupo')).toHaveLength(2)
    expect(w.text()).toContain('90000001')
    expect(w.text()).toContain('90000002')
    expect(w.findAllComponents(RouterLinkStub)).toHaveLength(0)
    const boton = w.findAll('button.ver-deudas')[0]!
    await boton.trigger('click')
    expect(boton.attributes('aria-expanded')).toBe('true')
    expect(w.findAll('tr.detalle-grupo')).toHaveLength(1)
    expect(w.findAllComponents(RouterLinkStub).map((a) => a.props('to'))).toEqual([
      { path: '/contribuyentes/110', query: { deuda: '10' } },
      { path: '/contribuyentes/120', query: { deuda: '20' } },
    ])
    await boton.trigger('click')
    expect(w.findAll('tr.detalle-grupo')).toHaveLength(0)
    w.unmount()
  })
  it('no fabrica un documento y reinicia los desplegables al cambiar de página', async () => {
    const datos = await grupos()
    datos[0] = { ...datos[0]!, documento: null, clave: 'ID:110' }
    const w = mount(CarteraAgrupadaTable, {
      props: { grupos: datos },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    expect(w.text()).toContain('Sin documento')
    await w.get('button.ver-deudas').trigger('click')
    await w.setProps({ grupos: [] })
    expect(w.text()).toContain('No hay registros')
    await w.setProps({ grupos: datos })
    expect(w.findAll('tr.detalle-grupo')).toHaveLength(0)
    w.unmount()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from '../src/shared/api/http'
import {
  obtenerCartera,
  obtenerCarteraAgrupada,
  obtenerTiposPadron,
} from '../src/modules/cartera/services/carteraService'
import { deuda, grupo, pagina } from './carteraFixtures'
vi.mock('../src/shared/api/http', () => ({ http: { get: vi.fn() } }))
beforeEach(() => vi.resetAllMocks())
describe('consulta de cartera', () => {
  it('muestra SUCIVE desde el origen real y filtra ambas vistas en el servidor', async () => {
    const sucive = deuda()
    sucive.padron.origen = 'SUCIVE'
    vi.mocked(http.get).mockResolvedValueOnce({ data: pagina([sucive]) })
    const individual = await obtenerCartera(0, 20, { origen: 'sucive' })
    expect(individual.contenido[0]?.origen).toBe('SUCIVE')
    expect(http.get).toHaveBeenLastCalledWith('/deudas', expect.objectContaining({
      params: expect.objectContaining({ origen: 'SUCIVE' }),
    }))
    vi.mocked(http.get).mockResolvedValueOnce({ data: pagina([{ ...grupo(), deudas: [sucive] }]) })
    const agrupada = await obtenerCarteraAgrupada(0, 20, { origen: 'sucive' })
    expect(agrupada.contenido[0]?.deudas[0]?.origen).toBe('SUCIVE')
    expect(http.get).toHaveBeenLastCalledWith('/deudas/agrupadas', expect.objectContaining({
      params: expect.objectContaining({ origen: 'SUCIVE' }),
    }))
  })

  it.each([['intendencia', 'INTENDENCIA'], ['', undefined]] as const)(
    'envía el origen %s sin filtrar la página local', async (origen, codigo) => {
      vi.mocked(http.get).mockResolvedValue({ data: pagina([deuda()]) })
      await obtenerCartera(0, 20, { origen })
      expect(http.get).toHaveBeenLastCalledWith('/deudas', expect.objectContaining({
        params: expect.objectContaining({ origen: codigo }),
      }))
    },
  )
  it('carga los PadTipo desde el catálogo completo del servidor', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: ['CIR', 'CIU'] })
    expect(await obtenerTiposPadron()).toEqual(['CIR', 'CIU'])
    expect(http.get).toHaveBeenCalledWith('/deudas/tipos-padron', { signal: undefined })
  })
  it('consulta agrupada en el servidor con filtros y orden, conservando todas las deudas e IDs', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: { ...pagina([grupo()]), totalElementos: 57, totalPaginas: 3 },
    })
    const ctrl = new AbortController()
    const r = await obtenerCarteraAgrupada(
      1,
      20,
      { busqueda: ' 90000001 ', segmento: 'inicial', tipoPadron: 'CIU', ordenarPor: 'importe' },
      ctrl.signal,
    )
    expect(http.get).toHaveBeenCalledWith('/deudas/agrupadas', {
      signal: ctrl.signal,
      params: {
        page: 1,
        size: 20,
        sort: 'importe,desc',
        contribuyente: '90000001',
        segmento: 2,
        tipoPadron: 'CIU',
        origen: undefined,
        conContacto: undefined,
      },
    })
    expect(r.totalElementos).toBe(57)
    expect(r.contenido[0]?.importeTotal).toBe(200)
    expect(r.contenido[0]?.deudas.map((d) => [d.id, d.contribuyenteId])).toEqual([
      [10, 110],
      [20, 120],
    ])
    expect(r.contenido[0]?.deudas[0]?.accionesSugeridas).toEqual(['Llamada'])
    expect(r.contenido[0]?.deudas[0]?.gestiones).toBe(2)
    expect(r.contenido[0]?.deudas[0]?.origen).toBe('Intendencia')
  })
  it('el modo individual conserva el endpoint y el detalle de cada deuda', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: pagina([deuda()]) })
    const r = await obtenerCartera(0, 20, { tipoPadron: 'CIR' })
    expect(http.get).toHaveBeenCalledWith(
      '/deudas',
      expect.objectContaining({
        params: expect.objectContaining({ page: 0, sort: 'deudaDesde,asc', tipoPadron: 'CIR' }),
      }),
    )
    expect(r.contenido[0]).toMatchObject({
      id: 10,
      documento: '90000001',
      deuda: 100,
      tributo: 'Contribución',
      origen: 'Intendencia',
    })
  })
  it.each([
    ['con', true],
    ['sin', false],
    ['', undefined],
  ] as const)('envía el filtro %s al backend en ambos modos', async (contacto, conContacto) => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: pagina([deuda()]) })
    await obtenerCartera(0, 20, { contacto })
    expect(http.get).toHaveBeenLastCalledWith(
      '/deudas',
      expect.objectContaining({
        params: expect.objectContaining({ conContacto }),
      }),
    )
    vi.mocked(http.get).mockResolvedValueOnce({ data: pagina([grupo()]) })
    await obtenerCarteraAgrupada(0, 20, { contacto })
    expect(http.get).toHaveBeenLastCalledWith(
      '/deudas/agrupadas',
      expect.objectContaining({
        params: expect.objectContaining({ conContacto }),
      }),
    )
  })
  it('muestra disponibilidad real de contacto devuelta por el backend', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: pagina([
        { ...deuda(10), conContacto: true },
        { ...deuda(20), conContacto: false },
      ]),
    })
    const r = await obtenerCartera()
    expect(r.contenido.map((d) => d.contacto)).toEqual(['Con datos', 'Sin datos'])
  })
})

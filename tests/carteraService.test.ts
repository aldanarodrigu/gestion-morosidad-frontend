import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from '../src/shared/api/http'
import {
  obtenerCartera,
  obtenerCarteraAgrupada,
} from '../src/modules/cartera/services/carteraService'
import { deuda, grupo, pagina } from './carteraFixtures'
vi.mock('../src/shared/api/http', () => ({ http: { get: vi.fn() } }))
beforeEach(() => vi.resetAllMocks())
describe('consulta de cartera', () => {
  it('consulta agrupada en el servidor con filtros y orden, conservando todas las deudas e IDs', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: { ...pagina([grupo()]), totalElementos: 57, totalPaginas: 3 },
    })
    const ctrl = new AbortController()
    const r = await obtenerCarteraAgrupada(
      1,
      20,
      { busqueda: ' 90000001 ', segmento: 'inicial', tributo: '201', ordenarPor: 'importe' },
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
        tributo: '201',
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
  })
  it('el modo individual conserva el endpoint y el detalle de cada deuda', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: pagina([deuda()]) })
    const r = await obtenerCartera()
    expect(http.get).toHaveBeenCalledWith(
      '/deudas',
      expect.objectContaining({
        params: expect.objectContaining({ page: 0, sort: 'deudaDesde,asc' }),
      }),
    )
    expect(r.contenido[0]).toMatchObject({
      id: 10,
      documento: '90000001',
      deuda: 100,
      tributo: 'Contribución',
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

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from '../src/shared/api/http'
import {
  guardarPeriodos,
  obtenerPeriodos,
  obtenerTiposPadron,
  restaurarPeriodosBase,
} from '../src/modules/configuracion/services/periodoMoraService'

vi.mock('../src/shared/api/http', () => ({
  http: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
beforeEach(() => vi.resetAllMocks())

describe('períodos por PadTipo', () => {
  it('consulta los períodos del PadTipo seleccionado', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: [] })
    await obtenerPeriodos(undefined, 'CIU')
    expect(http.get).toHaveBeenCalledWith('/configuraciones-segmento', {
      signal: undefined,
      params: { tipoPadron: 'CIU' },
    })
  })

  it('guarda y restaura la configuración completa del PadTipo', async () => {
    vi.mocked(http.put).mockResolvedValue({ data: [] })
    vi.mocked(http.delete).mockResolvedValue({})
    const rangos = [{ segmentoId: 1, diasDesde: 0, diasHasta: null }]
    await guardarPeriodos(rangos, 'CIR')
    expect(http.put).toHaveBeenCalledWith('/configuraciones-segmento', {
      rangos,
      tipoPadron: 'CIR',
    })
    await restaurarPeriodosBase('CIR')
    expect(http.delete).toHaveBeenCalledWith('/configuraciones-segmento/tipo-padron/CIR')
  })

  it('carga los tipos configurables sin depender de la cartera activa', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: ['CIR', 'CIU'] })
    expect(await obtenerTiposPadron()).toEqual(['CIR', 'CIU'])
    expect(http.get).toHaveBeenCalledWith('/configuraciones-segmento/tipos-padron', {
      signal: undefined,
    })
  })
})

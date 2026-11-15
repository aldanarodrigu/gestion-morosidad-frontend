import { beforeEach, expect, it, vi } from 'vitest'
import { http } from '../src/shared/api/http'
import { obtenerConvenios } from '../src/modules/convenios/services/convenioService'
vi.mock('../src/shared/api/http', () => ({ http: { get: vi.fn() } }))
beforeEach(() => vi.resetAllMocks())
it('envía filtros, página y señal al backend', async () => {
 vi.mocked(http.get).mockResolvedValue({data: {data: []}})
 const controller = new AbortController()
 await obtenerConvenios({origen:'SUCIVE',cm:' 900 ',documento:' 123 ',nombre:' Ana ',desde:'2026-01-01',hasta:'2026-02-01'},2,controller.signal)
 expect(http.get).toHaveBeenCalledWith('/convenios',{params:{origen:'SUCIVE',pagina:2,tamanio:20,cm:'900',documento:'123',nombre:'Ana',desde:'2026-01-01',hasta:'2026-02-01'},signal:controller.signal})
})
it('omite filtros vacíos y conserva la respuesta paginada', async () => {
 const resultado = {data:[],meta:{total:0}};vi.mocked(http.get).mockResolvedValue({data:resultado})
 expect(await obtenerConvenios({origen:'INTENDENCIA',cm:'',documento:'',nombre:'',desde:'',hasta:''})).toBe(resultado)
 expect(http.get).toHaveBeenCalledWith('/convenios',{params:{origen:'INTENDENCIA',pagina:1,tamanio:20,cm:undefined,documento:undefined,nombre:undefined,desde:undefined,hasta:undefined},signal:undefined})
})

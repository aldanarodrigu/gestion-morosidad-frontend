import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from '../src/shared/api/http'
import { obtenerReporte, exportarReporte } from '../src/modules/reportes/services/reporteService'
vi.mock('../src/shared/api/http',()=>({http:{get:vi.fn()}}))
beforeEach(()=>vi.resetAllMocks())
describe('consultas del reporte',()=>{
 it('envía los filtros opcionales sin página ni tamaño',async()=>{
  vi.mocked(http.get).mockResolvedValue({data:{}})
  await obtenerReporte({origen:'SUCIVE',tipoPadron:'CIU',segmento:87})
  expect(http.get).toHaveBeenCalledWith('/reportes/cartera',{params:{origen:'SUCIVE',tipoPadron:'CIU',segmento:87},signal:undefined})
 })
 it('sin filtros consulta toda la cartera y descarga blob para Excel',async()=>{
  vi.mocked(http.get).mockResolvedValue({data:new Blob()})
  await exportarReporte({origen:'',tipoPadron:'',segmento:''})
  expect(http.get).toHaveBeenCalledWith('/reportes/cartera/exportar',{params:{origen:undefined,tipoPadron:undefined,segmento:undefined},responseType:'blob',signal:undefined})
 })
})

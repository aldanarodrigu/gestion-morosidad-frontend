import { http } from '@/shared/api/http'
import type { CarteraItem, DeudaApi, PaginaResponse } from '../types/cartera'

export interface FiltrosCarteraApi {
  busqueda?: string
  segmento?: string
  tributo?: string
  ordenarPor?: 'antiguedad' | 'importe' | 'nombre'
}

const idsSegmentos: Record<string, number> = {
  temprana: 1,
  inicial: 2,
  tardia: 3,
}

const ordenesApi = {
  antiguedad: 'deudaDesde,asc',
  importe: 'importe,desc',
  nombre: 'padron.contribuyente.nombre,asc',
} as const

export async function obtenerCartera(
  pagina = 0,
  tamanio = 20,
  filtros: FiltrosCarteraApi = {},
): Promise<PaginaResponse<CarteraItem>> {
  const { data } = await http.get<PaginaResponse<DeudaApi>>('/deudas', {
    params: {
      page: pagina,
      size: tamanio,
      sort: ordenesApi[filtros.ordenarPor ?? 'antiguedad'],
      contribuyente: filtros.busqueda?.trim() || undefined,
      segmento: filtros.segmento ? idsSegmentos[filtros.segmento] : undefined,
      tributo: filtros.tributo || undefined,
    },
  })

  return {
    ...data,
    contenido: data.contenido.map((deuda) => ({
      id: deuda.id,
      cm: deuda.padron.cm,
      contribuyente: deuda.contribuyente.nombre,
      documento: deuda.contribuyente.documento,
      tributo: deuda.tributos.map((tributo) => tributo.descripcion || tributo.codigo).join(', '),
      codigosTributo: deuda.tributos.map((tributo) => tributo.codigo),
      deuda: Number(deuda.importe),
      diasVencido: deuda.diasAtraso ?? 0,
      segmento: deuda.segmentoMora?.nombre ?? 'Sin segmento',
      convenio: deuda.convenio,
      contacto: '—',
      accionesSugeridas: deuda.accionesSugeridas?.map((accion) => accion.nombre) ?? [],
      gestiones: null,
    })),
  }
}

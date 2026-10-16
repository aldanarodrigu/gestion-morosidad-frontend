import { http } from '@/shared/api/http'
import type {
  CarteraItem,
  DeudaApi,
  PaginaResponse,
  CarteraGrupo,
  DeudasAgrupadasApi,
} from '../types/cartera'

export interface FiltrosCarteraApi {
  busqueda?: string
  segmento?: string
  tipoPadron?: string
  origen?: string
  contacto?: string
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
  signal?: AbortSignal,
): Promise<PaginaResponse<CarteraItem>> {
  const { data } = await http.get<PaginaResponse<DeudaApi>>('/deudas', {
    signal,
    params: parametros(pagina, tamanio, filtros),
  })

  return {
    ...data,
    contenido: data.contenido.map(mapearDeuda),
  }
}

function parametros(pagina: number, tamanio: number, filtros: FiltrosCarteraApi) {
  return {
    page: pagina,
    size: tamanio,
    sort: ordenesApi[filtros.ordenarPor ?? 'antiguedad'],
    contribuyente: filtros.busqueda?.trim() || undefined,
    segmento: filtros.segmento ? idsSegmentos[filtros.segmento] : undefined,
    tipoPadron: filtros.tipoPadron || undefined,
    origen: filtros.origen === 'sucive' ? 'SUCIVE' : filtros.origen === 'intendencia' ? 'INTENDENCIA' : undefined,
    conContacto: filtros.contacto === 'con' ? true : filtros.contacto === 'sin' ? false : undefined,
  }
}

export async function obtenerTiposPadron(signal?: AbortSignal): Promise<string[]> {
  const { data } = await http.get<string[]>('/deudas/tipos-padron', { signal })
  return data
}

function mapearDeuda(deuda: DeudaApi): CarteraItem {
  return {
    id: deuda.id,
    contribuyenteId: deuda.contribuyenteId,
    cm: deuda.padron.cm,
    numeroPadron: deuda.padron.numeroPadron,
    tipoPadron: deuda.padron.tipoPadron ?? null,
    origen: deuda.padron.origen === 'SUCIVE' ? 'SUCIVE' : 'Intendencia',
    contribuyente: deuda.contribuyente.nombre,
    documento: deuda.contribuyente.documento,
    tributo: deuda.tributos.map((tributo) => tributo.descripcion || tributo.codigo).join(', '),
    codigosTributo: deuda.tributos.map((tributo) => tributo.codigo),
    deuda: Number(deuda.importe),
    diasVencido: deuda.diasAtraso ?? 0,
    segmento: deuda.segmentoMora?.nombre ?? 'Sin segmento',
    convenio: deuda.convenio,
    contacto: deuda.conContacto ? 'Con datos' : 'Sin datos',
    accionesSugeridas: deuda.accionesSugeridas?.map((accion) => accion.nombre) ?? [],
    gestiones: deuda.cantidadGestiones,
  }
}

export async function obtenerCarteraAgrupada(
  pagina = 0,
  tamanio = 20,
  filtros: FiltrosCarteraApi = {},
  signal?: AbortSignal,
): Promise<PaginaResponse<CarteraGrupo>> {
  const { data } = await http.get<PaginaResponse<DeudasAgrupadasApi>>('/deudas/agrupadas', {
    signal,
    params: parametros(pagina, tamanio, filtros),
  })
  return {
    ...data,
    contenido: data.contenido.map((grupo) => ({
      ...grupo,
      importeTotal: Number(grupo.importeTotal),
      deudas: grupo.deudas.map(mapearDeuda),
    })),
  }
}
